import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import http from "node:http";
import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { InMemoryTokenAndOtpStore } from "../src/config/redis.js";
import { InMemoryDataStore } from "../src/repositories/inMemoryStore.js";
import { createApp } from "../src/app.js";
import { TranslationClient } from "../src/services/translationClient.js";
import { signalingHub } from "../src/ws/signaling.js";
import { fcmService } from "../src/services/fcmService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PY_PORT = 18099;
const PY_V2S_TCP = 19091;
const PY_S2V_TCP = 19092;

let pyProc: ChildProcess | null = null;
let server: http.Server;
let baseUrl: string;
let wsBaseUrl: string;
let redisStore: InMemoryTokenAndOtpStore;
let dataStore: InMemoryDataStore;

async function waitForPythonHealth(url: string, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("Python translation microservice did not become healthy in time");
}

describe("VAKHYA Backend End-to-End API & Signalling Tests", () => {
  before(async () => {
    const translationDir = path.resolve(__dirname, "../../services/translation");
    pyProc = spawn("/usr/bin/python3", ["-m", "app.server"], {
      cwd: translationDir,
      env: {
        ...process.env,
        PYTHONPATH: translationDir,
        TRANSLATION_HOST: "127.0.0.1",
        TRANSLATION_HTTP_PORT: String(PY_PORT),
        V2S_TCP_PORT: String(PY_V2S_TCP),
        S2V_TCP_PORT: String(PY_S2V_TCP),
      },
      stdio: "inherit",
    });

    await waitForPythonHealth(`http://127.0.0.1:${PY_PORT}`);

    redisStore = new InMemoryTokenAndOtpStore();
    dataStore = new InMemoryDataStore();
    const txClient = new TranslationClient(`http://127.0.0.1:${PY_PORT}`);
    const app = createApp(dataStore, redisStore, txClient);
    server = http.createServer(app);
    signalingHub.attach(server, dataStore, redisStore);

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;
    wsBaseUrl = `ws://127.0.0.1:${addr.port}/ws`;
  });

  after(async () => {
    await redisStore.disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (pyProc) {
      pyProc.kill("SIGTERM");
    }
  });

  it("exposes Swagger OpenAPI spec at /api-docs.json and /api-docs", async () => {
    const specRes = await fetch(`${baseUrl}/api-docs.json`);
    assert.equal(specRes.status, 200);
    const spec = await specRes.json();
    assert.equal(spec.openapi, "3.0.3");
    assert.ok(spec.paths["/auth/register"]);
    assert.ok(spec.paths["/calls"]);

    const uiRes = await fetch(`${baseUrl}/api-docs/`);
    assert.equal(uiRes.status, 200);
    const html = await uiRes.text();
    assert.ok(html.includes("swagger-ui"));
  });

  it("validates inputs with express-validator and runs full auth, JWT blacklist & OTP recovery flow", async () => {
    // 1. Invalid registration rejected with 400
    const badReg = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "123", firstName: "", phone: "12" }),
    });
    assert.equal(badReg.status, 400);
    const badBody = await badReg.json();
    assert.equal(badBody.error, "Validation failed");
    assert.ok(badBody.details.length >= 3);

    // 2. Valid registration for Deaf user
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "aarav@vakhya.app",
        password: "Password123!",
        firstName: "Aarav",
        lastName: "Patel",
        phone: "+919988776655",
        userType: "deaf",
      }),
    });
    assert.equal(regRes.status, 201);
    const regData = await regRes.json();
    assert.ok(regData.accessToken);
    assert.ok(regData.refreshToken);
    assert.equal(regData.user.userType, "deaf");

    // 3. Protected profile access works with JWT
    const profRes = await fetch(`${baseUrl}/api/v1/profile`, {
      headers: { Authorization: `Bearer ${regData.accessToken}` },
    });
    assert.equal(profRes.status, 200);

    // 4. Logout blacklists JWT in Redis store
    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${regData.accessToken}`,
      },
      body: JSON.stringify({ refreshToken: regData.refreshToken }),
    });
    assert.equal(logoutRes.status, 200);

    // 5. Blacklisted access token & refresh token are rejected
    const blockedRes = await fetch(`${baseUrl}/api/v1/profile`, {
      headers: { Authorization: `Bearer ${regData.accessToken}` },
    });
    assert.equal(blockedRes.status, 401);

    const blockedRefresh = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: regData.refreshToken }),
    });
    assert.equal(blockedRefresh.status, 401);

    // 6. OTP-based password recovery flow
    const forgotRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "aarav@vakhya.app" }),
    });
    assert.equal(forgotRes.status, 200);
    const { devOtp } = await forgotRes.json();
    assert.match(devOtp, /^\d{6}$/);

    const verifyRes = await fetch(`${baseUrl}/api/v1/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "aarav@vakhya.app", otp: devOtp }),
    });
    assert.equal(verifyRes.status, 200);

    const resetRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "aarav@vakhya.app",
        otp: devOtp,
        newPassword: "NewPassword456!",
      }),
    });
    assert.equal(resetRes.status, 200);

    const loginNew = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "aarav@vakhya.app", password: "NewPassword456!" }),
    });
    assert.equal(loginNew.status, 200);
  });

  it("manages contacts CRUD, call initiation with FCM/WS alerts, filtering, search, and deletion", async () => {
    // Login Aarav
    const aaravLogin = await (
      await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "aarav@vakhya.app", password: "NewPassword456!" }),
      })
    ).json();

    // Register Hearing user Maya + FCM device token
    const mayaReg = await (
      await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "maya@vakhya.app",
          password: "Password123!",
          firstName: "Maya",
          lastName: "Sharma",
          phone: "+919876501234",
          userType: "hearing",
        }),
      })
    ).json();

    const tokenRegRes = await fetch(`${baseUrl}/api/v1/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mayaReg.accessToken}`,
      },
      body: JSON.stringify({ deviceId: "android-galaxy-a04s", fcmToken: "fcm-maya-token-001" }),
    });
    assert.equal(tokenRegRes.status, 200);

    // Contact CRUD for Aarav
    const createContactRes = await fetch(`${baseUrl}/api/v1/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aaravLogin.accessToken}`,
      },
      body: JSON.stringify({ firstName: "Maya", lastName: "Sharma", phone: "+919876501234" }),
    });
    assert.equal(createContactRes.status, 201);
    const { contact } = await createContactRes.json();
    assert.equal(contact.userId, mayaReg.user.id);

    const searchContactRes = await fetch(`${baseUrl}/api/v1/contacts?search=Maya`, {
      headers: { Authorization: `Bearer ${aaravLogin.accessToken}` },
    });
    const searchContacts = await searchContactRes.json();
    assert.equal(searchContacts.contacts.length, 1);

    // Connect Maya via WebSocket signalling & initiate call from Aarav
    const mayaWs = new WebSocket(`${wsBaseUrl}?token=${mayaReg.accessToken}`);
    const incomingPromise = new Promise<any>((resolve) => {
      mayaWs.on("message", (buf) => {
        const msg = JSON.parse(buf.toString());
        if (msg.type === "incoming_call") resolve(msg);
      });
    });
    await new Promise<void>((resolve) => mayaWs.once("open", () => resolve()));

    const initCallRes = await fetch(`${baseUrl}/api/v1/calls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aaravLogin.accessToken}`,
      },
      body: JSON.stringify({ phone: "+919876501234", contactId: contact.id, translationUsed: true }),
    });
    assert.equal(initCallRes.status, 201);
    const { call } = await initCallRes.json();
    assert.equal(call.type, "outgoing");

    // Verify Maya received BOTH WebSocket incoming_call AND FCM data-only push
    const wsIncoming = await incomingPromise;
    assert.equal(wsIncoming.callerName, "Aarav Patel");
    assert.ok(
      fcmService.dispatchedLog.some(
        (log) =>
          log.tokens.includes("fcm-maya-token-001") && log.data.type === "INCOMING_CALL"
      )
    );
    mayaWs.close();

    // Update call status & filter history
    await fetch(`${baseUrl}/api/v1/calls/${call.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aaravLogin.accessToken}`,
      },
      body: JSON.stringify({ status: "ended", duration: 95 }),
    });

    const outgoingList = await (
      await fetch(`${baseUrl}/api/v1/calls?type=outgoing&search=Maya`, {
        headers: { Authorization: `Bearer ${aaravLogin.accessToken}` },
      })
    ).json();
    assert.equal(outgoingList.calls.length, 1);
    assert.equal(outgoingList.calls[0].duration, 95);

    const missedList = await (
      await fetch(`${baseUrl}/api/v1/calls?type=missed`, {
        headers: { Authorization: `Bearer ${aaravLogin.accessToken}` },
      })
    ).json();
    assert.equal(missedList.calls.length, 0);

    // Delete single call record
    const delRes = await fetch(`${baseUrl}/api/v1/calls/${call.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${aaravLogin.accessToken}` },
    });
    assert.equal(delRes.status, 200);
  });

  it("bridges Voice-to-Sign and Sign-to-Voice translation interfaces to Python microservices", async () => {
    const loginData = await (
      await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "aarav@vakhya.app", password: "NewPassword456!" }),
      })
    ).json();

    const vocabRes = await fetch(`${baseUrl}/api/v1/translation/vocabulary`, {
      headers: { Authorization: `Bearer ${loginData.accessToken}` },
    });
    assert.equal(vocabRes.status, 200);
    const vocabData = await vocabRes.json();
    assert.ok(vocabData.vocabulary.length >= 25);

    const v2sRes = await fetch(`${baseUrl}/api/v1/translation/voice-to-sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginData.accessToken}`,
      },
      body: JSON.stringify({ text: "Hello doctor please help", sign_language: "ASL", fps: 8 }),
    });
    assert.equal(v2sRes.status, 200);
    const v2s = await v2sRes.json();
    assert.deepEqual(v2s.glosses, ["HELLO", "DOCTOR", "PLEASE", "HELP"]);
    assert.ok(v2s.pose_frames.length > 0);
    assert.ok(v2s.video.video_mp4_base64);

    const s2vRes = await fetch(`${baseUrl}/api/v1/translation/sign-to-voice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginData.accessToken}`,
      },
      body: JSON.stringify({
        pose_sequence: [
          { t: 0.0, right_wrist: [0.68, 0.34, 0.05], left_wrist: [0.35, 0.72, 0.0], right_open: 1.0, left_open: 0.4, elbow_angle: 45 },
          { t: 0.5, right_wrist: [0.76, 0.24, 0.12], left_wrist: [0.35, 0.72, 0.0], right_open: 1.0, left_open: 0.4, elbow_angle: 75 },
          { t: 1.0, right_wrist: [0.84, 0.28, 0.15], left_wrist: [0.35, 0.72, 0.0], right_open: 1.0, left_open: 0.4, elbow_angle: 90 },
        ],
      }),
    });
    assert.equal(s2vRes.status, 200);
    const s2v = await s2vRes.json();
    assert.equal(s2v.recognized_gloss, "HELLO");
    assert.equal(s2v.text, "Hello");
    assert.ok(s2v.audio.audio_wav_base64);
  });
});

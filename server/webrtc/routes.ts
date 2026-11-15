/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { Router, Request, Response } from "express";
import { ProviderFactory } from "./providers/ProviderFactory";
import { roomManager } from "./roomManager";
import { webRTCConfig } from "./config";

const router = Router();

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * GET /ice-servers
 * Returns STUN + configured TURN relay servers (static credentials or time-limited Coturn HMAC).
 */
router.get("/ice-servers", (_req: Request, res: Response) => {
  const iceServers: RTCIceServer[] = [...DEFAULT_STUN_SERVERS];
  const rawUrls = process.env.TURN_URLS || process.env.TURN_URL || "";
  const turnUrls = rawUrls
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  if (turnUrls.length > 0) {
    const sharedSecret = process.env.TURN_SHARED_SECRET?.trim();
    const turnUser = process.env.TURN_USERNAME?.trim();
    const turnCred = process.env.TURN_CREDENTIAL?.trim();
    if (sharedSecret) {
      const ttl = 3600;
      const unixTs = Math.floor(Date.now() / 1000) + ttl;
      const username = `${unixTs}:vakhya`;
      const credential = crypto.createHmac("sha1", sharedSecret).update(username).digest("base64");
      iceServers.push({ urls: turnUrls, username, credential });
    } else if (turnUser && turnCred) {
      iceServers.push({
        urls: turnUrls,
        username: turnUser,
        credential: turnCred,
      });
    } else {
      iceServers.push({ urls: turnUrls });
    }
  }

  return res.json({
    iceServers,
    turnConfigured: turnUrls.length > 0,
  });
});

/**
 * Middleware: Bearer Authentication Simulator
 * Accepts JWT or temporary simulation tokens generated during user registration/OTP flows.
 */
function authenticateWebRTCSession(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied. Authorization token missing." });
  }
  next();
}

/**
 * POST /room/create
 * Creates a new conference workspace and allocates provider resources.
 */
router.post("/room/create", authenticateWebRTCSession, async (req: Request, res: Response) => {
  const { roomName, waitingRoom } = req.body;

  if (!roomName) {
    return res.status(400).json({ error: "roomName is required." });
  }

  try {
    const provider = ProviderFactory.getActiveProvider();
    await provider.createRoom(roomName);

    const room = roomManager.createRoom(roomName, { waitingRoom: !!waitingRoom });
    return res.status(201).json({
      success: true,
      roomName: room.roomName,
      inviteCode: room.inviteCode,
      activeProvider: room.activeProvider,
      waitingRoomEnabled: room.waitingRoomEnabled,
    });
  } catch (err: any) {
    console.error("[VAKHYA WebRTC] Error creating room:", err);
    return res.status(500).json({ error: err.message || "Failed to create conference room." });
  }
});

/**
 * POST /room/join
 * Verifies or queues a participant's eligibility to join a room.
 */
router.post("/room/join", authenticateWebRTCSession, (req: Request, res: Response) => {
  const { roomName, identity, userName, role } = req.body;

  if (!roomName || !identity) {
    return res.status(400).json({ error: "roomName and participant identity are required." });
  }

  try {
    const room = roomManager.getRoom(roomName);
    if (!room) {
      return res.status(404).json({ error: "WebRTC room does not exist." });
    }

    const result = roomManager.joinParticipant(roomName, {
      identity,
      userName: userName || `User_${identity.slice(-4)}`,
      role: role || "participant",
      isMuted: false,
      isCameraOn: true,
      isScreenSharing: false,
      hasHandRaised: false,
      networkQuality: "excellent",
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /room/leave
 * Gracefully registers that a participant is leaving the conference.
 */
router.post("/room/leave", authenticateWebRTCSession, (req: Request, res: Response) => {
  const { roomName, identity } = req.body;

  if (!roomName || !identity) {
    return res.status(400).json({ error: "roomName and identity are required." });
  }

  try {
    const removed = roomManager.removeParticipant(roomName, identity);
    return res.json({ success: removed, message: "Participant status cleaned." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /room/end
 * Host command to terminate the call and release provider assets.
 */
router.post("/room/end", authenticateWebRTCSession, async (req: Request, res: Response) => {
  const { roomName } = req.body;

  if (!roomName) {
    return res.status(400).json({ error: "roomName is required to terminate session." });
  }

  try {
    const provider = ProviderFactory.getActiveProvider();
    await provider.closeRoom(roomName);
    const success = roomManager.deleteRoom(roomName);
    return res.json({ success, message: `Room "${roomName}" successfully closed.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /room/token
 * Dynamic provider token generator. Dispatches tokens automatically based on active provider.
 */
router.post("/room/token", authenticateWebRTCSession, async (req: Request, res: Response) => {
  const { roomName, identity, userName, role = "participant" } = req.body;

  if (!roomName || !identity) {
    return res.status(400).json({ error: "roomName and identity are required." });
  }

  try {
    const provider = ProviderFactory.getActiveProvider();
    const tokenPayload = await provider.generateToken({
      roomName,
      identity,
      userName,
      role,
    });
    return res.json(tokenPayload);
  } catch (err: any) {
    console.error("[VAKHYA WebRTC] Token generation error:", err);
    return res.status(500).json({ error: "Could not dispense access tokens." });
  }
});

/**
 * GET /room/:id
 * Fetches status parameters for a single room.
 */
router.get("/room/:id", authenticateWebRTCSession, (req: Request, res: Response) => {
  const room = roomManager.getRoom(req.params.id);
  if (!room) {
    return res.status(404).json({ error: "Room not found." });
  }
  return res.json({
    roomName: room.roomName,
    isLocked: room.isLocked,
    waitingRoomEnabled: room.waitingRoomEnabled,
    activeProvider: room.activeProvider,
    createdAt: room.createdAt,
    inviteCode: room.inviteCode,
    participants: Array.from(room.participants.values()),
    waitingList: room.waitingList,
  });
});

/**
 * GET /participants
 * Returns all participants across active rooms for metrics or coordination.
 */
router.get("/participants", authenticateWebRTCSession, (req: Request, res: Response) => {
  const { roomName } = req.query;
  if (roomName && typeof roomName === "string") {
    const room = roomManager.getRoom(roomName);
    if (!room) return res.status(404).json({ error: "Room not found." });
    return res.json(Array.from(room.participants.values()));
  }

  const allParticipants: any[] = [];
  roomManager.listActiveRooms().forEach(room => {
    room.participants.forEach(p => {
      allParticipants.push({
        ...p,
        roomName: room.roomName,
      });
    });
  });
  return res.json(allParticipants);
});

/**
 * GET /call-history
 * Extracts history lists.
 */
router.get("/call-history", authenticateWebRTCSession, (req: Request, res: Response) => {
  return res.json(roomManager.getCallHistory());
});

/**
 * POST /recording/start
 * Requests cloud recording.
 */
router.post("/recording/start", authenticateWebRTCSession, async (req: Request, res: Response) => {
  const { roomName } = req.body;
  if (!roomName) {
    return res.status(400).json({ error: "roomName is required to record." });
  }

  try {
    const provider = ProviderFactory.getActiveProvider();
    const recordingId = await provider.startRecording(roomName);
    return res.status(201).json({ success: true, recordingId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /recording/stop
 * Halts cloud recording.
 */
router.post("/recording/stop", authenticateWebRTCSession, async (req: Request, res: Response) => {
  const { recordingId } = req.body;
  if (!recordingId) {
    return res.status(400).json({ error: "recordingId is required." });
  }

  try {
    const provider = ProviderFactory.getActiveProvider();
    const success = await provider.stopRecording(recordingId);
    return res.json({ success, message: "Recording halted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

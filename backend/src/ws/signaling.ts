import { Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { RedisStoreInterface } from "../config/redis.js";
import { JwtPayload } from "../middleware/auth.js";
import { mediasoupManager } from "../media/mediasoupManager.js";
import { ffmpegPipeline } from "../media/ffmpegPipeline.js";
import { DataStore } from "../repositories/types.js";

/**
 * In-memory WebSocket session registry (never persisted to DB per privacy requirement).
 */
export class SignalingHub {
  private wss: WebSocketServer | null = null;
  private userSockets = new Map<number, Set<WebSocket>>();

  attach(server: HttpServer, store: DataStore, redisStore: RedisStoreInterface) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", async (req, socket, head) => {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (url.pathname !== "/ws" && url.pathname !== "/signaling") return;

      const token =
        url.searchParams.get("token") ||
        (req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.slice(7)
          : null);

      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      try {
        if (await redisStore.isTokenBlacklisted(token)) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
        this.wss!.handleUpgrade(req, socket, head, (ws) => {
          this.onConnection(ws, decoded, store);
        });
      } catch {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
      }
    });
  }

  private onConnection(ws: WebSocket, user: JwtPayload, store: DataStore) {
    const sockets = this.userSockets.get(user.userId) || new Set<WebSocket>();
    sockets.add(ws);
    this.userSockets.set(user.userId, sockets);

    ws.send(JSON.stringify({ type: "connected", userId: user.userId }));

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        await this.handleMessage(ws, user, msg, store);
      } catch (err: any) {
        ws.send(JSON.stringify({ type: "error", message: err?.message || "Invalid message" }));
      }
    });

    ws.on("close", () => {
      const set = this.userSockets.get(user.userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) this.userSockets.delete(user.userId);
      }
    });
  }

  public sendToUser(userId: number, payload: Record<string, any>): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return false;
    const raw = JSON.stringify(payload);
    let sent = false;
    for (const s of sockets) {
      if (s.readyState === WebSocket.OPEN) {
        s.send(raw);
        sent = true;
      }
    }
    return sent;
  }

  private async handleMessage(
    ws: WebSocket,
    user: JwtPayload,
    msg: any,
    store: DataStore
  ): Promise<void> {
    const { type, callId, targetUserId } = msg;

    switch (type) {
      case "call_user": {
        if (targetUserId) {
          this.sendToUser(Number(targetUserId), {
            type: "incoming_call",
            callId,
            callerId: user.userId,
            callerEmail: user.email,
            callerType: user.userType,
            translationEnabled: msg.translationEnabled ?? true,
          });
        }
        break;
      }
      case "answer_call": {
        if (callId) {
          await store.updateCall(Number(callId), { status: "connected" });
        }
        const rtpCapabilities = await mediasoupManager.getRouterRtpCapabilities(String(callId));
        if (targetUserId) {
          this.sendToUser(Number(targetUserId), {
            type: "call_answered",
            callId,
            calleeId: user.userId,
            rtpCapabilities,
          });
        }
        ws.send(
          JSON.stringify({
            type: "call_joined",
            callId,
            rtpCapabilities,
          })
        );
        break;
      }
      case "reject_call":
      case "ignore_call": {
        const status = type === "reject_call" ? "rejected" : "missed";
        if (callId) {
          await store.updateCall(Number(callId), { status });
        }
        if (targetUserId) {
          this.sendToUser(Number(targetUserId), {
            type: type === "reject_call" ? "call_rejected" : "call_ignored",
            callId,
          });
        }
        break;
      }
      case "end_call": {
        if (callId) {
          await store.updateCall(Number(callId), {
            status: "ended",
            duration: Number(msg.duration || 0),
          });
          ffmpegPipeline.stopCallPipelines(String(callId));
          await mediasoupManager.closeRoom(String(callId));
        }
        if (targetUserId) {
          this.sendToUser(Number(targetUserId), {
            type: "call_ended",
            callId,
          });
        }
        break;
      }
      case "mediasoup_create_transport": {
        const transportParams = await mediasoupManager.createWebRtcTransport(
          String(callId),
          String(user.userId)
        );
        ws.send(JSON.stringify({ type: "mediasoup_transport_created", callId, transportParams }));
        break;
      }
      case "mediasoup_connect_transport": {
        await mediasoupManager.connectTransport(
          String(callId),
          msg.transportId,
          msg.dtlsParameters
        );
        ws.send(JSON.stringify({ type: "mediasoup_transport_connected", callId }));
        break;
      }
      case "mediasoup_produce": {
        const producer = await mediasoupManager.produce(
          String(callId),
          msg.transportId,
          msg.kind,
          msg.rtpParameters
        );
        ws.send(JSON.stringify({ type: "mediasoup_produced", callId, producerId: producer.id }));
        break;
      }
      case "webrtc_offer":
      case "webrtc_answer":
      case "ice_candidate":
      case "translation_event": {
        if (targetUserId) {
          this.sendToUser(Number(targetUserId), {
            ...msg,
            senderUserId: user.userId,
          });
        }
        break;
      }
      case "heartbeat": {
        ws.send(JSON.stringify({ type: "heartbeat_ack", ts: Date.now() }));
        break;
      }
    }
  }
}

export const signalingHub = new SignalingHub();

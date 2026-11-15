/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { roomManager } from "./roomManager";

interface SignalingMessage {
  type: 
    | "register_user"
    | "call_invite"
    | "call_accept"
    | "call_reject"
    | "call_end"
    | "translation_event"
    | "chat_dm"
    | "join" 
    | "leave" 
    | "offer" 
    | "answer" 
    | "candidate" 
    | "heartbeat" 
    | "raise_hand" 
    | "status_update" 
    | "typing" 
    | "chat"
    | "recording_status"
    | "screen_share_status"
    | "reconnect";
  roomName?: string;
  senderIdentity: string;
  senderName?: string;
  targetIdentity?: string;
  targetPhone?: string;
  callType?: "voice" | "video";
  caller?: any;
  callee?: any;
  payload?: any;
}

interface ClientConnection {
  ws: WebSocket;
  identity: string;
  roomName: string;
  phone?: string;
  name?: string;
  userType?: string;
  avatar?: string;
  lastActive: number;
}

export function normalizePhoneDigits(phone?: string): string {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

const activeSignalingConnections = new Map<string, ClientConnection>();

export function getOnlineSignalingPeers() {
  return Array.from(activeSignalingConnections.values()).map((c) => ({
    identity: c.identity,
    phone: c.phone || "",
    name: c.name || "Vakhya User",
    userType: c.userType || "Profile",
    avatar: c.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(c.identity)}`,
    online: true,
  }));
}

export function startSignalingServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  const connections = activeSignalingConnections;

  console.log("[VAKHYA WebRTC] Signaling Engine Initialized. Ready to bind.");

  // Intercept Express HTTP upgrade requests
  server.on("upgrade", (request, socket, head) => {
    const { pathname, searchParams } = new URL(request.url || "", `http://${request.headers.host}`);
    
    if (pathname === "/api/webrtc/signaling") {
      // Socket Authentication: Check authorization headers or query parameters
      const token = searchParams.get("token") || request.headers["sec-websocket-protocol"];
      if (!token) {
        console.warn("[VAKHYA WebRTC] Connection rejected: Authentication token missing.");
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  // Handle client connections
  wss.on("connection", (ws: WebSocket) => {
    let clientIdentity = "";
    let clientRoomName = "";

    console.log("[VAKHYA WebRTC] New authenticated signaling node connected.");

    ws.on("message", (messageStr: string) => {
      try {
        const msg: SignalingMessage = JSON.parse(messageStr);
        const { type, roomName = "", senderIdentity, senderName = "Vakhya Peer", targetIdentity, payload } = msg;

        // Keepalive / Heartbeat
        if (type === "heartbeat") {
          ws.send(JSON.stringify({ type: "heartbeat_ack", timestamp: Date.now() }));
          if (clientIdentity && connections.has(clientIdentity)) {
            connections.get(clientIdentity)!.lastActive = Date.now();
          }
          return;
        }

        if (!senderIdentity) {
          console.warn("[VAKHYA WebRTC] Dropped invalid message missing senderIdentity", msg);
          return;
        }

        if (type === "register_user") {
          clientIdentity = senderIdentity;
          const existing = connections.get(senderIdentity);
          connections.set(senderIdentity, {
            ws,
            identity: senderIdentity,
            roomName: existing?.roomName || "",
            phone: normalizePhoneDigits(payload?.phone),
            name: payload?.name || senderName,
            userType: payload?.userType || "Profile",
            avatar: payload?.avatar,
            lastActive: Date.now(),
          });
          broadcastOnlinePeers();
          return;
        }

        if (type === "call_invite") {
          const targetDigits = normalizePhoneDigits(msg.targetPhone);
          const targetConns = Array.from(connections.values()).filter(
            (c) =>
              c.identity !== senderIdentity &&
              c.ws.readyState === WebSocket.OPEN &&
              (targetIdentity
                ? c.identity === targetIdentity
                : Boolean(targetDigits && c.phone === targetDigits))
          );
          targetConns.forEach((conn) => {
            conn.ws.send(
              JSON.stringify({
                type: "incoming_call",
                roomName,
                callType: msg.callType || "video",
                caller: msg.caller || {
                  id: senderIdentity,
                  identity: senderIdentity,
                  name: senderName,
                  phone: payload?.phone || "",
                  userType: payload?.userType || "Vakhya Peer",
                  avatar: payload?.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(senderIdentity)}`,
                },
              })
            );
          });
          ws.send(
            JSON.stringify({
              type: "call_ringing",
              roomName,
              targetOnline: targetConns.length > 0,
            })
          );
          return;
        }

        if (type === "call_accept" || type === "call_reject" || type === "call_end") {
          const targetDigits = normalizePhoneDigits(msg.targetPhone);
          connections.forEach((conn) => {
            if (conn.identity === senderIdentity || conn.ws.readyState !== WebSocket.OPEN) return;
            const matchesTarget =
              (roomName && conn.roomName === roomName) ||
              (targetIdentity
                ? conn.identity === targetIdentity
                : Boolean(targetDigits && conn.phone === targetDigits));
            if (matchesTarget) {
              conn.ws.send(
                JSON.stringify({
                  type:
                    type === "call_accept"
                      ? "call_accepted"
                      : type === "call_reject"
                        ? "call_rejected"
                        : "call_ended",
                  roomName,
                  senderIdentity,
                  senderName,
                  callee: msg.callee,
                  payload,
                })
              );
            }
          });
          return;
        }

        if (type === "chat_dm") {
          const targetDigits = normalizePhoneDigits(msg.targetPhone);
          connections.forEach((conn) => {
            if (conn.identity === senderIdentity || conn.ws.readyState !== WebSocket.OPEN) return;
            if (
              targetIdentity
                ? conn.identity === targetIdentity
                : Boolean(targetDigits && conn.phone === targetDigits)
            ) {
              conn.ws.send(
                JSON.stringify({
                  type: "chat_dm",
                  senderIdentity,
                  senderName,
                  payload,
                })
              );
            }
          });
          return;
        }

        // Room-scoped WebRTC / translation messages require roomName
        if (!roomName) {
          console.warn("[VAKHYA WebRTC] Dropped message missing roomName", msg);
          return;
        }

        switch (type) {
          case "join":
          case "reconnect": {
            clientIdentity = senderIdentity;
            clientRoomName = roomName;

            const prev = connections.get(senderIdentity);
            // Establish or restore cached client connection
            connections.set(senderIdentity, {
              ws,
              identity: senderIdentity,
              roomName,
              phone: prev?.phone,
              name: prev?.name || senderName,
              userType: prev?.userType,
              avatar: prev?.avatar,
              lastActive: Date.now(),
            });

            // Ensure room exists
            const room = roomManager.createRoom(roomName);
            
            // Add participant state
            const joinResult = roomManager.joinParticipant(roomName, {
              identity: senderIdentity,
              userName: senderName,
              role: room.participants.size === 0 ? "host" : "participant",
              isMuted: false,
              isCameraOn: true,
              isScreenSharing: false,
              hasHandRaised: false,
              networkQuality: "excellent",
            });

            if (!joinResult.success) {
              ws.send(JSON.stringify({ type: "error", payload: { message: joinResult.error } }));
              return;
            }

            // Acknowledge successful room allocation
            ws.send(JSON.stringify({
              type: type === "reconnect" ? "reconnected_ack" : "joined_ack",
              roomName,
              role: room.participants.get(senderIdentity)?.role || "participant",
              inviteCode: room.inviteCode,
              participants: Array.from(room.participants.values()),
            }));

            // Notify all other room participants about the new/reconnected node
            broadcastToRoom(roomName, senderIdentity, {
              type: "presence_joined",
              roomName,
              senderIdentity,
              senderName,
              payload: {
                joinedParticipant: room.participants.get(senderIdentity),
                isReconnect: type === "reconnect"
              },
            });
            break;
          }

          case "leave": {
            handleClientDisconnect(senderIdentity, roomName);
            break;
          }

          case "offer":
          case "answer":
          case "candidate": {
            // Relays direct WebRTC handshake packets to the target peer node
            if (targetIdentity) {
              const targetNode = connections.get(targetIdentity);
              if (targetNode && targetNode.ws.readyState === WebSocket.OPEN) {
                targetNode.ws.send(JSON.stringify({
                  type,
                  roomName,
                  senderIdentity,
                  senderName,
                  payload,
                }));
              }
            } else {
              // Direct room-wide multicast if no specific Peer target is designated
              broadcastToRoom(roomName, senderIdentity, msg);
            }
            break;
          }

          case "raise_hand": {
            const room = roomManager.getRoom(roomName);
            if (room) {
              const participant = room.participants.get(senderIdentity);
              if (participant) {
                participant.hasHandRaised = !participant.hasHandRaised;
                
                // Broadcast updated list
                broadcastToRoom(roomName, senderIdentity, {
                  type: "presence_updated",
                  roomName,
                  senderIdentity,
                  payload: {
                    identity: senderIdentity,
                    hasHandRaised: participant.hasHandRaised,
                  },
                });
              }
            }
            break;
          }

          case "status_update": {
            const room = roomManager.getRoom(roomName);
            if (room && payload) {
              const participant = room.participants.get(senderIdentity);
              if (participant) {
                if (payload.isMuted !== undefined) participant.isMuted = payload.isMuted;
                if (payload.isCameraOn !== undefined) participant.isCameraOn = payload.isCameraOn;
                
                broadcastToRoom(roomName, senderIdentity, {
                  type: "presence_updated",
                  roomName,
                  senderIdentity,
                  payload,
                });
              }
            }
            break;
          }

          case "screen_share_status": {
            const room = roomManager.getRoom(roomName);
            if (room && payload) {
              const participant = room.participants.get(senderIdentity);
              if (participant) {
                participant.isScreenSharing = !!payload.isScreenSharing;
                
                broadcastToRoom(roomName, senderIdentity, {
                  type: "presence_updated",
                  roomName,
                  senderIdentity,
                  payload: {
                    identity: senderIdentity,
                    isScreenSharing: participant.isScreenSharing,
                  },
                });
              }
            }
            break;
          }

          case "typing": {
            broadcastToRoom(roomName, senderIdentity, {
              type: "typing",
              roomName,
              senderIdentity,
              payload,
            });
            break;
          }

          case "chat": {
            // Relays text messaging among participants in real-time
            broadcastToRoom(roomName, senderIdentity, {
              type: "chat",
              roomName,
              senderIdentity,
              senderName,
              payload,
            });
            break;
          }

          case "recording_status": {
            broadcastToRoom(roomName, senderIdentity, {
              type: "recording_status",
              roomName,
              senderIdentity,
              payload,
            });
            break;
          }

          case "translation_event": {
            broadcastToRoom(roomName, senderIdentity, {
              type: "translation_event",
              roomName,
              senderIdentity,
              senderName,
              payload,
            });
            break;
          }

          default:
            console.warn(`[VAKHYA WebRTC] Unrecognized signaling transaction: ${type}`);
        }
      } catch (err) {
        console.error("[VAKHYA WebRTC] Failed to parse socket frame", err);
      }
    });

    // Handle unexpected connection drop
    ws.on("close", () => {
      if (clientIdentity) {
        console.log(`[VAKHYA WebRTC] Node disconnected: ${clientIdentity}`);
        handleClientDisconnect(clientIdentity, clientRoomName);
      }
    });

    ws.on("error", (err) => {
      console.error(`[VAKHYA WebRTC] Socket error on node ${clientIdentity}:`, err);
    });

    function broadcastOnlinePeers() {
      const peers = getOnlineSignalingPeers();
      const raw = JSON.stringify({ type: "online_peers", peers });
      connections.forEach((conn) => {
        if (conn.ws.readyState === WebSocket.OPEN) {
          conn.ws.send(raw);
        }
      });
    }

    /**
     * Broadcast utility restricting transmission to only matches inside the room workspace
     */
    function broadcastToRoom(room: string, sender: string, messageObj: any) {
      connections.forEach((conn) => {
        if (conn.roomName === room && conn.identity !== sender && conn.ws.readyState === WebSocket.OPEN) {
          conn.ws.send(JSON.stringify(messageObj));
        }
      });
    }

    /**
     * Clean disconnect workflow
     */
    function handleClientDisconnect(identity: string, room: string) {
      if (room) {
        roomManager.removeParticipant(room, identity);
        broadcastToRoom(room, identity, {
          type: "presence_left",
          roomName: room,
          senderIdentity: identity,
        });
      }
      connections.delete(identity);
      broadcastOnlinePeers();

      console.log(`[VAKHYA WebRTC] Participant ${identity} disconnected.`);
    }
  });

  // Automated connection sweeper checking heartbeats every 30 seconds
  setInterval(() => {
    const now = Date.now();
    connections.forEach((conn, identity) => {
      if (now - conn.lastActive > 60000) { // 60s timeout
        console.warn(`[VAKHYA WebRTC] Sweeping stale signaling connection: ${identity}`);
        conn.ws.terminate();
        roomManager.removeParticipant(conn.roomName, identity);
        connections.delete(identity);
      }
    });
  }, 30000);
}

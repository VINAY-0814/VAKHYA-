/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { roomManager } from "../roomManager";
import { Participant } from "../types/models";

interface SocketAuth {
  token?: string;
  roomName?: string;
  identity?: string;
  userName?: string;
  role?: "host" | "participant" | "observer";
}

export function startSocketIOSignaling(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Configurable for strict production constraints
      methods: ["GET", "POST"],
    },
    path: "/api/webrtc/socket.io",
  });

  console.log("[VAKHYA WebRTC] Socket.IO Signaling Server active on path: /api/webrtc/socket.io");

  // Authentication Middleware inside Socket.IO pipeline
  io.use((socket: Socket, next) => {
    const auth = socket.handshake.auth as SocketAuth;
    const token = auth.token || socket.handshake.headers["authorization"];

    if (!token) {
      console.warn("[VAKHYA WebRTC] Socket.IO auth rejected: Bearer Token absent.");
      return next(new Error("Authentication failed: Token is required."));
    }

    if (!auth.roomName || !auth.identity) {
      console.warn("[VAKHYA WebRTC] Socket.IO handshake missing roomName or participant identity.");
      return next(new Error("Authentication failed: Incomplete metadata (roomName, identity required)."));
    }

    next();
  });

  io.on("connection", (socket: Socket) => {
    const auth = socket.handshake.auth as SocketAuth;
    const roomName = auth.roomName!;
    const identity = auth.identity!;
    const userName = auth.userName || `User_${identity.slice(-4)}`;
    const initialRole = auth.role || "participant";

    console.log(`[VAKHYA Socket.IO] Connected node: ${identity} (${userName}) to room: ${roomName}`);

    // Track Socket specific reference variables
    socket.data = {
      identity,
      roomName,
      userName,
    };

    /**
     * EVENT: Join Call / Initialize Session
     */
    socket.on("join_room", () => {
      // Allocate the room dynamically if missing
      const room = roomManager.createRoom(roomName);

      const joinResult = roomManager.joinParticipant(roomName, {
        identity,
        userName,
        role: room.participants.size === 0 ? "host" : initialRole,
        isMuted: false,
        isCameraOn: true,
        isScreenSharing: false,
        hasHandRaised: false,
        networkQuality: "excellent",
      });

      if (!joinResult.success) {
        socket.emit("error_response", { message: joinResult.error });
        return;
      }

      // Bind Socket connection to the room-specific workspace channel
      socket.join(roomName);

      const updatedParticipant = room.participants.get(identity)!;

      // Disseminate join acknowledgement directly to caller
      socket.emit("joined_ack", {
        roomName,
        role: updatedParticipant.role,
        inviteCode: room.inviteCode,
        participants: Array.from(room.participants.values()),
        activeProvider: room.activeProvider,
      });

      // Broadcast new presence to all other nodes inside the room channel
      socket.to(roomName).emit("presence_joined", {
        roomName,
        senderIdentity: identity,
        senderName: userName,
        payload: {
          joinedParticipant: updatedParticipant,
          isReconnect: false,
        },
      });
    });

    /**
     * EVENT: Direct 1-to-1 WebRTC Handshake Relay (Offer)
     */
    socket.on("webrtc_offer", (data: { targetIdentity: string; offer: any }) => {
      const { targetIdentity, offer } = data;
      socket.to(roomName).emit("webrtc_offer_relay", {
        senderIdentity: identity,
        senderName: userName,
        targetIdentity,
        offer,
      });
    });

    /**
     * EVENT: Direct 1-to-1 WebRTC Handshake Relay (Answer)
     */
    socket.on("webrtc_answer", (data: { targetIdentity: string; answer: any }) => {
      const { targetIdentity, answer } = data;
      socket.to(roomName).emit("webrtc_answer_relay", {
        senderIdentity: identity,
        senderName: userName,
        targetIdentity,
        answer,
      });
    });

    /**
     * EVENT: WebRTC ICE Candidate distribution
     */
    socket.on("webrtc_candidate", (data: { targetIdentity?: string; candidate: any }) => {
      const { targetIdentity, candidate } = data;
      
      if (targetIdentity) {
        socket.to(roomName).emit("webrtc_candidate_relay", {
          senderIdentity: identity,
          candidate,
          targetIdentity,
        });
      } else {
        socket.to(roomName).emit("webrtc_candidate_multicast", {
          senderIdentity: identity,
          candidate,
        });
      }
    });

    /**
     * EVENT: Status Update (Mic / Camera toggle signals)
     */
    socket.on("status_update", (payload: { isMuted?: boolean; isCameraOn?: boolean }) => {
      const room = roomManager.getRoom(roomName);
      if (room) {
        const participant = room.participants.get(identity);
        if (participant) {
          if (payload.isMuted !== undefined) participant.isMuted = payload.isMuted;
          if (payload.isCameraOn !== undefined) participant.isCameraOn = payload.isCameraOn;

          io.to(roomName).emit("presence_updated", {
            roomName,
            senderIdentity: identity,
            payload: {
              identity,
              ...payload,
            },
          });
        }
      }
    });

    /**
     * EVENT: Screen Sharing state transition
     */
    socket.on("screen_share_status", (payload: { isScreenSharing: boolean }) => {
      const room = roomManager.getRoom(roomName);
      if (room) {
        const participant = room.participants.get(identity);
        if (participant) {
          participant.isScreenSharing = payload.isScreenSharing;

          io.to(roomName).emit("presence_updated", {
            roomName,
            senderIdentity: identity,
            payload: {
              identity,
              isScreenSharing: participant.isScreenSharing,
            },
          });
        }
      }
    });

    /**
     * EVENT: Raise / Lower Hand accessibility assist
     */
    socket.on("raise_hand", () => {
      const room = roomManager.getRoom(roomName);
      if (room) {
        const participant = room.participants.get(identity);
        if (participant) {
          participant.hasHandRaised = !participant.hasHandRaised;

          io.to(roomName).emit("presence_updated", {
            roomName,
            senderIdentity: identity,
            payload: {
              identity,
              hasHandRaised: participant.hasHandRaised,
            },
          });
        }
      }
    });

    /**
     * EVENT: Real-Time Chat messages
     */
    socket.on("chat_message", (messagePayload: any) => {
      socket.to(roomName).emit("chat_message_received", {
        roomName,
        senderIdentity: identity,
        senderName: userName,
        payload: messagePayload,
      });
    });

    /**
     * EVENT: Server Cloud Recording state sync
     */
    socket.on("recording_status", (payload: { isRecording: boolean; url?: string }) => {
      socket.to(roomName).emit("recording_status_changed", payload);
    });

    /**
     * EVENT: Host Action - Force Mute Participant
     */
    socket.on("host_mute_participant", (data: { targetIdentity: string; trackType: "audio" | "video" }) => {
      const room = roomManager.getRoom(roomName);
      if (room) {
        const caller = room.participants.get(identity);
        if (caller && caller.role === "host") {
          io.to(roomName).emit("host_track_muted", {
            targetIdentity: data.targetIdentity,
            trackType: data.trackType,
            mutedBy: identity,
          });
        }
      }
    });

    /**
     * EVENT: Host Action - Kick Participant
     */
    socket.on("host_kick_participant", (data: { targetIdentity: string }) => {
      const room = roomManager.getRoom(roomName);
      if (room) {
        const caller = room.participants.get(identity);
        if (caller && caller.role === "host") {
          io.to(roomName).emit("host_participant_kicked", {
            targetIdentity: data.targetIdentity,
            kickedBy: identity,
          });
        }
      }
    });

    /**
     * EVENT: Leave session gracefully
     */
    socket.on("leave_room", () => {
      handleDisconnect();
    });

    /**
     * Socket connection drop
     */
    socket.on("disconnect", () => {
      console.log(`[VAKHYA Socket.IO] Connection severed for node: ${identity}`);
      handleDisconnect();
    });

    function handleDisconnect() {
      const room = roomManager.getRoom(roomName);
      if (room) {
        roomManager.removeParticipant(roomName, identity);
        socket.leave(roomName);

        socket.to(roomName).emit("presence_left", {
          roomName,
          senderIdentity: identity,
        });
      }
    }
  });
}

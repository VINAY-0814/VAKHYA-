/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { webRTCConfig } from "./config";
import { Participant, WebRTCRoom, CallHistory } from "./types/models";

export interface CallMetrics {
  totalRoomsCreated: number;
  activeCallsCount: number;
  packetLossAverage: number;
  providerUsage: {
    livekit: number;
    agora: number;
  };
}

class RoomManager {
  private rooms = new Map<string, WebRTCRoom>();
  private history: CallHistory[] = [];
  private metrics: CallMetrics = {
    totalRoomsCreated: 0,
    activeCallsCount: 0,
    packetLossAverage: 0.02, // simulated 2% initial packet loss baseline
    providerUsage: {
      livekit: 0,
      agora: 0,
    },
  };

  /**
   * Room Lifecycle Methods
   */
  public createRoom(roomName: string, options?: { waitingRoom?: boolean }): WebRTCRoom {
    if (this.rooms.has(roomName)) {
      return this.rooms.get(roomName)!;
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRoom: WebRTCRoom = {
      roomName,
      isLocked: false,
      waitingRoomEnabled: options?.waitingRoom || false,
      activeProvider: webRTCConfig.activeProvider,
      createdAt: Date.now(),
      participants: new Map(),
      waitingList: [],
      inviteCode,
    };

    this.rooms.set(roomName, newRoom);
    this.metrics.totalRoomsCreated++;
    if (newRoom.activeProvider === "livekit") {
      this.metrics.providerUsage.livekit++;
    } else {
      this.metrics.providerUsage.agora++;
    }
    this.updateActiveCallsCount();
    console.log(`[VAKHYA WebRTC] Created WebRTC Room "${roomName}" using provider ${newRoom.activeProvider.toUpperCase()}. Code: ${inviteCode}`);
    return newRoom;
  }

  public getRoom(roomName: string): WebRTCRoom | undefined {
    return this.rooms.get(roomName);
  }

  public getRoomByInviteCode(inviteCode: string): WebRTCRoom | undefined {
    return Array.from(this.rooms.values()).find(r => r.inviteCode === inviteCode.toUpperCase());
  }

  public deleteRoom(roomName: string): boolean {
    const deleted = this.rooms.delete(roomName);
    this.updateActiveCallsCount();
    if (deleted) {
      console.log(`[VAKHYA WebRTC] Destroyed Room "${roomName}". State cleared.`);
    }
    return deleted;
  }

  public listActiveRooms(): WebRTCRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Participant Controls
   */
  public joinParticipant(roomName: string, participant: Omit<Participant, "joinedAt">): { success: boolean; error?: string; waiting?: boolean } {
    const room = this.rooms.get(roomName);
    if (!room) {
      return { success: false, error: "WebRTC session does not exist." };
    }

    if (room.isLocked) {
      return { success: false, error: "The call host has locked this room." };
    }

    // Checking if waiting room is enabled and user is not host
    if (room.waitingRoomEnabled && participant.role !== "host") {
      if (!room.waitingList.includes(participant.identity)) {
        room.waitingList.push(participant.identity);
      }
      return { success: true, waiting: true };
    }

    const newParticipant: Participant = {
      ...participant,
      joinedAt: Date.now(),
    };

    room.participants.set(participant.identity, newParticipant);
    console.log(`[VAKHYA WebRTC] Participant "${participant.userName}" joined room "${roomName}".`);
    return { success: true, waiting: false };
  }

  public acceptWaitingParticipant(roomName: string, identity: string): boolean {
    const room = this.rooms.get(roomName);
    if (!room) return false;

    const idx = room.waitingList.indexOf(identity);
    if (idx !== -1) {
      room.waitingList.splice(idx, 1);
      // Automatically triggers join as standard participant
      const newParticipant: Participant = {
        identity,
        userName: `Guest_${identity.slice(-4)}`,
        role: "participant",
        joinedAt: Date.now(),
        isMuted: false,
        isCameraOn: true,
        isScreenSharing: false,
        hasHandRaised: false,
        networkQuality: "excellent",
      };
      room.participants.set(identity, newParticipant);
      return true;
    }
    return false;
  }

  public removeParticipant(roomName: string, identity: string): boolean {
    const room = this.rooms.get(roomName);
    if (!room) return false;

    const deleted = room.participants.delete(identity);
    // If the room has zero active participants after 10 seconds, clean it up
    if (room.participants.size === 0) {
      setTimeout(() => {
        const checkRoom = this.rooms.get(roomName);
        if (checkRoom && checkRoom.participants.size === 0) {
          this.deleteRoom(roomName);
        }
      }, 10000);
    }
    return deleted;
  }

  /**
   * Call Signaling / History Registry
   */
  public logCallHistory(log: Omit<CallHistory, "id" | "startedAt">): CallHistory {
    const newLog: CallHistory = {
      ...log,
      id: `call_${Math.random().toString(36).substr(2, 9)}`,
      startedAt: Date.now(),
    };
    this.history.unshift(newLog);
    return newLog;
  }

  public updateCallStatus(callId: string, duration: number, status: CallHistory["status"]): boolean {
    const log = this.history.find(l => l.id === callId);
    if (log) {
      log.durationSeconds = duration;
      log.endedAt = log.startedAt + (duration * 1000);
      log.status = status;
      return true;
    }
    return false;
  }

  public getCallHistory(): CallHistory[] {
    return this.history;
  }

  /**
   * Metrics & Aggregations
   */
  public getMetrics(): CallMetrics {
    return {
      ...this.metrics,
      activeCallsCount: this.rooms.size,
    };
  }

  private updateActiveCallsCount() {
    this.metrics.activeCallsCount = this.rooms.size;
  }
}

export const roomManager = new RoomManager();

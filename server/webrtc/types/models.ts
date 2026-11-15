/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DeviceInfo {
  deviceId: string;
  os: string;
  browser: string;
  cameraName?: string;
  micName?: string;
  hasHardwareAcceleration: boolean;
}

export interface ConnectionLog {
  id: string;
  participantId: string;
  roomName: string;
  provider: "livekit" | "agora";
  status: "connected" | "reconnecting" | "disconnected" | "failed";
  packetLoss: number;
  rttMs: number;
  timestamp: number;
}

export interface Participant {
  identity: string;
  userName: string;
  role: "host" | "participant" | "observer";
  joinedAt: number;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  hasHandRaised: boolean;
  networkQuality: "excellent" | "good" | "poor" | "offline";
  device?: DeviceInfo;
}

export interface WebRTCRoom {
  roomName: string;
  isLocked: boolean;
  waitingRoomEnabled: boolean;
  activeProvider: "livekit" | "agora";
  createdAt: number;
  participants: Map<string, Participant>;
  waitingList: string[]; // List of user identities waiting for host approval
  inviteCode: string;
}

export interface CallHistory {
  id: string;
  roomName: string;
  provider: "livekit" | "agora";
  callerPhone: string;
  receiverPhone: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
  status: "answered" | "missed" | "rejected" | "busy";
  callType: "voice" | "video";
}

export interface Recording {
  id: string;
  roomName: string;
  provider: "livekit" | "agora";
  url: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
  fileSizeMb?: number;
}

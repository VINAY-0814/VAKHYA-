/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TokenParams {
  roomName: string;
  identity: string;
  userName?: string;
  role: "host" | "participant" | "observer";
}

export interface ProviderTokenResponse {
  token: string;
  provider: "livekit" | "agora";
  appId?: string; // Specific to Agora
  url?: string;   // Specific to LiveKit
}

export interface IWebRTCProvider {
  /**
   * Generates a cryptographically signed authentication token for the specific room.
   */
  generateToken(params: TokenParams): Promise<ProviderTokenResponse>;

  /**
   * Performs any setup required on the developer platform (LiveKit Room allocation or Agora channel verification).
   */
  createRoom(roomName: string): Promise<boolean>;

  /**
   * Closes the remote WebRTC room on the provider's server.
   */
  closeRoom(roomName: string): Promise<boolean>;

  /**
   * Starts a server-side cloud recording of the session.
   */
  startRecording(roomName: string): Promise<string>;

  /**
   * Halts a server-side cloud recording of the session.
   */
  stopRecording(recordingId: string): Promise<boolean>;

  /**
   * Mutes a target participant's audio or video tracks remotely.
   */
  muteParticipant(roomName: string, identity: string, trackType: "audio" | "video", mute: boolean): Promise<boolean>;

  /**
   * Evicts a target participant from the conference session.
   */
  removeParticipant(roomName: string, identity: string): Promise<boolean>;
}

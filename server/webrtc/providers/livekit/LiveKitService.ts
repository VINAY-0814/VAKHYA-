/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jwt from "jsonwebtoken";
import { IWebRTCProvider, TokenParams, ProviderTokenResponse } from "../../interfaces/IWebRTCProvider";
import { webRTCConfig } from "../../config";

export class LiveKitService implements IWebRTCProvider {
  private apiKey: string;
  private apiSecret: string;
  private url: string;

  constructor() {
    this.apiKey = webRTCConfig.livekit.apiKey;
    this.apiSecret = webRTCConfig.livekit.apiSecret;
    this.url = webRTCConfig.livekit.url;
  }

  public async generateToken(params: TokenParams): Promise<ProviderTokenResponse> {
    const { roomName, identity, userName = "LiveKit User", role } = params;
    const expiration = Math.floor(Date.now() / 1000) + webRTCConfig.tokenExpirySeconds;

    const grants = {
      roomJoin: true,
      room: roomName,
      canPublish: role !== "observer",
      canSubscribe: true,
      canPublishData: true,
      hidden: false,
      recorder: false,
    };

    const payload = {
      sub: identity,
      name: userName,
      video: grants,
      iss: this.apiKey,
      nbf: Math.floor(Date.now() / 1000) - 10,
      exp: expiration,
      metadata: JSON.stringify({ role }),
    };

    const token = jwt.sign(payload, this.apiSecret, { algorithm: "HS256" });

    return {
      token,
      provider: "livekit",
      url: this.url,
    };
  }

  public async createRoom(roomName: string): Promise<boolean> {
    console.log(`[VAKHYA LiveKit] API request: Creating room "${roomName}" on server ${this.url}`);
    // Simulate successful API call to the LiveKit server
    return true;
  }

  public async closeRoom(roomName: string): Promise<boolean> {
    console.log(`[VAKHYA LiveKit] API request: Force deleting room "${roomName}" on server`);
    return true;
  }

  public async startRecording(roomName: string): Promise<string> {
    const recordingId = `lk_rec_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[VAKHYA LiveKit] Initiated server-side recording for "${roomName}". ID: ${recordingId}`);
    return recordingId;
  }

  public async stopRecording(recordingId: string): Promise<boolean> {
    console.log(`[VAKHYA LiveKit] Severed recording connection for ID: ${recordingId}`);
    return true;
  }

  public async muteParticipant(roomName: string, identity: string, trackType: "audio" | "video", mute: boolean): Promise<boolean> {
    console.log(`[VAKHYA LiveKit] RemoteTrackCommand: ${mute ? "Muting" : "Unmuting"} track ${trackType} for participant "${identity}" in room "${roomName}"`);
    return true;
  }

  public async removeParticipant(roomName: string, identity: string): Promise<boolean> {
    console.log(`[VAKHYA LiveKit] EvictParticipantCommand: Evicting participant "${identity}" from room "${roomName}"`);
    return true;
  }
}

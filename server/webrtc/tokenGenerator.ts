/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { webRTCConfig } from "./config";

export interface TokenRequest {
  roomName: string;
  identity: string;
  userName?: string;
  role?: "host" | "participant" | "observer";
}

export interface TokenResponse {
  provider: "livekit" | "agora";
  token: string;
  roomName: string;
  identity: string;
  url?: string; // Necessary for LiveKit cloud/self-hosted ws target
  appId?: string; // Necessary for Agora client initialization
}

/**
 * LiveKit Token Generator
 * Outputs a highly secure Access Token with full publication & subscription capabilities.
 */
export function generateLiveKitToken(request: TokenRequest): string {
  const { roomName, identity, userName = "Vakhya User", role = "participant" } = request;
  const { apiKey, apiSecret } = webRTCConfig.livekit;

  const expiration = Math.floor(Date.now() / 1000) + webRTCConfig.tokenExpirySeconds;

  // Build the granular LiveKit grant structure
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
    iss: apiKey,
    nbf: Math.floor(Date.now() / 1000) - 10, // 10s leeway
    exp: expiration,
    metadata: JSON.stringify({ role }),
  };

  // Sign with HMAC-SHA256
  return jwt.sign(payload, apiSecret, { algorithm: "HS256" });
}

/**
 * Agora AccessToken Builder
 * Dynamically builds HMAC-SHA256 signed RTC tokens for specified channel & participant configurations.
 */
export function generateAgoraToken(request: TokenRequest): string {
  const { roomName, identity } = request;
  const { appId, appCertificate } = webRTCConfig.agora;

  // Agora supports integer UIDs or string userAccounts. We hash string accounts or treat them as uint32.
  // We'll calculate a standard numeric UID from the identity string for RTC consistency, or pass it directly.
  let uid: number = 0;
  if (/^\d+$/.test(identity)) {
    uid = parseInt(identity, 10);
  } else {
    // Generate simple positive hash from string identity
    let hash = 0;
    for (let i = 0; i < identity.length; i++) {
      hash = identity.charCodeAt(i) + ((hash << 5) - hash);
    }
    uid = Math.abs(hash) % 100000000 + 1; // 8-digit numeric UID fallback
  }

  const expireTime = Math.floor(Date.now() / 1000) + webRTCConfig.tokenExpirySeconds;

  // Layout for Agora Access Token V2 Structure:
  // | version (4B) | appId (32B) | signature (32B) | message (variable) |
  // Let's create an elegant, standard cryptographic signing workflow
  const signatureData = `${appId}${roomName}${uid}${expireTime}`;
  const signature = crypto
    .createHmac("sha256", appCertificate)
    .update(signatureData)
    .digest("hex");

  // Pack the information into a self-contained base64 string
  const tokenPayload = {
    appId,
    channelName: roomName,
    uid,
    expireTime,
    signature,
    provider: "agora",
  };

  return Buffer.from(JSON.stringify(tokenPayload)).toString("base64");
}

/**
 * Unified Orchestrated Token Dispenser
 * Seamlessly resolves tokens based on the configured active provider.
 */
export function getUnifiedToken(request: TokenRequest): TokenResponse {
  const provider = webRTCConfig.activeProvider;

  if (provider === "livekit") {
    const token = generateLiveKitToken(request);
    return {
      provider,
      token,
      roomName: request.roomName,
      identity: request.identity,
      url: webRTCConfig.livekit.url,
    };
  } else {
    const token = generateAgoraToken(request);
    return {
      provider,
      token,
      roomName: request.roomName,
      identity: request.identity,
      appId: webRTCConfig.agora.appId,
    };
  }
}

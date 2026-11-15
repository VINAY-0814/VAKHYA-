/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from "dotenv";
dotenv.config();

export type WebRTCProviderType = "livekit" | "agora";

export interface WebRTCConfig {
  activeProvider: WebRTCProviderType;
  livekit: {
    apiKey: string;
    apiSecret: string;
    url: string;
  };
  agora: {
    appId: string;
    appCertificate: string;
  };
  tokenExpirySeconds: number;
}

export const webRTCConfig: WebRTCConfig = {
  activeProvider: (process.env.WEBRTC_PROVIDER || "livekit").toLowerCase() === "agora" ? "agora" : "livekit",
  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY || "dev-key",
    apiSecret: process.env.LIVEKIT_API_SECRET || "dev-secret",
    url: process.env.LIVEKIT_URL || "ws://localhost:7880",
  },
  agora: {
    appId: process.env.AGORA_APP_ID || "dev-app-id",
    appCertificate: process.env.AGORA_APP_CERTIFICATE || "dev-certificate",
  },
  tokenExpirySeconds: 3600, // 1 hour token expiration
};

console.log(`[VAKHYA WebRTC] Active Provider Configured: ${webRTCConfig.activeProvider.toUpperCase()}`);

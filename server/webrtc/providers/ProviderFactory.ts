/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IWebRTCProvider } from "../interfaces/IWebRTCProvider";
import { LiveKitService } from "./livekit/LiveKitService";
import { AgoraService } from "./agora/AgoraService";
import { webRTCConfig } from "../config";

export class ProviderFactory {
  private static livekitInstance: LiveKitService | null = null;
  private static agoraInstance: AgoraService | null = null;

  /**
   * Resolves the active provider dynamically at runtime.
   */
  public static getActiveProvider(): IWebRTCProvider {
    const provider = webRTCConfig.activeProvider;

    if (provider === "agora") {
      if (!this.agoraInstance) {
        this.agoraInstance = new AgoraService();
      }
      return this.agoraInstance;
    } else {
      if (!this.livekitInstance) {
        this.livekitInstance = new LiveKitService();
      }
      return this.livekitInstance;
    }
  }
}

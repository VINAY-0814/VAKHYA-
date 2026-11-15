import { env } from "../config/env.js";

export interface IncomingCallPushPayload {
  callId: number;
  callerId: number;
  callerName: string;
  callerPhone: string;
  callerType: "deaf" | "hearing";
  translationEnabled: boolean;
}

export class FcmService {
  private messaging: any = null;
  public dispatchedLog: Array<{ tokens: string[]; data: Record<string, string> }> = [];

  async init(): Promise<void> {
    if (this.messaging || !env.firebaseServiceAccountJson) return;
    try {
      const fbPkg = "firebase-admin";
      const admin = (await import(/* @vite-ignore */ fbPkg)).default;
      const serviceAccount = JSON.parse(env.firebaseServiceAccountJson);
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      }
      this.messaging = admin.messaging();
      console.log("[VAKHYA FCM] Firebase Admin Messaging initialized.");
    } catch (err: any) {
      console.warn("[VAKHYA FCM] Firebase Admin not configured:", err?.message || err);
    }
  }

  /**
   * Sends a data-only high-priority FCM push so Android Notifee renders incoming call alerts
   * even when the app is backgrounded or terminated.
   */
  async sendIncomingCallAlert(tokens: string[], payload: IncomingCallPushPayload): Promise<void> {
    if (!tokens.length) return;
    const data: Record<string, string> = {
      type: "INCOMING_CALL",
      callId: String(payload.callId),
      callerId: String(payload.callerId),
      callerName: payload.callerName,
      callerPhone: payload.callerPhone,
      callerType: payload.callerType,
      translationEnabled: String(payload.translationEnabled),
    };

    this.dispatchedLog.push({ tokens, data });

    if (!this.messaging) {
      console.log(`[VAKHYA FCM] Simulated data-only push to ${tokens.length} device(s):`, data);
      return;
    }

    try {
      await this.messaging.sendEachForMulticast({
        tokens,
        data,
        android: {
          priority: "high",
          ttl: 30 * 1000,
        },
      });
    } catch (err: any) {
      console.warn("[VAKHYA FCM] Push send warning:", err?.message || err);
    }
  }
}

export const fcmService = new FcmService();

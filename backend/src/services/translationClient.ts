import { env } from "../config/env.js";

export class TranslationClient {
  private baseUrl: string;

  constructor(baseUrl: string = env.translationServiceUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async getVocabulary(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/vocabulary`);
    if (!res.ok) throw new Error(`Translation service error: ${res.status}`);
    return res.json();
  }

  async voiceToSign(payload: {
    text?: string;
    audio_base64?: string;
    sign_language?: string;
    fps?: number;
    encode_video?: boolean;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/translate/voice-to-sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Voice-to-Sign failed (${res.status}): ${errText}`);
    }
    return res.json();
  }

  async signToVoice(payload: {
    pose_sequence?: any[];
    video_base64?: string;
    gloss_hint?: string;
    pitch?: number;
    speed?: number;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/translate/sign-to-voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Sign-to-Voice failed (${res.status}): ${errText}`);
    }
    return res.json();
  }
}

export const translationClient = new TranslationClient();

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TtsPlaybackOptions {
  audioWavBase64?: string | null;
  voiceName?: string;
  pitch?: number;
  speed?: number;
  fetchIfMissing?: boolean;
}

let sharedAudioCtx: AudioContext | null = null;
let activeHtmlAudio: HTMLAudioElement | null = null;
const clientWavCache = new Map<string, string>();

function getOrCreateAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  return sharedAudioCtx;
}

export function unlockAudioPlayback(): void {
  const ctx = getOrCreateAudioCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore browser speechSynthesis lock errors
    }
  }
}

export function decodeBase64AudioToArrayBuffer(base64: string): ArrayBuffer {
  const cleanB64 = String(base64).replace(/^data:audio\/[\w+;=-]+;base64,/, "");
  const binary = window.atob(cleanB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function fetchTtsWav(
  text: string,
  options?: Pick<TtsPlaybackOptions, "voiceName" | "pitch" | "speed">
): Promise<string | null> {
  const clean = text.trim();
  if (!clean) return null;

  const voiceName = options?.voiceName || "Kore";
  const cacheKey = `${voiceName}:${clean}`;
  const cached = clientWavCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch("/api/translate/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        voiceSettings: {
          voiceName,
          pitch: options?.pitch || 1.0,
          speed: options?.speed || 1.0,
        },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const wav = data?.audioWavBase64 ? String(data.audioWavBase64) : null;
    if (wav) {
      if (clientWavCache.size >= 30) {
        const oldestKey = clientWavCache.keys().next().value;
        if (oldestKey) clientWavCache.delete(oldestKey);
      }
      clientWavCache.set(cacheKey, wav);
    }
    return wav;
  } catch {
    return null;
  }
}

export async function playWavAudio(
  audioWavBase64?: string | null,
  speed = 1.0
): Promise<boolean> {
  if (!audioWavBase64 || typeof window === "undefined") return false;
  const cleanB64 = String(audioWavBase64).replace(/^data:audio\/[\w+;=-]+;base64,/, "");
  if (!cleanB64) return false;

  const playbackRate = Math.min(1.8, Math.max(0.6, Number(speed) || 1.0));

  try {
    if (activeHtmlAudio) {
      activeHtmlAudio.pause();
      activeHtmlAudio = null;
    }
    const audio = new Audio(`data:audio/wav;base64,${cleanB64}`);
    audio.playbackRate = playbackRate;
    activeHtmlAudio = audio;
    audio.onended = () => {
      if (activeHtmlAudio === audio) activeHtmlAudio = null;
    };
    await audio.play();
    return true;
  } catch {
    // Fallback to shared Web AudioContext if <audio> element play was blocked
  }

  const ctx = getOrCreateAudioCtx();
  if (ctx) {
    try {
      if (ctx.state === "suspended") await ctx.resume();
      if (ctx.state !== "running") return false;
      const buffer = await ctx.decodeAudioData(decodeBase64AudioToArrayBuffer(cleanB64));
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = playbackRate;
      src.connect(ctx.destination);
      src.start();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function speakViaWebSpeech(
  text: string,
  options?: Pick<TtsPlaybackOptions, "voiceName" | "pitch" | "speed">
): boolean {
  const clean = text.trim();
  if (!clean || typeof window === "undefined" || !window.speechSynthesis) return false;

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.pitch = Number(options?.pitch) || 1.0;
    utterance.rate = Number(options?.speed) || 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preset = (options?.voiceName || "").toLowerCase();
    const matched = voices.find((v) =>
      preset.includes("female")
        ? /female|zira|samantha|aria|victoria|google us english/i.test(v.name)
        : /male|david|mark|alex|daniel/i.test(v.name)
    );
    if (matched) utterance.voice = matched;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export async function playWavOrSpeech(
  text: string,
  options: TtsPlaybackOptions = {}
): Promise<{ played: boolean; audioWavBase64: string | null }> {
  const clean = text.trim();
  if (!clean) return { played: false, audioWavBase64: null };

  let wav = options.audioWavBase64 || null;
  if (!wav && options.fetchIfMissing !== false) {
    wav = await fetchTtsWav(clean, options);
  }

  if (wav) {
    const played = await playWavAudio(wav, options.speed);
    if (played) return { played: true, audioWavBase64: wav };
  }

  const spoke = speakViaWebSpeech(clean, options);
  return { played: spoke, audioWavBase64: wav };
}

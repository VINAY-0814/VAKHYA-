/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Camera, RefreshCw, Volume2, Sparkles, HelpCircle, CornerDownLeft, AlertCircle, Play } from "lucide-react";
import { UserProfile, SignLanguage } from "../types";
import { theme } from "../theme";
import {
  downsampleFrames,
  drawRealHandSkeleton,
  GestureBoundaryTracker,
  initSignLandmarkers,
  PoseKeyframe,
  WebcamSignTracker,
} from "../services/webcamSignTracker";
import { playWavOrSpeech, unlockAudioPlayback } from "../services/ttsPlayer";

interface SignToSpeechProps {
  profile: UserProfile;
}

const COMMON_SIGNS = [
  { gloss: "HELLO", label: "👋 Hello" },
  { gloss: "THANK YOU", label: "🙏 Thank You" },
  { gloss: "EMERGENCY ROAD ACCIDENT NEED HELP", label: "🚨 Accident Help" },
  { gloss: "DOCTOR CHIEFS HOSPITAL", label: "🩺 Doctor/Hospital" },
  { gloss: "ME HOME GO TOMORROW", label: "🏡 Going Home" },
  { gloss: "YOU NAME WHAT", label: "❓ What's your name?" },
];

export default function SignToSpeech({ profile }: SignToSpeechProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentGlosses, setCurrentGlosses] = useState<string>("");
  const [translatedSentence, setTranslatedSentence] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [activeSignLang, setActiveSignLang] = useState<string>(
    profile.primarySignLanguage || "ISL"
  );
  const [interimGlossStream, setInterimGlossStream] = useState<string[]>([]);
  const [clarificationPrompt, setClarificationPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const isCameraActiveRef = useRef(false);
  const trackerRef = useRef<WebcamSignTracker | null>(null);
  const boundaryRef = useRef<GestureBoundaryTracker>(new GestureBoundaryTracker());
  const lastAutoInferRef = useRef<number>(0);
  const recentSentencesRef = useRef<string[]>([]);
  const pendingGlossStreamRef = useRef<string[]>([]);
  const lastSentRef = useRef<{ sentence: string; ts: number }>({ sentence: "", ts: 0 });
  const activeSignLangRef = useRef<string>(activeSignLang);
  activeSignLangRef.current = activeSignLang;

  // Toggle Camera
  useEffect(() => {
    isCameraActiveRef.current = isCameraActive;
    if (isCameraActive) {
      initSignLandmarkers().catch(() => null);
      if (!trackerRef.current) trackerRef.current = new WebcamSignTracker();
      boundaryRef.current.reset();
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          drawSkeletalTracking();
        })
        .catch(() => {
          setError("Failed to access camera. Please verify camera permissions.");
          setIsCameraActive(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      boundaryRef.current.reset();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isCameraActive]);

  const inferPoseBuffer = async (
    poses: PoseKeyframe[],
    framesBase64: string[],
    handSummary: string,
    phraseBoundary: boolean
  ) => {
    if (poses.length < 4 || framesBase64.length === 0 || isTranslating) return;
    setIsTranslating(true);
    setError(null);
    try {
      const response = await fetch("/api/translate/pose-to-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pose_sequence: poses.slice(-20),
          frames_base64: downsampleFrames(framesBase64, 6),
          hand_summary: handSummary,
          signLanguage: activeSignLangRef.current || "ISL",
          continuousMode: true,
          phraseBoundary,
          pendingGlossStream: pendingGlossStreamRef.current,
          recentContext: recentSentencesRef.current.slice(-3),
          voicePreset: profile.voiceSettings.voiceName,
          pitch: profile.voiceSettings.pitch,
          speed: profile.voiceSettings.speed,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sign-to-voice recognition failed");

      if (data.isInterim && Array.isArray(data.pendingGlossStream)) {
        pendingGlossStreamRef.current = data.pendingGlossStream;
        setInterimGlossStream(data.pendingGlossStream);
        setCurrentGlosses(data.pendingGlossStream.join(" "));
        setClarificationPrompt(null);
        return;
      }

      if (data.isUnknown || data.status === "unknown" || data.needsClarification) {
        pendingGlossStreamRef.current = [];
        setInterimGlossStream([]);
        setClarificationPrompt(
          data.clarificationPrompt ||
            (data.isUnknown
              ? "Unknown sign — gesture could not be matched with high confidence. Please sign clearly."
              : "Sign was unclear — please keep both hands and face in frame and sign slightly slower.")
        );
        return;
      }

      if (data.recognized === false) return;
      pendingGlossStreamRef.current = [];
      setInterimGlossStream([]);
      setClarificationPrompt(null);

      if (data.gloss) setCurrentGlosses(data.gloss);
      if (data.sentence) {
        const now = Date.now();
        const isDup =
          lastSentRef.current.sentence.toLowerCase() === String(data.sentence).toLowerCase() &&
          now - lastSentRef.current.ts < 5000;
        if (isDup) return;
        lastSentRef.current = { sentence: data.sentence, ts: now };
        recentSentencesRef.current = [
          ...recentSentencesRef.current.slice(-3),
          String(data.sentence),
        ];
        setTranslatedSentence(data.sentence);
        setConfidence(data.confidence ?? 0.88);
        playTranslatedAudio(data.sentence, data.audioWavBase64);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  // Real-time MediaPipe Hands + Face + Pose tracking with anti-repeat boundary state machine
  const drawSkeletalTracking = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameCounter = 0;

    const render = () => {
      if (!isCameraActiveRef.current) return;
      frameCounter++;

      const targetW = canvas.parentElement?.clientWidth || 640;
      const targetH = canvas.parentElement?.clientHeight || 480;
      if (canvas.width !== targetW) canvas.width = targetW;
      if (canvas.height !== targetH) canvas.height = targetH;

      if (trackerRef.current && video.readyState >= 2) {
        const detection = trackerRef.current.detectFrame(video, true);
        drawRealHandSkeleton(ctx, canvas.width, canvas.height, detection, true);

        if (frameCounter % 3 === 0) {
          const now = Date.now();
          const event = boundaryRef.current.step(
            detection,
            () => (trackerRef.current ? trackerRef.current.captureCompactFrame(video, true) : null),
            now
          );
          if (event?.shouldDispatch && now - lastAutoInferRef.current > 1500) {
            lastAutoInferRef.current = now;
            void inferPoseBuffer(
              event.poses,
              event.snaps,
              event.handSummary,
              event.phraseBoundary
            );
          }
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();
  };

  // Convert Sign Gloss Sequence -> Spoken Vocals & Text captions
  const handleTranslateSign = async (explicitGloss?: string) => {
    const glossSequence = explicitGloss || currentGlosses;
    if (!glossSequence.trim()) return;

    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch("/api/translate/gloss-to-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          glosses: glossSequence,
          signLanguage: profile.primarySignLanguage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to parse sign glosses");
      }

      setTranslatedSentence(data.sentence);
      setConfidence(data.confidence);

      // Fire Text-to-Speech vocal output auto-modulated!
      playTranslatedAudio(data.sentence, data.audioWavBase64);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const playTranslatedAudio = (text: string, audioWavBase64?: string | null) => {
    unlockAudioPlayback();
    void playWavOrSpeech(text, {
      audioWavBase64,
      fetchIfMissing: true,
      voiceName: profile.voiceSettings.voiceName,
      pitch: profile.voiceSettings.pitch,
      speed: profile.voiceSettings.speed,
    });
  };

  // Trigger Gemini TTS WAV with browser Web Speech fallback
  const triggerVoiceSynthesizer = (text: string) => {
    playTranslatedAudio(text, null);
  };

  const handleSelectPrebuilt = (gloss: string) => {
    setCurrentGlosses(gloss);
    handleTranslateSign(gloss);
  };

  return (
    <div id="sign-to-speech-section" className="space-y-6">
      <div className="flex justify-between items-center bg-[var(--button-glass-bg)] border border-[var(--border-subtle)] p-4 rounded-2xl">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase">
            Sign Translation Engine
          </span>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Sign-to-Speech & Captions</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] rounded-xl p-0.5 text-xs">
            {(["ISL", "ASL"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveSignLang(lang)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  activeSignLang === lang
                    ? "bg-[#8A5CF6] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
          <button
            id="camera-active-toggle"
            onClick={() => setIsCameraActive(!isCameraActive)}
            className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-colors cursor-pointer ${
              isCameraActive
                ? "bg-red-500/20 border-red-500/30 text-red-600 dark:text-red-200"
                : "bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] border-transparent text-white"
            }`}
          >
            <Camera className="w-4 h-4" />
            {isCameraActive ? "Deactivate Camera" : "Activate Sign-Cam"}
          </button>
        </div>
      </div>

      {interimGlossStream.length > 0 && (
        <div className="p-3.5 bg-[#9E7BFF]/15 border border-[#9E7BFF]/35 rounded-xl text-xs font-mono text-[#E2D6FF]">
          <strong>Continuous gloss stream:</strong> {interimGlossStream.join(" → ")} …
        </div>
      )}

      {clarificationPrompt && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/35 rounded-xl flex items-center justify-between gap-3 text-amber-700 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
            <span>
              <strong>Clarification requested:</strong> {clarificationPrompt}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setClarificationPrompt(null)}
            className="text-amber-600 dark:text-amber-300 underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 dark:bg-red-500/20 border border-red-500/40 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-200 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main split: Camera feedback vs Translator controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Dynamic camera Feed overlay with simulated MediaPipe bones */}
        <div className={`lg:col-span-7 ${theme.styles.glassDark} overflow-hidden min-h-[380px] flex items-center justify-center relative rounded-3xl border border-[var(--border-subtle)]`}>
          {isCameraActive ? (
            <div className="absolute inset-0 w-full h-full">
              <video
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />
            </div>
          ) : (
            <div className="text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[var(--button-glass-bg)] flex items-center justify-center mx-auto border border-[var(--border-subtle)] animate-pulse">
                <Camera className="w-8 h-8 text-[var(--text-secondary)]/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Camera Stream Inactive</p>
                <p className="text-xs text-[var(--text-secondary)]/60 mt-1 max-w-xs mx-auto">
                  Click 'Activate Sign-Cam' to initialize real-time MediaPipe hand and posture skeletal tracking.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Translation input & Gloss sequencing */}
        <div className="lg:col-span-5 space-y-6">
          {/* Preset Sign Glosses for immediate validation & demonstration */}
          <div className={`p-5 ${theme.styles.glassLight} space-y-4 rounded-3xl border border-[var(--border-subtle)]`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider">
                Interactive Gestures Simulator
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]/50 font-mono">Click to execute gesture</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {COMMON_SIGNS.map((item) => (
                <button
                  key={item.gloss}
                  id={`sign-preset-${item.gloss.slice(0, 5)}`}
                  onClick={() => handleSelectPrebuilt(item.gloss)}
                  className="p-3 bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] hover:border-[#D96FF2]/40 hover:shadow-[0_0_15px_rgba(217,111,242,0.15)] rounded-xl text-left hover:bg-[var(--glass-input-bg-focus)] transition-all text-xs cursor-pointer"
                >
                  <div className="font-bold text-[var(--text-primary)]/95">{item.label}</div>
                  <div className="text-[9px] font-mono text-[var(--color-accent-violet)] mt-1 select-all">{item.gloss}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Gloss Input */}
          <div className={`p-5 ${theme.styles.glassLight} space-y-4 rounded-3xl border border-[var(--border-subtle)]`}>
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider block">
                Continuous Sign Gloss Entry
              </label>
              <HelpCircle className="w-4 h-4 text-[var(--text-secondary)]/30" />
            </div>

            <div className="relative">
              <input
                id="glosses-text-input"
                type="text"
                placeholder="Enter glosses (e.g., EMERGENCY HOSPITAL GO)"
                value={currentGlosses}
                onChange={(e) => setCurrentGlosses(e.target.value.toUpperCase())}
                className={`w-full h-12 px-4 rounded-xl font-mono uppercase tracking-wider ${theme.styles.glassInput}`}
              />
              <button
                id="custom-gloss-translate-btn"
                onClick={() => handleTranslateSign()}
                disabled={isTranslating || !currentGlosses.trim()}
                className="absolute right-2 top-2 h-8 w-8 bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] rounded-lg flex items-center justify-center text-white hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-purple-500/20 cursor-pointer"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)]/40 leading-normal font-mono">
              Use standard CAPITALIZED gloss nouns/verbs. Grammatical structures are corrected down-stream via the Gemini LLM engine.
            </p>
          </div>
        </div>
      </div>

      {/* Subtitles & spoken translation card */}
      {(translatedSentence || isTranslating) && (
        <motion.div
          id="translated-sentence-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 ${theme.styles.glassDark} relative overflow-hidden flex flex-col md:flex-row gap-6 items-center justify-between rounded-3xl border border-[var(--border-subtle)]`}
        >
          <div className="space-y-2 flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="w-4 h-4 text-[#D96FF2] animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase">
                Gemini NLP Grammatical Correct Output
              </span>
              {confidence && (
                <span className="text-[9px] font-mono bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded border border-green-500/30">
                  Confidence: {(confidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
            {isTranslating ? (
              <div className="flex gap-1.5 h-6 items-center justify-center md:justify-start">
                <span className="w-2 h-2 bg-[#D96FF2] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-[#C9A9E9] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-[#8A5CF6] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            ) : (
              <p className="text-xl font-bold tracking-tight text-[var(--text-primary)] leading-relaxed">
                "{translatedSentence}"
              </p>
            )}
          </div>

          {!isTranslating && (
            <button
              id="tts-replay-btn"
              onClick={() => triggerVoiceSynthesizer(translatedSentence)}
              className="flex-shrink-0 h-12 px-5 rounded-xl bg-[var(--button-glass-bg)] hover:bg-[var(--button-glass-bg-hover)] border border-[var(--border-subtle)] flex items-center gap-2.5 text-xs text-[var(--text-primary)] transition-all font-semibold active:scale-95 cursor-pointer"
            >
              <Volume2 className="w-4.5 h-4.5 text-purple-600 dark:text-purple-300" />
              Replay Spoken Vocals
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

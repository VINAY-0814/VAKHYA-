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
  drawRealHandSkeleton,
  initHandLandmarker,
  PoseKeyframe,
  WebcamSignTracker,
} from "../services/webcamSignTracker";

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
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isCameraActiveRef = useRef(false);
  const trackerRef = useRef<WebcamSignTracker | null>(null);
  const poseBufferRef = useRef<PoseKeyframe[]>([]);
  const lastAutoInferRef = useRef<number>(0);

  // Toggle Camera
  useEffect(() => {
    isCameraActiveRef.current = isCameraActive;
    if (isCameraActive) {
      initHandLandmarker().catch(() => null);
      if (!trackerRef.current) trackerRef.current = new WebcamSignTracker();
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
      poseBufferRef.current = [];
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isCameraActive]);

  const inferPoseBuffer = async (poses: PoseKeyframe[]) => {
    if (poses.length < 4 || isTranslating) return;
    setIsTranslating(true);
    setError(null);
    try {
      const response = await fetch("/api/translate/pose-to-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pose_sequence: poses.slice(-18),
          pitch: profile.voiceSettings.pitch,
          speed: profile.voiceSettings.speed,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sign-to-voice recognition failed");
      if (data.gloss) setCurrentGlosses(data.gloss);
      if (data.sentence) {
        setTranslatedSentence(data.sentence);
        setConfidence(data.confidence ?? 0.85);
        playTranslatedAudio(data.sentence, data.audioWavBase64);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  // Real-time MediaPipe + Computer Vision hand landmark tracking loop
  const drawSkeletalTracking = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 640;
    canvas.height = canvas.parentElement?.clientHeight || 480;

    let frameCounter = 0;

    const render = () => {
      if (!isCameraActiveRef.current) return;
      frameCounter++;

      if (trackerRef.current && video.readyState >= 2) {
        const detection = trackerRef.current.detectFrame(video);
        drawRealHandSkeleton(ctx, canvas.width, canvas.height, detection, true);

        if (detection.hasActiveHands && frameCounter % 3 === 0) {
          poseBufferRef.current.push(detection.poseFrame);
          if (poseBufferRef.current.length > 24) {
            poseBufferRef.current.shift();
          }

          const now = Date.now();
          if (poseBufferRef.current.length >= 12 && now - lastAutoInferRef.current > 3200) {
            lastAutoInferRef.current = now;
            const snapshot = [...poseBufferRef.current];
            poseBufferRef.current = [];
            void inferPoseBuffer(snapshot);
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
    if (window.speechSynthesis) {
      triggerVoiceSynthesizer(text);
      return;
    }
    if (audioWavBase64) {
      const audio = new Audio(`data:audio/wav;base64,${audioWavBase64}`);
      audio.play().catch(() => {});
    }
  };

  // Trigger browser Audio Context Text-To-Speech with voice presets modulation
  const triggerVoiceSynthesizer = (text: string) => {
    if (!window.speechSynthesis) {
      fetch("/api/translate/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceSettings: profile.voiceSettings }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.audioWavBase64) {
            const audio = new Audio(`data:audio/wav;base64,${d.audioWavBase64}`);
            audio.play().catch(() => {});
          }
        })
        .catch(() => {});
      return;
    }

    // Stop current synthesis
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Apply Vakhya pitch, speed, and accent tokens
    utterance.pitch = profile.voiceSettings.pitch;
    utterance.rate = profile.voiceSettings.speed;

    // Try to match a clean localized voice preset
    const voices = window.speechSynthesis.getVoices();
    const desiredName = profile.voiceSettings.voiceName.toLowerCase();
    const matchedVoice = voices.find((v) => v.name.toLowerCase().includes(desiredName));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    // High quality Web Audio visualizer flash effect
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    window.speechSynthesis.speak(utterance);
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
        <div className="flex gap-2">
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

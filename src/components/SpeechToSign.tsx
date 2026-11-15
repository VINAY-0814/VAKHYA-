/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Mic, MicOff, Send, HelpCircle, Sliders, Volume2, Accessibility, ShieldCheck, AlertCircle, Square, Trash2, Play, Sparkles } from "lucide-react";
import { UserProfile, SignLanguage } from "../types";
import { theme } from "../theme";
import { MediaPipeAvatar } from "./MediaPipeAvatar";
import { playWavOrSpeech, unlockAudioPlayback } from "../services/ttsPlayer";

interface SpeechToSignProps {
  profile: UserProfile;
}

// Coordinate sequences for Avatar Signs (Left & Right Hands joints relative positions)
// Format: Array of joint coordinate multipliers [rx, ry, lx, ly]
const GESTURE_COORDS: Record<string, Array<[number, number, number, number]>> = {
  HELLO: [
    [60, -20, -60, 40], // wave 1
    [80, -40, -60, 40], // wave 2
    [60, -20, -60, 40], // wave 3
    [0, 50, 0, 50],     // idle rest
  ],
  "THANK YOU": [
    [0, -60, 0, 50],   // fingers to chin
    [30, 20, 0, 50],   // move forward and down (outward hand arch)
    [50, 40, 0, 50],
    [0, 50, 0, 50],    // rest
  ],
  EMERGENCY: [
    [30, -30, -30, -30], // cross chest fast
    [-30, -10, 30, -10],
    [30, -30, -30, -30],
    [0, 50, 0, 50],      // rest
  ],
  DOCTOR: [
    [10, -50, -40, -10], // hand taps wrist
    [10, -30, -40, -10],
    [10, -50, -40, -10],
    [0, 50, 0, 50],
  ],
  GO: [
    [-40, 10, -40, 10], // point out
    [50, -30, 50, -30],
    [70, -40, 70, -40],
    [0, 50, 0, 50],
  ],
  DEFAULT: [
    [0, 50, 0, 50],
  ],
};

export default function SpeechToSign({ profile }: SpeechToSignProps) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [glossSequence, setGlossSequence] = useState("");
  const [poseSequence, setPoseSequence] = useState<any[]>([]);
  const [markers, setMarkers] = useState({ eyebrows: "neutral", mouth: "idle", headTilt: "none" });
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [avatarSpeed, setAvatarSpeed] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarAnimationRef = useRef<number | null>(null);

  const [recognition, setRecognition] = useState<any>(null);

  // MediaRecorder API audio capture states
  const [recorderState, setRecorderState] = useState<"idle" | "recording" | "stopped" | "translating">("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcribedText, setTranscribedText] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Audio visualizer wave canvas and context refs
  const canvasVisualizerRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Real-time Audio Spectrum Draw Loop
  const drawLiveMicrophoneWave = () => {
    const canvas = canvasVisualizerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    if (!ctx || !analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderWave = () => {
      if (!canvasVisualizerRef.current) return;
      animationFrameRef.current = requestAnimationFrame(renderWave);

      analyser.getByteTimeDomainData(dataArray);

      // Clean canvas with slightly transparent dark slate background to leave trails
      ctx.fillStyle = "rgba(20, 15, 38, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 3;
      // Beautiful violet and magenta interactive gradient matching Vakhya UI
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "#8A5CF6");
      gradient.addColorStop(0.5, "#D96FF2");
      gradient.addColorStop(1, "#8A5CF6");
      ctx.strokeStyle = gradient;

      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    renderWave();
  };

  const startAudioCapture = async () => {
    try {
      setError(null);
      setAudioUrl(null);
      setTranscribedText("");
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Web Audio API analyser Node
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setRecorderState("recording");
      
      // Delay visualizer setup slightly to ensure canvas is rendered
      setTimeout(() => {
        const canvas = canvasVisualizerRef.current;
        if (canvas) {
          canvas.width = canvas.parentElement?.clientWidth || 320;
          canvas.height = 64;
          drawLiveMicrophoneWave();
        }
      }, 50);

      // Select supported audio codecs gracefully
      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" };
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        options = { mimeType: "audio/ogg" };
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setRecorderState("stopped");

        // Release resources safely
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
        }
      };

      recorder.start(10);
    } catch (err: any) {
      console.error("Audio capture failed:", err);
      setError("Failed to access microphone hardware. Please verify system permissions.");
      setRecorderState("idle");
    }
  };

  const stopAudioCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const resetAudioCapture = () => {
    stopAudioCapture();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setAudioUrl(null);
    setTranscribedText("");
    setRecorderState("idle");
    audioChunksRef.current = [];
  };

  const translateRecordedAudio = async () => {
    if (!audioChunksRef.current.length) return;
    
    setRecorderState("translating");
    setError(null);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || "audio/webm" });
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        try {
          const response = await fetch("/api/translate/audio-to-gloss", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Audio,
              mimeType: audioBlob.type,
              signLanguage: profile.primarySignLanguage,
              spokenLanguage: profile.spokenLanguage,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed speech analysis translation");
          }

          setTranscribedText(data.text);
          setInputText(data.text);
          setGlossSequence(data.glosses);
          setPoseSequence(Array.isArray(data.pose_sequence) ? data.pose_sequence : []);
          setMarkers(data.markers);

          // Trigger sequential avatar signing animations
          triggerAvatarSigningSequence(data.animations);
          setRecorderState("stopped");
        } catch (err: any) {
          setError(err.message);
          setRecorderState("stopped");
        }
      };
    } catch (err: any) {
      setError("Failed to compile audio chunks. Please record again.");
      setRecorderState("stopped");
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = profile.spokenLanguage === "Hindi" ? "hi-IN" : "en-US";

      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setInputText(text);
        handleTranslateSpeech(text);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (err: any) => {
        console.error("Mic speech recognition error", err);
        setError("Microphone recognition failed or timed out.");
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [profile.spokenLanguage]);

  // Main Avatar Animation Loop (delegated to MediaPipeAvatar component)
  useEffect(() => {
    // MediaPipeAvatar renders the interactive 3D model automatically
  }, [isAnimating, activeWordIndex, markers, avatarSpeed]);

  const toggleMicListening = () => {
    if (!recognition) {
      setError("Speech recognition is not fully supported in this browser engine.");
      return;
    }
    setError(null);
    if (isListening) {
      recognition.stop();
    } else {
      setIsListening(true);
      recognition.start();
    }
  };

  const handleTranslateSpeech = async (textOverride?: string) => {
    const query = textOverride || inputText;
    if (!query.trim()) return;

    setError(null);
    setIsProcessing(true);
    try {
      const response = await fetch("/api/translate/sentence-to-gloss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: query,
          signLanguage: profile.primarySignLanguage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed speech parsing");
      }

      setGlossSequence(data.glosses);
      setPoseSequence(Array.isArray(data.pose_sequence) ? data.pose_sequence : []);
      setMarkers(data.markers);

      // Trigger sequential avatar signing animations
      triggerAvatarSigningSequence(data.animations);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerAvatarSigningSequence = async (animations: string[]) => {
    if (!animations || animations.length === 0) return;

    setIsAnimating(true);
    for (let i = 0; i < animations.length; i++) {
      setActiveWordIndex(i);
      // Wait for word signing animation duration based on speed
      const duration = 1200 / avatarSpeed;
      await new Promise((resolve) => setTimeout(resolve, duration));
    }
    setIsAnimating(false);
    setActiveWordIndex(-1);
  };

  // High-Fidelity 3D vector avatar skeleton drawing
  const draw3DAvatar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 640;
    canvas.height = canvas.parentElement?.clientHeight || 480;

    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.4;
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Simple grid background for "Tech-rig" aesthetic
      ctx.strokeStyle = "rgba(138, 92, 246, 0.05)";
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // 1. Idle breathing/tilting offset math
      const breathing = Math.sin(frame * 0.03) * 3;
      const headOffset = Math.sin(frame * 0.02) * 1.5;

      // 2. Draw Avatar Body Torso (3D wireframe mesh style)
      ctx.strokeStyle = "rgba(201, 169, 233, 0.2)";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(3E, 2C, 64, 0.3)";

      ctx.beginPath();
      // Shoulders
      ctx.moveTo(centerX - 100, centerY + 120 + breathing);
      ctx.lineTo(centerX + 100, centerY + 120 + breathing);
      // Chest outline
      ctx.lineTo(centerX + 60, centerY + 240);
      ctx.lineTo(centerX - 60, centerY + 240);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3. Draw Neck
      ctx.strokeStyle = "#C9A9E9";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY + 45);
      ctx.lineTo(centerX, centerY + 100 + breathing * 0.5);
      ctx.stroke();

      // 4. Draw Face mesh base and morph controls
      const faceY = centerY - 10 + breathing * 0.5;
      ctx.fillStyle = "#1E1435";
      ctx.strokeStyle = "#8A5CF6";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX + headOffset, faceY, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw Eyebrows (Morphs based on non-manual markers!)
      ctx.strokeStyle = "#C9A9E9";
      ctx.lineWidth = 3;
      const eyebrowY = faceY - 12;

      if (markers.eyebrows === "down") {
        // Furrowed / Question eyebrows
        ctx.beginPath();
        ctx.moveTo(centerX - 28 + headOffset, eyebrowY + 5);
        ctx.lineTo(centerX - 8 + headOffset, eyebrowY + 10);
        ctx.moveTo(centerX + 8 + headOffset, eyebrowY + 10);
        ctx.lineTo(centerX + 28 + headOffset, eyebrowY + 5);
        ctx.stroke();
      } else if (markers.eyebrows === "up") {
        // Expressive / Surprised eyebrows
        ctx.beginPath();
        ctx.moveTo(centerX - 28 + headOffset, eyebrowY - 5);
        ctx.arc(centerX - 18 + headOffset, eyebrowY - 5, 8, Math.PI, 0, false);
        ctx.moveTo(centerX + 10 + headOffset, eyebrowY - 5);
        ctx.arc(centerX + 20 + headOffset, eyebrowY - 5, 8, Math.PI, 0, false);
        ctx.stroke();
      } else {
        // Neutral eyebrows
        ctx.beginPath();
        ctx.moveTo(centerX - 28 + headOffset, eyebrowY);
        ctx.lineTo(centerX - 10 + headOffset, eyebrowY);
        ctx.moveTo(centerX + 10 + headOffset, eyebrowY);
        ctx.lineTo(centerX + 28 + headOffset, eyebrowY);
        ctx.stroke();
      }

      // Eyes (Blinking animation)
      ctx.fillStyle = "#D96FF2";
      const eyeBlink = frame % 180 < 10; // Blink every 3 seconds
      if (eyeBlink) {
        ctx.strokeStyle = "#D96FF2";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(centerX - 24 + headOffset, faceY);
        ctx.lineTo(centerX - 12 + headOffset, faceY);
        ctx.moveTo(centerX + 12 + headOffset, faceY);
        ctx.lineTo(centerX + 24 + headOffset, faceY);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(centerX - 18 + headOffset, faceY, 4.5, 0, Math.PI * 2);
        ctx.arc(centerX + 18 + headOffset, faceY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouth Morphs (Speaking/Muttering simulation)
      ctx.strokeStyle = "#D96FF2";
      ctx.lineWidth = 2.5;
      const mouthY = faceY + 18;
      const mOffset = Math.sin(frame * 0.15) * 4;

      ctx.beginPath();
      if (isAnimating) {
        // MUTTERING open/closed speak animation
        ctx.arc(centerX + headOffset, mouthY, 6 + Math.abs(mOffset), 0, Math.PI, false);
      } else if (markers.mouth === "smile") {
        ctx.arc(centerX + headOffset, mouthY - 4, 12, 0.1, Math.PI - 0.1, false);
      } else {
        // Idle flat lip
        ctx.moveTo(centerX - 12 + headOffset, mouthY);
        ctx.lineTo(centerX + 12 + headOffset, mouthY);
      }
      ctx.stroke();

      // 5. DRAW ACTIVE ARMS & SKELETAL SIGN GESTURES
      let rx = centerX + 120;
      let ry = centerY + 180 + breathing;
      let lx = centerX - 120;
      let ly = centerY + 180 + breathing;

      // Handle custom gesture positioning based on active animating word glosses
      if (isAnimating && activeWordIndex !== -1) {
        const wordsList = glossSequence.toUpperCase().replace(/[.,]/g, "").split(" ");
        const activeGloss = wordsList[activeWordIndex] || "DEFAULT";
        const coordsList = GESTURE_COORDS[activeGloss] || GESTURE_COORDS.DEFAULT;

        // Choose frame of coordinates list based on time interpolation
        const coordIdx = Math.floor((frame * 0.08) % coordsList.length);
        const [targetRx, targetRy, targetLx, targetLy] = coordsList[coordIdx] || [0, 50, 0, 50];

        rx = centerX + 100 + targetRx;
        ry = centerY + 100 + targetRy;
        lx = centerX - 100 + targetLx;
        ly = centerY + 100 + targetLy;
      }

      // Draw arm joints (Shoulder -> Elbow -> Wrist)
      const drawArm = (shoulderX: number, shoulderY: number, handX: number, handY: number, isRight: boolean) => {
        // Calculate mid-joint Elbow position (using simple geometric bend)
        const elbowX = (shoulderX + handX) / 2 + (isRight ? 35 : -35);
        const elbowY = (shoulderY + handY) / 2 + 25;

        // Shoulder to Elbow link
        ctx.strokeStyle = "rgba(138, 92, 246, 0.75)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(handX, handY);
        ctx.stroke();

        // Elbow joint dot
        ctx.fillStyle = "#8A5CF6";
        ctx.beginPath(); ctx.arc(elbowX, elbowY, 5, 0, Math.PI * 2); ctx.fill();

        // 21-point custom fingers structure drawing on Wrist/Hand
        ctx.fillStyle = "#D96FF2";
        ctx.beginPath(); ctx.arc(handX, handY, 6, 0, Math.PI * 2); ctx.fill();

        // Mini fingers skeleton
        ctx.strokeStyle = "rgba(217, 111, 242, 0.6)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const fx = handX + Math.sin(frame * 0.05 + i + (isRight ? 1 : 2)) * 12 + (i - 2) * 5;
          const fy = handY - 15 - Math.cos(frame * 0.05 + i) * 8;
          ctx.beginPath();
          ctx.moveTo(handX, handY);
          ctx.lineTo(fx, fy);
          ctx.stroke();
          ctx.fillStyle = "#C9A9E9";
          ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
        }
      };

      // Right Arm (Hearing POV right side shoulder is local right)
      drawArm(centerX + 80, centerY + 120 + breathing, rx, ry, true);
      // Left Arm
      drawArm(centerX - 80, centerY + 120 + breathing, lx, ly, false);

      // HUD Status text
      ctx.fillStyle = "#D96FF2";
      ctx.font = "bold 9px JetBrains Mono, monospace";
      ctx.fillText("AVATAR SKELETAL GRAPHICS: ENGINE ACTIVE", 20, 30);
      ctx.fillText(`ANIMATION STATE: ${isAnimating ? "SIGNING..." : "IDLE_BREATHING"}`, 20, 45);

      avatarAnimationRef.current = requestAnimationFrame(render);
    };

    render();
  };

  return (
    <div id="speech-to-sign-section" className="space-y-6">
      <div className="flex justify-between items-center bg-[var(--button-glass-bg)] border border-[var(--border-subtle)] p-4 rounded-2xl">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase">
            Speech Synthesis Avatar
          </span>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Speech-to-Sign Avatar</h3>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-secondary)]/80 font-mono">Signing speed:</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={avatarSpeed}
              onChange={(e) => setAvatarSpeed(parseFloat(e.target.value))}
              className="w-20 accent-purple-400 cursor-pointer h-1"
            />
            <span className="text-xs font-mono font-bold text-[var(--color-accent-violet)]">{avatarSpeed.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 dark:bg-red-500/20 border border-red-500/40 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-200 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Speech Input controls */}
        <div className="lg:col-span-5 space-y-5">
          {/* Audio capture mic trigger */}
          <div className={`p-5 ${theme.styles.glassLight} space-y-4 rounded-3xl border border-[var(--border-subtle)]`}>
            <span className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider block">
              Continuous Mic capture
            </span>
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                {isListening && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full bg-red-500/25 border border-red-500/30"
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-red-500/15 border border-red-500/20"
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 0.6,
                      }}
                    />
                  </>
                )}
                <button
                  id="mic-listening-toggle"
                  onClick={toggleMicListening}
                  className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all cursor-pointer relative z-10 ${
                    isListening
                      ? "bg-red-500/20 border-red-500 text-red-600 dark:text-red-200"
                      : "bg-[#8A5CF6]/20 border-[#8A5CF6] text-purple-600 dark:text-[#C9A9E9] hover:bg-[#8A5CF6]/30"
                  }`}
                >
                  {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              </div>
              <div>
                <span className="text-xs font-bold block text-[var(--text-primary)]">
                  {isListening ? "Listening Stream Active..." : "Activate Voice Mic"}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]/70 block mt-0.5">
                  Translate continuous speech into standard sign gloss sequence.
                </span>
              </div>
            </div>
          </div>

          {/* AI Voice Signal Capture (MediaRecorder) */}
          <div className={`p-5 ${theme.styles.glassLight} space-y-4 rounded-3xl border border-[var(--border-subtle)] relative overflow-hidden`}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider block">
                AI Voice Signal Capture (MediaRecorder)
              </span>
              <span className="text-[9px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 font-bold uppercase tracking-wider">
                Full-fidelity Blob
              </span>
            </div>

            {recorderState === "idle" && (
              <div className="space-y-3">
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Record your direct physical voice stream. Our browser-side MediaRecorder engine compiles raw vocal packets for deep translation.
                </p>
                <div className="text-[10px] bg-purple-500/5 text-purple-600 dark:text-purple-300 font-semibold px-2.5 py-1 rounded-lg border border-purple-500/10 w-fit">
                  🎤 Spoken Processing Language: <span className="font-black uppercase tracking-wider">{profile.spokenLanguage || "English"}</span>
                </div>
                <button
                  id="media-recorder-start"
                  onClick={startAudioCapture}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 cursor-pointer ${theme.styles.buttonAccent}`}
                >
                  <Mic className="w-4 h-4 animate-pulse" />
                  Capture Voice Input
                </button>
              </div>
            )}

            {recorderState === "recording" && (
              <div className="space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono text-red-500 font-bold tracking-widest uppercase animate-pulse flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    Capturing {profile.spokenLanguage || "English"} Spoken Waves...
                  </span>
                  <button
                    id="media-recorder-stop"
                    onClick={stopAudioCapture}
                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-300 border border-red-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Square className="w-3 h-3" />
                    Stop Capture
                  </button>
                </div>

                {/* Flowing Web Audio Analyser Waveform */}
                <div className="w-full h-16 rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-base)]">
                  <canvas ref={canvasVisualizerRef} className="w-full h-full" />
                </div>
                <p className="text-[10px] text-[var(--text-secondary)]/80 text-center italic">
                  Speak clearly into your microphone device.
                </p>
              </div>
            )}

            {(recorderState === "stopped" || recorderState === "translating") && (
              <div className="space-y-4">
                <div className="p-3 bg-[var(--bg-base)] rounded-xl border border-[var(--border-subtle)] space-y-2">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] block uppercase tracking-wider">vocal packets ready</span>
                  
                  {/* Real Browser Audio Playback element */}
                  {audioUrl && (
                    <div className="flex items-center gap-2">
                      <audio src={audioUrl} controls className="w-full h-8 accent-purple-500" />
                    </div>
                  )}
                </div>

                {transcribedText && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1">
                    <span className="text-[9px] font-mono text-purple-600 dark:text-purple-300 block uppercase font-bold">Transcribed Translation:</span>
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed font-semibold">"{transcribedText}"</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    id="media-recorder-translate"
                    onClick={translateRecordedAudio}
                    disabled={recorderState === "translating"}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/10 hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {recorderState === "translating" ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Translating Voice...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Translate via Gemini</span>
                      </>
                    )}
                  </button>

                  <button
                    id="media-recorder-reset"
                    onClick={resetAudioCapture}
                    disabled={recorderState === "translating"}
                    className="p-2.5 bg-[var(--button-glass-bg)] hover:bg-[var(--button-glass-bg-hover)] border border-[var(--border-subtle)] rounded-xl text-red-500 transition-all disabled:opacity-50 cursor-pointer"
                    title="Delete Recording"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Text sentence typing box */}
          <div className={`p-5 ${theme.styles.glassLight} space-y-4 rounded-3xl border border-[var(--border-subtle)]`}>
            <label className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider block">
              Type spoken phrase
            </label>
            <div className="relative">
              <input
                id="speech-phrase-input"
                type="text"
                placeholder="e.g. Please help, there has been an emergency"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTranslateSpeech();
                }}
                className={`w-full h-12 pl-4 pr-20 rounded-xl text-sm font-medium ${theme.styles.glassInput}`}
              />
              <button
                type="button"
                onClick={() => {
                  if (!inputText.trim()) return;
                  unlockAudioPlayback();
                  void playWavOrSpeech(inputText.trim(), {
                    fetchIfMissing: true,
                    voiceName: profile.voiceSettings?.voiceName,
                    pitch: profile.voiceSettings?.pitch,
                    speed: profile.voiceSettings?.speed,
                  });
                }}
                disabled={!inputText.trim()}
                title="Read phrase aloud"
                className="absolute right-11 top-2 h-8 w-8 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/25 rounded-lg flex items-center justify-center text-purple-500 dark:text-purple-300 disabled:opacity-40 transition-all cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                id="text-phrase-send-btn"
                onClick={() => handleTranslateSpeech()}
                disabled={!inputText.trim()}
                className="absolute right-2 top-2 h-8 w-8 bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] rounded-lg flex items-center justify-center text-white disabled:opacity-50 hover:opacity-90 transition-all active:scale-95 shadow-md shadow-purple-500/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Quick interactive shortcut presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-[var(--text-secondary)]/50 block">Interactive Demonstration Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Hello",
                  "Thank you",
                  "Emergency! doctor help",
                  "I am going home",
                ].map((preset) => (
                  <button
                    key={preset}
                    id={`speech-preset-${preset.slice(0, 5)}`}
                    onClick={() => {
                      setInputText(preset);
                      handleTranslateSpeech(preset);
                    }}
                    className="px-2.5 py-1 rounded bg-[var(--button-glass-bg)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)]/80 hover:bg-[var(--button-glass-bg-hover)] hover:border-purple-500/30 transition-all cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: High Fidelity 3D Sign Language Avatar Rig */}
        <div className={`lg:col-span-7 ${theme.styles.glassDark} relative min-h-[460px] overflow-hidden flex flex-col justify-between rounded-3xl border border-[var(--border-subtle)]`}>
          
          {/* Active Word Gloss Highlights */}
          {glossSequence && (
            <div className="z-20 p-4 bg-[var(--button-glass-bg)] backdrop-blur-md border-b border-[var(--border-subtle)] flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-accent-violet)] font-bold mr-1">
                Active Gloss:
              </span>
              {glossSequence.split(" ").map((word, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono border tracking-wider transition-colors duration-200 ${
                    idx === activeWordIndex
                      ? "bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] text-white border-transparent scale-110 shadow"
                      : "bg-[var(--bg-base)] text-[var(--text-primary)] border-[var(--border-subtle)]"
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>
          )}

          {/* Interactive MediaPipe 3D avatar skeleton */}
          <MediaPipeAvatar
            isAnimating={isAnimating}
            activeWordIndex={activeWordIndex}
            glossSequence={glossSequence}
            poseSequence={poseSequence}
            markers={markers}
            avatarSpeed={avatarSpeed}
            onSpeedChange={setAvatarSpeed}
            profile={profile}
            isProcessing={isProcessing || recorderState === "translating"}
          />
        </div>
      </div>
    </div>
  );
}

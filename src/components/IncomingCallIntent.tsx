/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Phone,
  PhoneOff,
  Video,
  Smartphone,
  Bell,
  Volume2,
  VolumeX,
  Sliders,
  MessageSquare,
  Activity,
  Sparkles,
  ShieldAlert,
  Info,
  X,
  Zap,
  Hand
} from "lucide-react";
import { theme } from "../theme";

interface IncomingCallIntentProps {
  isOpen: boolean;
  contact: {
    id: string;
    name: string;
    avatar: string;
    phone: string;
    userType: string;
    statusText?: string;
  } | null;
  callType: "voice" | "video";
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallIntent({
  isOpen,
  contact,
  callType,
  onAccept,
  onDecline
}: IncomingCallIntentProps) {
  // Accessibility Presets
  const [vibrationPattern, setVibrationPattern] = useState<"standard" | "heartbeat" | "sos" | "rapid">("heartbeat");
  const [flashStyle, setFlashStyle] = useState<"purple" | "strobe" | "neon" | "none">("strobe");
  const [isVibratingActive, setIsVibratingActive] = useState(false);
  const [isMutedBuzz, setIsMutedBuzz] = useState(false);
  const [quickReplyStatus, setQuickReplyStatus] = useState<string | null>(null);

  // Vibration simulation cycle timer
  useEffect(() => {
    if (!isOpen || !contact) {
      setIsVibratingActive(false);
      return;
    }

    let active = true;
    let timeoutId: any = null;
    let audioCtx: AudioContext | null = null;

    const patternIntervals: Record<string, number[]> = {
      standard: [600, 600],
      heartbeat: [150, 150, 150, 650],
      sos: [100, 100, 100, 300, 300, 300, 100, 100, 100, 800],
      rapid: [80, 120]
    };

    const runPattern = () => {
      let step = 0;
      const intervals = patternIntervals[vibrationPattern] || patternIntervals.standard;

      const playStep = () => {
        if (!active) return;
        const duration = intervals[step % intervals.length];
        const isVibeOn = step % 2 === 0;

        setIsVibratingActive(isVibeOn);

        if (isVibeOn) {
          // Trigger actual browser vibration if available
          try {
            if (navigator.vibrate) {
              navigator.vibrate(duration);
            }
          } catch (e) {}

          // Generate synthetic physical hum audio representatively for a premium demo experience
          if (!isMutedBuzz) {
            try {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContextClass) {
                if (!audioCtx) {
                  audioCtx = new AudioContextClass();
                }
                if (audioCtx.state === "suspended") {
                  audioCtx.resume();
                }
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                
                // Mechanical low frequency buzz
                osc.type = "sine";
                osc.frequency.setValueAtTime(75, audioCtx.currentTime);
                
                gain.gain.setValueAtTime(0.0, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime + (duration / 1000) - 0.05);
                gain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + (duration / 1000));

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.start();
                osc.stop(audioCtx.currentTime + (duration / 1000));
              }
            } catch (err) {}
          }
        }

        step++;
        timeoutId = setTimeout(playStep, duration);
      };

      playStep();
    };

    runPattern();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [isOpen, contact, vibrationPattern, isMutedBuzz]);

  const handleSendQuickReply = (messageText: string, action: "accept" | "decline") => {
    setQuickReplyStatus(messageText);

    // Speak it out for the remote caller via Text-To-Speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`Quick Response: ${messageText}`);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }

    setTimeout(() => {
      setQuickReplyStatus(null);
      if (action === "accept") {
        onAccept();
      } else {
        onDecline();
      }
    }, 2500);
  };

  if (!isOpen || !contact) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-50 flex items-center justify-center font-sans overflow-hidden" 
        id="incoming-call-intent-root"
      >
        {/* =============================================================
            ACCESSIBILITY VISUAL SCREEN FLASH EFFECTS
            ============================================================= */}
        {/* Style A: Soft Ambient Emerald Pulse */}
        {flashStyle === "purple" && (
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/30 via-black/40 to-teal-950/30 animate-pulse pointer-events-none z-0" style={{ animationDuration: "1.5s" }} />
        )}

        {/* Style B: High Intensity Strobe Flash */}
        {flashStyle === "strobe" && isVibratingActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-white/5 pointer-events-none z-0 mix-blend-overlay" 
          />
        )}

        {/* Style C: Neon Screaming Double Border */}
        {flashStyle === "neon" && (
          <div 
            className={`absolute inset-0 border-[12px] md:border-[18px] pointer-events-none z-40 transition-all duration-150 ${
              isVibratingActive 
                ? "border-[#25D366]/80 shadow-[inset_0_0_40px_rgba(37,211,102,0.5)] scale-100" 
                : "border-cyan-500/30 scale-98"
            }`} 
          />
        )}

        {/* Base Gradient Layer */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090515]/95 via-black/90 to-[#050915]/95 z-0 pointer-events-none" />

        {/* MAIN FULL-SCREEN RESPONSIVE GRID LAYOUT */}
        <div className="relative w-full h-full max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 overflow-y-auto p-4 md:p-8 z-10 select-none">
          
          {/* LEFT PANEL: INCOMING CALL METADATA & CORRESPONDING ACCESSIBILITY KINETIC FEEDBACK */}
          <div className="col-span-12 lg:col-span-7 flex flex-col items-center justify-center space-y-8 py-6 md:py-10 text-center relative">
            
            {/* Pulsing Beacon Banner */}
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 text-[10px] font-mono font-black text-emerald-300 tracking-widest bg-[#128C7E]/10 border border-[#25D366]/30 px-5 py-2 rounded-full animate-bounce">
                <Bell className="w-3.5 h-3.5 text-[#25D366] animate-wiggle" />
                🤟 INCOMING ACCESSIBLE MULTIMODAL CALL
              </span>
              <p className="text-xs text-white/50 max-w-md mx-auto px-4">
                Vakhya's full-screen tactile call interface is active. Perfect for ensuring incoming call awareness.
              </p>
            </div>

            {/* Kinetic Shaking Caller Avatar tied to Haptic State */}
            <motion.div
              animate={isVibratingActive ? { 
                x: [-5, 5, -5, 5, -3, 3, 0], 
                y: [-3, 3, -3, 3, -2, 2, 0],
                scale: [1, 1.04, 0.97, 1.02, 1]
              } : {}}
              transition={{ repeat: Infinity, duration: 0.2, ease: "linear" }}
              className="relative w-44 h-44 flex items-center justify-center cursor-pointer"
            >
              {/* Pulsing electromagnetic field waves */}
              {isVibratingActive && (
                <>
                  <div className="absolute inset-0 bg-[#25D366]/20 rounded-full filter blur-2xl animate-pulse" />
                  <div className="absolute -inset-4 border-2 border-[#128C7E]/30 rounded-full animate-ping" style={{ animationDuration: "1.2s" }} />
                  <div className="absolute -inset-10 border border-[#25D366]/10 rounded-full animate-ping" style={{ animationDuration: "2s" }} />
                </>
              )}
              
              <img
                src={contact.avatar}
                alt={contact.name}
                className={`w-32 h-32 rounded-full border-4 relative z-10 transition-all duration-300 ${
                  isVibratingActive ? "border-[#25D366] shadow-[0_0_30px_rgba(37,211,102,0.5)] scale-105" : "border-[#128C7E]/30"
                }`}
                referrerPolicy="no-referrer"
              />

              {/* Haptic Vibrator Status Badge */}
              <div className={`absolute bottom-2 right-2 p-3 rounded-full z-20 shadow-xl text-white transition-all duration-300 ${
                isVibratingActive ? "bg-[#25D366] text-black scale-115" : "bg-emerald-950/80 border border-[#128C7E]/30"
              }`}>
                <Smartphone className={`w-5 h-5 ${isVibratingActive ? "animate-bounce" : ""}`} />
              </div>
            </motion.div>

            {/* User Credentials Card */}
            <div className="space-y-2 px-4">
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none">
                {contact.name}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 bg-emerald-500/10 text-[#25D366] rounded-full border border-emerald-500/20">
                  {contact.userType}
                </span>
                <span className="text-white/30">•</span>
                <span className="text-xs text-white/50 font-mono tracking-wider">{contact.phone}</span>
              </div>
              {contact.statusText && (
                <p className="text-xs text-white/40 italic max-w-sm mx-auto pt-1">
                  "{contact.statusText}"
                </p>
              )}
            </div>

            {/* Graphical representation of the current vibration wave */}
            <div className="bg-[#111b21]/70 backdrop-blur-md border border-white/10 p-5 rounded-3xl w-full max-w-sm space-y-3 shadow-2xl">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-emerald-300 font-bold uppercase tracking-wider">HAPTIC FREQUENCY SPECTRUM</span>
                <span className="font-bold uppercase text-[#25D366] animate-pulse flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isVibratingActive ? "bg-emerald-400" : "bg-red-400"}`} />
                  {isVibratingActive ? "ACTUATOR ON" : "PAUSED"}
                </span>
              </div>
              <div className="flex items-end justify-center gap-1 h-12 px-2">
                {[...Array(16)].map((_, i) => {
                  let h = "h-1 bg-white/5";
                  if (isVibratingActive) {
                    if (vibrationPattern === "rapid") {
                      h = i % 2 === 0 ? "h-10 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "h-4 bg-[#128C7E]";
                    } else if (vibrationPattern === "sos") {
                      h = i < 5 || i > 11 ? "h-2 bg-[#128C7E]" : "h-11 bg-[#25D366] shadow-[0_0_10px_rgba(37,211,102,0.5)]";
                    } else if (vibrationPattern === "heartbeat") {
                      h = i % 4 === 0 || i % 4 === 1 ? "h-9 bg-[#25D366] shadow-[0_0_10px_rgba(37,211,102,0.5)]" : "h-1.5 bg-white/10";
                    } else {
                      h = "h-6 bg-[#128C7E] shadow-[0_0_10px_rgba(18,140,126,0.3)]";
                    }
                  }

                  return (
                    <div
                      key={i}
                      className={`w-2.5 rounded-full transition-all duration-200 ${h}`}
                      style={{ transitionDelay: `${i * 10}ms` }}
                    />
                  );
                })}
              </div>
              <p className="text-[9px] text-center text-white/40 font-mono">
                Hardware Actuator Target: {vibrationPattern.toUpperCase()} Preset
              </p>
            </div>

            {/* =============================================================
                MAIN ACCURATE GRADIENT GLASS ACTION BUTTONS (CTAs)
                ============================================================= */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md px-4 pt-2">
              <button
                onClick={onDecline}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-red-500/10 to-rose-600/10 hover:from-red-600 hover:to-rose-600 border border-red-500/30 hover:border-red-500 text-red-200 hover:text-white font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 shadow-[0_8px_32px_0_rgba(239,68,68,0.15)] hover:shadow-[0_8px_32px_0_rgba(239,68,68,0.4)] backdrop-blur-md cursor-pointer"
              >
                <PhoneOff className="w-4 h-4 text-red-400 group-hover:text-white shrink-0" />
                Decline Call
              </button>
              <button
                onClick={onAccept}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400/20 to-teal-500/20 hover:from-emerald-400 hover:to-teal-500 border border-emerald-400/35 hover:border-emerald-400 text-emerald-300 hover:text-black font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 shadow-[0_8px_32px_0_rgba(52,211,153,0.15)] hover:shadow-[0_8px_32px_0_rgba(52,211,153,0.4)] backdrop-blur-md cursor-pointer"
              >
                <Video className="w-4 h-4 text-emerald-400 group-hover:text-black shrink-0" />
                Accept with Video
              </button>
            </div>

          </div>

          {/* RIGHT PANEL: DYNAMIC INTERACTIVE CUSTOMIZERS & QUICK RESPONSIVE DIALOGUES */}
          <div className="col-span-12 lg:col-span-5 flex flex-col justify-center space-y-6 py-6 lg:py-10 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-8 relative">
            
            {/* ALERT CUSTOMIZATION INTERACTION CONTROLS */}
            <div className="bg-[#111b21]/70 backdrop-blur-md border border-white/10 p-6 rounded-3xl space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#25D366]" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider font-sans">
                    Haptic & Flash Tuner
                  </h3>
                </div>
                <span className="text-[8px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded font-black uppercase">
                  Hardware Coupling
                </span>
              </div>

              {/* Choice 1: Tactile Rhythms */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[#25D366] uppercase block font-black">
                  1. Actuator Rhythm Preset
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "heartbeat", label: "Heartbeat Preset 💓" },
                    { id: "sos", label: "SOS High Alarm 🚨" },
                    { id: "rapid", label: "Rapid Double Tap ⚡" },
                    { id: "standard", label: "Standard Buzz 📱" }
                  ].map((pat) => (
                    <button
                      key={pat.id}
                      onClick={() => setVibrationPattern(pat.id as any)}
                      className={`py-2 px-3 rounded-xl text-[10px] font-bold text-left border transition-all cursor-pointer ${
                        vibrationPattern === pat.id
                          ? "bg-emerald-500/25 border-[#25D366] text-[#25D366] shadow-[0_0_15px_rgba(37,211,102,0.25)] font-black"
                          : "bg-black/40 border-white/5 text-white/50 hover:bg-black/60 hover:text-white"
                      }`}
                    >
                      {pat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Choice 2: Flash styles */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[#25D366] uppercase block font-black">
                  2. Sensory Flash Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "strobe", label: "High-Intensity Strobe" },
                    { id: "purple", label: "Emerald Pulse Glow" },
                    { id: "neon", label: "Neon Screen Frame" },
                    { id: "none", label: "Quiet Mode (No Flash)" }
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setFlashStyle(style.id as any)}
                      className={`py-2 px-3 rounded-xl text-[10px] font-bold text-left border transition-all cursor-pointer ${
                        flashStyle === style.id
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-black"
                          : "bg-black/40 border-white/5 text-white/50 hover:bg-black/60 hover:text-white"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Acoustic Hum Switch */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="space-y-0.5 pr-2">
                  <span className="text-[10px] font-bold text-white block">
                    Acoustic Hum Transducer
                  </span>
                  <span className="text-[9px] text-white/40 block leading-tight">
                    Simulates mechanical device motor buzz inside audio channels.
                  </span>
                </div>
                <button
                  onClick={() => setIsMutedBuzz(!isMutedBuzz)}
                  className={`py-2 px-3 rounded-xl text-[9px] font-mono font-black uppercase transition-all cursor-pointer shrink-0 ${
                    !isMutedBuzz
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                  }`}
                >
                  {!isMutedBuzz ? "🔊 Audio Hum: ON" : "🔇 Audio Hum: OFF"}
                </button>
              </div>

            </div>

            {/* TEXT-TO-SPEECH INTERACTIVE QUICK REPLIES */}
            <div className="bg-[#111b21]/70 backdrop-blur-md border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <MessageSquare className="w-4 h-4 text-[#25D366]" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Tactile Quick Response (TTS)
                </h3>
              </div>
              <p className="text-[11px] text-emerald-300 leading-normal">
                Perfect for broadcasting urgent audio messages to the caller instantly without needing to accept or open your video stream:
              </p>

              {quickReplyStatus ? (
                <div className="bg-black/60 border border-[#128C7E]/30 p-4 rounded-2xl text-center space-y-2.5 animate-pulse">
                  <span className="text-[8px] font-mono bg-[#128C7E]/20 text-[#25D366] border border-[#128C7E]/30 px-2.5 py-1 rounded font-black uppercase block w-max mx-auto">
                    🔊 Synthesizer Broadcasting Intent
                  </span>
                  <p className="text-xs font-mono font-black text-white italic">
                    "{quickReplyStatus}"
                  </p>
                  <span className="text-[9px] text-white/40 block">
                    Synthesizing audio packets... Actioning response.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { text: "Hold on, preparing my sign-language video feed.", action: "accept" as const },
                    { text: "I am Deaf. Please secure interactive live captions.", action: "accept" as const },
                    { text: "Routing a Certified Sign Interpreter first. Standby.", action: "accept" as const },
                    { text: "Busy right now. Drop me a line in our chats tab.", action: "decline" as const }
                  ].map((reply, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendQuickReply(reply.text, reply.action)}
                      className="w-full text-left p-3 rounded-2xl bg-black/40 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 text-xs text-white/80 hover:text-white transition-all duration-200 flex items-center justify-between group cursor-pointer"
                    >
                      <span className="font-semibold leading-snug pr-3">{reply.text}</span>
                      <span className={`text-[8px] font-mono uppercase font-black shrink-0 px-2 py-0.5 rounded ${
                        reply.action === "accept" 
                          ? "bg-green-500/10 text-green-400 border border-green-500/25" 
                          : "bg-red-500/10 text-red-400 border border-red-500/25"
                      }`}>
                        {reply.action === "accept" ? "Accept + Speak" : "Reject + Speak"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </AnimatePresence>
  );
}

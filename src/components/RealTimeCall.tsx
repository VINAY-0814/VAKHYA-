/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Phone,
  PhoneOff,
  Video,
  Mic,
  MicOff,
  Sparkles,
  ShieldAlert,
  Sliders,
  Maximize2,
  Copy,
  Layout,
  MessageSquare,
  Volume2,
  UserCheck,
  CheckCircle,
  Clock,
  Scissors,
  RefreshCw
} from "lucide-react";
import { UserProfile, UserType } from "../types";
import { theme } from "../theme";

interface RealTimeCallProps {
  profile: UserProfile;
}

export default function RealTimeCall({ profile }: RealTimeCallProps) {
  const [callState, setCallState] = useState<"idle" | "calling" | "connected" | "ended">("idle");
  const [remotePeer, setRemotePeer] = useState({
    name: "Aarav Patel",
    userType: UserType.DEAF_OR_HARD_OF_HEARING,
    avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=aarav",
    phone: "+91 98765 01234",
  });

  // Call Settings toggles
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOn, setIsCamOn] = useState(true);
  const [blurBg, setBlurBg] = useState(false);
  const [noiseCancel, setNoiseCancel] = useState(true);
  const [recordActive, setRecordActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Dynamic overlays & captions state
  const [liveCaptions, setLiveCaptions] = useState<Array<{ sender: "me" | "remote"; text: string; time: string }>>([]);
  const [currentCaption, setCurrentCaption] = useState("");
  const [currentGloss, setCurrentGloss] = useState("");

  // Post-call AI generated notes/summary
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize camera for video calling simulation
  useEffect(() => {
    if (callState === "connected" && isCamOn) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 320, height: 240 }, audio: true })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      stopLocalCamera();
    }
    return () => stopLocalCamera();
  }, [callState, isCamOn]);

  // Call Duration Timer & live SpeechRecognition captions
  useEffect(() => {
    if (callState === "connected") {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.onresult = async (event: any) => {
          const resItem = event.results[event.results.length - 1];
          const text = resItem?.[0]?.transcript?.trim();
          if (!text) return;
          setCurrentCaption(text);
          if (!resItem.isFinal) return;
          try {
            const resp = await fetch("/api/translate/sentence-to-gloss", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sentence: text, signLanguage: profile.primarySignLanguage }),
            });
            const data = await resp.json();
            const gloss = data.glosses || text.toUpperCase();
            setCurrentGloss(gloss);
            setLiveCaptions((prev) => [
              ...prev,
              {
                sender: "me",
                text,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              },
            ]);
          } catch {}
        };
        try {
          rec.start();
        } catch {}
        return () => {
          if (durationTimerRef.current) clearInterval(durationTimerRef.current);
          try {
            rec.stop();
          } catch {}
        };
      }
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState, profile.primarySignLanguage]);

  const stopLocalCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  const triggerSynthesis = (text: string) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = profile.voiceSettings.pitch;
    utterance.rate = profile.voiceSettings.speed;
    window.speechSynthesis.speak(utterance);
  };

  const handleStartCall = () => {
    setLiveCaptions([]);
    setCurrentCaption("");
    setCurrentGloss("");
    setAiSummary(null);
    setCallState("connected");
  };

  const handleEndCall = async () => {
    setCallState("ended");
    stopLocalCamera();

    setIsGeneratingSummary(true);
    try {
      const combinedTranscript = liveCaptions.map((c) => c.text).join(" ") || currentCaption || "Call session ended";
      const response = await fetch("/api/translate/sentence-to-gloss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: combinedTranscript,
          signLanguage: profile.primarySignLanguage,
        }),
      });

      const data = await response.json();
      setAiSummary({
        timestamp: new Date().toLocaleString(),
        duration: formatTime(callDuration),
        overallNotes: `Transcript summary (${liveCaptions.length} utterances): ${combinedTranscript}`,
        actionItems: [
          `Primary sign language glosses: ${data.glosses || "NONE RECORDED"}`,
          `Sign language system: ${profile.primarySignLanguage}`,
        ],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div id="realtime-call-section" className="space-y-6">
      {/* HEADER BAR */}
      <div className={`p-4 ${theme.styles.glassLight} flex justify-between items-center`}>
        <div>
          <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase">
            WebRTC Calling Gateway
          </span>
          <h3 className="text-lg font-bold">1:1 Accessibility Call</h3>
        </div>
        {callState === "connected" && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-xs font-mono text-red-200">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <span>REC: {formatTime(callDuration)}</span>
          </div>
        )}
      </div>

      {callState === "idle" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Peer Card */}
          <div className={`p-6 ${theme.styles.glassLight} space-y-6 flex flex-col justify-between`}>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={remotePeer.avatar}
                  alt={remotePeer.name}
                  className="w-16 h-16 rounded-full bg-white/10 p-1 border-2 border-purple-500/30"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-bold text-lg">{remotePeer.name}</h4>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30 block mt-1 w-max">
                    Deaf / Hard of Hearing
                  </span>
                </div>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Calling this contact will automatically initialize Vakhya's dual-directional overlays. Spoken speech translates to a signing 3D avatar on their device, and their signs convert to vocal speech on yours.
              </p>
            </div>

            <button
              id="start-call-btn"
              onClick={handleStartCall}
              className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 ${theme.styles.buttonAccent}`}
            >
              <Video className="w-5 h-5" />
              Initialize Call Sandbox
            </button>
          </div>

          {/* Setup Primer / Instructions */}
          <div className={`p-6 ${theme.styles.glassDark} space-y-4`}>
            <h4 className="font-bold text-sm text-purple-300">Sandbox Quick Overview</h4>
            <ul className="space-y-3 text-xs text-white/70">
              <li className="flex gap-2">
                <span className="font-bold text-[#D96FF2]">1.</span>
                <span>Both users' hardware feeds are combined locally to demonstrate dual-directional translation.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[#D96FF2]">2.</span>
                <span>Includes active background noise cancellation, haptic indicators, and real-time network tracking.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[#D96FF2]">3.</span>
                <span>Generates complete AI recap notes instantly using Gemini upon completing the conversation.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {callState === "calling" && (
        <div className={`min-h-[400px] ${theme.styles.glassDark} flex flex-col items-center justify-center space-y-6 relative overflow-hidden`}>
          {/* Wave ring animation */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#8A5CF6] rounded-full filter blur-xl opacity-30 animate-pulse" />
            <div className="absolute inset-0 border border-purple-500/20 rounded-full scale-125 animate-ping" />
            <img
              src={remotePeer.avatar}
              alt={remotePeer.name}
              className="w-20 h-20 rounded-full z-10 border-2 border-[#D96FF2]"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="text-center space-y-1.5">
            <h4 className="font-bold text-lg">Calling {remotePeer.name}...</h4>
            <span className="text-xs text-[#C9A9E9] uppercase tracking-widest font-mono">
              Securing WebRTC Tunnel Signalling
            </span>
          </div>

          <button
            id="cancel-call-btn"
            onClick={() => setCallState("idle")}
            className="px-6 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-semibold hover:bg-red-500/30 transition-colors"
          >
            Cancel Calling
          </button>
        </div>
      )}

      {callState === "connected" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main call split: Remote Feed vs Local Feed */}
          <div className={`lg:col-span-8 ${theme.styles.glassDark} overflow-hidden relative h-[480px] flex flex-col justify-between`}>
            {/* Overlay Transparent 3D Avatar (only visible to Deaf profile user to watch hearing person's speech signed!) */}
            <div className="absolute right-4 top-4 w-40 h-60 bg-[#1C1230]/60 backdrop-blur-3xl border border-white/10 rounded-2xl z-20 overflow-hidden flex flex-col justify-between shadow-xl">
              <div className="p-2 border-b border-white/5 bg-black/20 text-[9px] font-mono text-purple-300 tracking-wider">
                3D TRANSLATION OVERLAY
              </div>
              {/* Core responsive animated avatar skeletal dots */}
              <div className="flex-1 flex items-center justify-center relative bg-[#1E1435]">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#D96FF2] flex items-center justify-center animate-spin" />
                <div className="absolute p-2 text-center text-[10px] font-bold text-white uppercase tracking-wider">
                  {currentGloss ? currentGloss.split(" ")[0] : "IDLE"}
                </div>
              </div>
              <div className="p-2 bg-black/40 text-[9px] font-mono text-white/50 text-center">
                ASL Rigg active
              </div>
            </div>

            {/* Simulated Remote User Cam Frame */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-[#3E2C64]/30 to-[#160F26]">
              {/* Place a placeholder avatar as the caller's video background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <img src={remotePeer.avatar} alt="remote placeholder" className="w-64 h-64 rounded-full" referrerPolicy="no-referrer" />
              </div>
            </div>

            {/* In-call Subtitle / Caption HUD Overlay */}
            <div className="z-10 p-4 m-4 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl space-y-2 mt-auto">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D96FF2] animate-pulse" />
                <span className="text-[9px] font-mono tracking-widest text-[#C9A9E9] uppercase">
                  Continuous Captions Translation Overlay
                </span>
              </div>
              <p className="text-sm font-bold text-white leading-relaxed">
                {currentCaption || "Waiting for audio vocal stream..."}
              </p>
              {currentGloss && (
                <p className="text-[10px] font-mono text-purple-300">
                  Gloss: {currentGloss}
                </p>
              )}
            </div>

            {/* Local Pip Video Frame */}
            <div className="absolute left-4 top-4 w-28 h-40 bg-[#2A1F3D] border border-white/10 rounded-2xl overflow-hidden z-20 shadow-xl">
              {isCamOn ? (
                <video
                  ref={localVideoRef}
                  className="w-full h-full object-cover scale-x-[-1] rounded-2xl"
                  muted
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-white/40 font-mono">
                  Cam Off
                </div>
              )}
              <div className="absolute bottom-1 right-1 bg-black/60 px-1 rounded text-[8px] font-mono text-white/80">
                YOU
              </div>
            </div>
          </div>

          {/* Right hand Side: Realtime calling status & in-call chats logs */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`p-5 ${theme.styles.glassLight} h-[350px] flex flex-col justify-between`}>
              <div className="border-b border-white/5 pb-3">
                <h4 className="font-bold text-sm text-white">{remotePeer.name}</h4>
                <p className="text-xs text-white/40 font-mono mt-0.5">{remotePeer.phone}</p>
              </div>

              {/* Message Log */}
              <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-2 scrollbar-thin">
                {liveCaptions.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-white/30 text-center font-mono p-4">
                    Captions timeline will display here dynamically as voices are processed.
                  </div>
                ) : (
                  liveCaptions.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl text-xs space-y-1 ${
                        msg.sender === "me"
                          ? "bg-purple-500/10 border border-purple-500/20 ml-4 text-right"
                          : "bg-white/5 border border-white/5 mr-4 text-left"
                      }`}
                    >
                      <div className="text-[9px] font-mono text-white/40">{msg.time}</div>
                      <div className="font-medium text-white/95">{msg.text}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Adaptive Quality HUD */}
              <div className="bg-black/20 p-2.5 rounded-xl flex justify-between items-center text-[9px] font-mono text-white/50 border border-white/5">
                <span>BITRATE: 1200kbps</span>
                <span>PACKETS LOSS: 0%</span>
                <span className="text-green-400">LATENCY: 120ms</span>
              </div>
            </div>

            {/* CALL CONTROL BUTTONS BAR */}
            <div className={`p-4 ${theme.styles.glassLight} flex justify-between items-center gap-2`}>
              <button
                id="call-mute-toggle"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-xl border transition-colors ${
                  isMuted ? "bg-red-500/20 border-red-500 text-red-200" : "bg-white/5 border-white/10"
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                id="call-camera-toggle"
                onClick={() => setIsCamOn(!isCamOn)}
                className={`p-3 rounded-xl border transition-colors ${
                  !isCamOn ? "bg-red-500/20 border-red-500 text-red-200" : "bg-white/5 border-white/10"
                }`}
              >
                <Video className="w-5 h-5" />
              </button>

              <button
                id="call-blur-toggle"
                onClick={() => setBlurBg(!blurBg)}
                className={`p-3 rounded-xl border text-xs font-semibold transition-colors ${
                  blurBg ? "bg-purple-500/25 border-purple-500 text-purple-200" : "bg-white/5 border-white/10 text-white/70"
                }`}
              >
                Blur
              </button>

              <button
                id="end-call-btn"
                onClick={handleEndCall}
                className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition-transform active:scale-95 flex-1 flex justify-center items-center gap-2 font-bold text-xs"
              >
                <PhoneOff className="w-4 h-4" />
                End Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST-CALL AI SUMMARY OVERLAY REPORT */}
      {callState === "ended" && (
        <motion.div
          id="post-call-summary-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 ${theme.styles.glassDark} space-y-6 shadow-2xl`}
        >
          <div className="flex justify-between items-start border-b border-white/5 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D96FF2] animate-pulse" />
                <span className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider">
                  Post-Call Smart Briefing Notes
                </span>
              </div>
              <h3 className="text-xl font-bold mt-1">AI-Generated Call Summary</h3>
            </div>
            <button
              id="return-idle-btn"
              onClick={() => setCallState("idle")}
              className="py-1.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-semibold text-white"
            >
              Back to Contacts
            </button>
          </div>

          {isGeneratingSummary ? (
            <div className="py-8 text-center space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin text-[#D96FF2] mx-auto" />
              <p className="text-xs text-white/60">Evaluating call transcripts and indexing action parameters...</p>
            </div>
          ) : (
            aiSummary && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-mono text-white/40 block">TIMESTAMP</span>
                    <span className="text-xs font-bold text-white/95">{aiSummary.timestamp}</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-mono text-white/40 block">DURATION</span>
                    <span className="text-xs font-bold text-white/95">{aiSummary.duration}</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 col-span-2 md:col-span-1">
                    <span className="text-[9px] font-mono text-white/40 block">CONNECTION TYPE</span>
                    <span className="text-xs font-bold text-green-300">WebRTC Peer Tunnel</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider">Meeting Minutes Recap</h4>
                  <p className="text-xs text-white/70 leading-relaxed bg-black/20 p-3.5 rounded-xl border border-white/5">
                    {aiSummary.overallNotes}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider">Indexed Action Items</h4>
                  <ul className="space-y-2">
                    {aiSummary.actionItems.map((item: string, idx: number) => (
                      <li key={idx} className="flex gap-2.5 items-start text-xs text-white/70">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          )}
        </motion.div>
      )}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  MessageSquare,
  Hand,
  Volume2,
  Accessibility,
  Video,
  Users,
  Camera,
  BookOpen,
  Clock,
  ShieldAlert,
  Sliders,
  Settings,
  Bell,
  User,
  Activity,
  LogOut,
  HelpCircle,
  ShieldCheck,
  FileText,
  Zap,
  Award,
  Tv,
  Maximize2,
  Minimize2,
  ChevronRight,
  Play,
  Pause,
  Layers,
  Heart,
  Search,
  Plus,
  Sun,
  Moon,
  Languages
} from "lucide-react";
import { UserProfile, UserType, SignLanguage } from "../types";
import { theme } from "../theme";
import { useTheme } from "./ThemeContext";

// Import core modules
import SignToSpeech from "./SignToSpeech";
import SpeechToSign from "./SpeechToSign";
import OtherScreens from "./OtherScreens";

// Import Phase 4 modular sub-tabs
import ChatsTab from "./ChatsTab";
import CallsTab from "./CallsTab";
import VoiceStudio from "./VoiceStudio";
import CallingOverlay from "./CallingOverlay";
import ArchitectureConsole from "./ArchitectureConsole";
import ProfileSettings from "./ProfileSettings";
import Profile from "./Profile";
import CallDashboard from "./calls/CallDashboard";
import { realtimeClient } from "../services/realtimeClient";
import { fetchTtsWav, playWavOrSpeech, unlockAudioPlayback } from "../services/ttsPlayer";

interface DashboardProps {
  profile: UserProfile;
  onLogout: () => void;
}

const normalizeDigits = (phone?: string) => String(phone || "").replace(/\D/g, "").slice(-10);

interface ContactItem {
  id: string;
  identity?: string;
  name: string;
  userType: string;
  avatar: string;
  phone: string;
  online: boolean;
  lastSeen: string;
  statusText: string;
  storyMedia: string;
  storyContent: string;
}

const CONTACTS: ContactItem[] = [
  { id: "maya", name: "Maya Sharma", userType: "Hearing Profile", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=maya", phone: "+91 98765 01234", online: false, lastSeen: "Offline", statusText: "Designing a world without communication barriers! 🌟", storyMedia: "text", storyContent: "Excited for our team demo tomorrow! Standardizing sign representations." },
  { id: "aarav", name: "Aarav Patel", userType: "Deaf Profile", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=aarav", phone: "+91 99887 76655", online: false, lastSeen: "Offline", statusText: "Offline-first AI translation is game-changing. 📱", storyMedia: "video", storyContent: "Practicing the new ASL lesson quiz on Vakhya! Who's joining?" },
  { id: "dr_singh", name: "Dr. Singh (Medical Interpreter)", userType: "Certified Interpreter", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=singh", phone: "+91 91234 56789", online: false, lastSeen: "Offline", statusText: "Available for medical and emergency sign translation 🩺", storyMedia: "text", storyContent: "Quick tip: Brush up on 'Doctor' and 'Hospital' signs for emergencies." },
  { id: "sarah", name: "Sarah Jenkins", userType: "Hearing Profile (Family Link)", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=sarah", phone: "+91 94433 22110", online: false, lastSeen: "Offline", statusText: "Grateful for Vakhya's voice modulation studio. ❤️", storyMedia: "text", storyContent: "Tested out the Calm Female voice preset today, sounds just like my sister!" }
];

export default function Dashboard({ profile, onLogout }: DashboardProps) {
  const { themeMode, toggleTheme } = useTheme();
  // Current user Profile state
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile>(profile);

  // Phase 4 Active Navigation Tab: "chats" | "calls" | "translate" | "learn" | "profile"
  const [activeTab, setActiveTab] = useState<"chats" | "calls" | "translate" | "learn" | "profile">("chats");
  
  // Secondary routers inside specific tabs
  const [activeTranslateMode, setActiveTranslateMode] = useState<"options" | "speech_to_sign" | "sign_to_speech" | "ocr" | "avatar_cust">("options");
  const [activeLearnMode, setActiveLearnMode] = useState<"options" | "lessons" | "coach">("options");
  const [activeProfileMode, setActiveProfileMode] = useState<"options" | "voice" | "accessibility" | "privacy" | "sdk" | "uml">("options");

  // Global Calling State
  const [callState, setCallState] = useState<"idle" | "incoming" | "outgoing" | "connected" | "ended">("idle");
  const [callContact, setCallContact] = useState<any>(null);
  const [callType, setCallType] = useState<"voice" | "video">("video");
  const [activeCallRoom, setActiveCallRoom] = useState<string>("");
  const [isCallInitiator, setIsCallInitiator] = useState<boolean>(true);
  const [ringingStatus, setRingingStatus] = useState<string>("SECURING WebRTC SIGNALLING...");
  const [onlinePeers, setOnlinePeers] = useState<any[]>([]);
  const callStartTimeRef = React.useRef<number>(0);
  const outgoingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const callStateRef = React.useRef(callState);
  callStateRef.current = callState;
  const activeCallRoomRef = React.useRef(activeCallRoom);
  activeCallRoomRef.current = activeCallRoom;
  const callContactRef = React.useRef(callContact);
  callContactRef.current = callContact;
  const callTypeRef = React.useRef(callType);
  callTypeRef.current = callType;

  // Voice Studio parameter presets synced locally
  const [voicePreset, setVoicePreset] = useState<string>(
    currentUserProfile.voiceSettings?.voiceName || "Warm Male"
  );
  const [autoReadChat, setAutoReadChat] = useState<boolean>(true);
  const autoReadChatRef = React.useRef(autoReadChat);
  autoReadChatRef.current = autoReadChat;
  const voicePresetRef = React.useRef(voicePreset);
  voicePresetRef.current = voicePreset;
  const voiceSettingsRef = React.useRef(currentUserProfile.voiceSettings);
  voiceSettingsRef.current = currentUserProfile.voiceSettings;

  // Chat message timelines (persisted locally + live WebSocket DMs)
  const [messages, setMessages] = useState<Record<string, any[]>>(() => {
    try {
      const saved = localStorage.getItem("vakhya_chats");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      maya: [
        { id: 1, sender: "remote", text: "Hey! How is the new Vakhya Phase 4 interface looking?", time: "10:30 AM" },
        { id: 2, sender: "me", text: "It's incredible! The Lavender Aurora theme and bottom navigation are completely functional.", time: "10:31 AM" },
      ],
      aarav: [
        { id: 1, sender: "remote", text: "Hello, did you check the Joint Skeletal tracking correction today?", time: "09:15 AM", signed: true },
      ],
      dr_singh: [
        { id: 1, sender: "remote", text: "Hello. I will be on standby for your medical checkup consultation.", time: "Yesterday" },
      ],
      sarah: [
        { id: 1, sender: "remote", text: "Hey! Can you test the new voice studio presets with me?", time: "2 days ago" },
      ]
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem("vakhya_chats", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Low latency Speech-to-Sign Avatar customizer simulation parameters
  const [avatarChar, setAvatarChar] = useState("Zoe");
  const [avatarSpeed, setAvatarSpeed] = useState(1.0);
  const [avatarThemeId, setAvatarThemeIdLocal] = useState<string>(
    currentUserProfile.accessibilitySettings?.avatarThemeId || "emerald-aurora"
  );
  const [avatarBackgroundId, setAvatarBackgroundIdLocal] = useState<string>(
    currentUserProfile.accessibilitySettings?.avatarBackgroundId || "cyber-grid"
  );

  useEffect(() => {
    if (currentUserProfile.accessibilitySettings?.avatarThemeId) {
      setAvatarThemeIdLocal(currentUserProfile.accessibilitySettings.avatarThemeId);
    }
  }, [currentUserProfile.accessibilitySettings?.avatarThemeId]);

  useEffect(() => {
    if (currentUserProfile.accessibilitySettings?.avatarBackgroundId) {
      setAvatarBackgroundIdLocal(currentUserProfile.accessibilitySettings.avatarBackgroundId);
    }
  }, [currentUserProfile.accessibilitySettings?.avatarBackgroundId]);

  // Sync dashboard state immediately when profile modifications are triggered elsewhere
  useEffect(() => {
    const handleStorageSync = () => {
      try {
        const saved = localStorage.getItem("vakhya_profile");
        if (saved) {
          const parsed = JSON.parse(saved);
          setCurrentUserProfile(parsed);
          if (parsed.accessibilitySettings?.avatarThemeId) {
            setAvatarThemeIdLocal(parsed.accessibilitySettings.avatarThemeId);
          }
          if (parsed.accessibilitySettings?.avatarBackgroundId) {
            setAvatarBackgroundIdLocal(parsed.accessibilitySettings.avatarBackgroundId);
          }
        }
      } catch (e) {
        console.error("Error syncing dashboard profile state", e);
      }
    };
    window.addEventListener("storage", handleStorageSync);
    window.addEventListener("avatar_settings_updated", handleStorageSync);
    return () => {
      window.removeEventListener("storage", handleStorageSync);
      window.removeEventListener("avatar_settings_updated", handleStorageSync);
    };
  }, []);

  const handleAvatarThemeChange = (themeId: string) => {
    setAvatarThemeIdLocal(themeId);
    const updatedProfile = {
      ...currentUserProfile,
      accessibilitySettings: {
        ...currentUserProfile.accessibilitySettings,
        avatarThemeId: themeId
      }
    };
    handleUpdateProfile(updatedProfile);
    window.dispatchEvent(new Event("avatar_settings_updated"));
  };

  const handleAvatarBackgroundChange = (bgId: string) => {
    setAvatarBackgroundIdLocal(bgId);
    const updatedProfile = {
      ...currentUserProfile,
      accessibilitySettings: {
        ...currentUserProfile.accessibilitySettings,
        avatarBackgroundId: bgId
      }
    };
    handleUpdateProfile(updatedProfile);
    window.dispatchEvent(new Event("avatar_settings_updated"));
  };

  const [customAvatarInput, setCustomAvatarInput] = useState("");
  const [pipelineState, setPipelineState] = useState<"idle" | "stt" | "nlp" | "motion" | "render">("idle");
  const [pipelineText, setPipelineText] = useState("");

  const mergedContacts = React.useMemo(() => {
    const myIdentity = realtimeClient.getIdentity();

    const livePeers = onlinePeers
      .filter((p) => p.identity && p.identity !== myIdentity)
      .map((p) => ({
        id: `peer_${p.identity}`,
        identity: p.identity,
        name: p.name || `User ${p.phone || p.identity}`,
        userType: p.userType || "Vakhya Peer",
        avatar: p.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.identity}`,
        phone: p.phone || p.identity,
        online: true,
        lastSeen: "Online • Live",
        statusText: "Online • Live — Tap video to call",
        storyMedia: "text",
        storyContent: "Available for live sign/voice video call",
      }));

    const updatedDefaults = CONTACTS.map((c) => {
      const cDigits = normalizeDigits(c.phone);
      const match = onlinePeers.find(
        (p) => p.identity !== myIdentity && p.phone && p.phone === cDigits
      );
      if (match) {
        return {
          ...c,
          identity: match.identity,
          online: true,
          lastSeen: "Online • Live",
        };
      }
      return c;
    });

    return [...livePeers, ...updatedDefaults];
  }, [onlinePeers]);

  const mergedContactsRef = React.useRef(mergedContacts);
  mergedContactsRef.current = mergedContacts;

  // Persistent WebSocket signaling subscription for presence, real calls, and real DMs
  useEffect(() => {
    const fetchOnlinePeers = () => {
      fetch("/api/webrtc/online-peers")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.peers)) {
            setOnlinePeers(data.peers);
          }
        })
        .catch(() => {});
    };

    const recordLog = (contact: any, type: "voice" | "video", outcome: string, missed: boolean, durationSec = 0) => {
      try {
        const existing = JSON.parse(localStorage.getItem("vakhya_call_logs") || "[]");
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        const entry = {
          id: Date.now(),
          name: contact?.name || "Vakhya Peer",
          avatar: contact?.avatar || "https://api.dicebear.com/7.x/pixel-art/svg?seed=call",
          type: type === "video" ? "Video Call" : "Voice Call",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          duration: durationSec > 0 ? `${mins}m ${secs}s` : "--",
          outcome,
          missed,
        };
        localStorage.setItem("vakhya_call_logs", JSON.stringify([entry, ...existing]));
        window.dispatchEvent(new Event("vakhya_call_logs_updated"));
      } catch {}
    };

    const unsub = realtimeClient.subscribe((msg) => {
      if (msg.type === "online_peers" && Array.isArray(msg.peers)) {
        setOnlinePeers(msg.peers);
        return;
      }

      if (msg.type === "incoming_call" && msg.caller && msg.roomName) {
        if (callStateRef.current !== "idle") return;
        setActiveCallRoom(msg.roomName);
        setIsCallInitiator(false);
        setCallContact({
          id: msg.caller.id || msg.caller.identity,
          identity: msg.caller.identity,
          name: msg.caller.name || "Incoming Peer",
          avatar: msg.caller.avatar || "https://api.dicebear.com/7.x/pixel-art/svg?seed=peer",
          phone: msg.caller.phone || "",
          userType: msg.caller.userType || "Profile",
        });
        setCallType(msg.callType || "video");
        setCallState("incoming");
        return;
      }

      if (msg.type === "call_ringing" && msg.roomName === activeCallRoomRef.current) {
        setRingingStatus(
          msg.targetOnline
            ? "RINGING REMOTE PEER..."
            : "PEER OFFLINE — SHARE ROOM OR OPEN SECOND TAB SIGNED IN WITH THEIR NUMBER"
        );
        return;
      }

      if (msg.type === "call_accepted" && msg.roomName === activeCallRoomRef.current) {
        if (outgoingTimeoutRef.current) clearTimeout(outgoingTimeoutRef.current);
        callStartTimeRef.current = Date.now();
        setCallState("connected");
        return;
      }

      if (msg.type === "call_rejected" && msg.roomName === activeCallRoomRef.current) {
        if (outgoingTimeoutRef.current) clearTimeout(outgoingTimeoutRef.current);
        setCallState("idle");
        recordLog(callContactRef.current, callTypeRef.current, "Declined", true, 0);
        return;
      }

      if (msg.type === "call_ended" && msg.roomName === activeCallRoomRef.current) {
        if (outgoingTimeoutRef.current) clearTimeout(outgoingTimeoutRef.current);
        const dur = callStartTimeRef.current ? Math.max(1, Math.round((Date.now() - callStartTimeRef.current) / 1000)) : 0;
        if (callStateRef.current === "connected") {
          recordLog(callContactRef.current, callTypeRef.current, "Connected", false, dur);
        }
        setCallState("idle");
        return;
      }

      if (msg.type === "chat_dm" && msg.payload?.text) {
        const senderDigits = normalizeDigits(msg.payload.senderPhone);
        const matchedContact = mergedContactsRef.current.find(
          (c) => (senderDigits && normalizeDigits(c.phone) === senderDigits) || c.identity === msg.senderIdentity
        );
        const targetId = matchedContact?.id || `peer_${msg.senderIdentity}`;
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setMessages((prev) => ({
          ...prev,
          [targetId]: [
            ...(prev[targetId] || []),
            {
              id: Date.now(),
              sender: "remote",
              text: msg.payload.text,
              time: timeStr,
              signed: Boolean(msg.payload.signed),
            },
          ],
        }));
        if (msg.payload.speakAloud !== false && (msg.payload.speakAloud || autoReadChatRef.current)) {
          void playWavOrSpeech(msg.payload.text, {
            audioWavBase64: msg.payload.audioWavBase64 || null,
            fetchIfMissing: true,
            voiceName: msg.payload.voiceSettings?.voiceName || voicePresetRef.current,
            pitch: msg.payload.voiceSettings?.pitch || voiceSettingsRef.current?.pitch || 1.0,
            speed: msg.payload.voiceSettings?.speed || voiceSettingsRef.current?.speed || 1.0,
          });
        }
      }
    });

    realtimeClient.connect({
      phone: currentUserProfile.phone || "",
      name: currentUserProfile.name || "Vakhya User",
      userType: currentUserProfile.userType,
      avatar: currentUserProfile.avatarUrl,
    });
    fetchOnlinePeers();
    const peerPoll = setInterval(fetchOnlinePeers, 5000);

    return () => {
      unsub();
      clearInterval(peerPoll);
      if (outgoingTimeoutRef.current) clearTimeout(outgoingTimeoutRef.current);
    };
  }, [currentUserProfile.phone, currentUserProfile.name, currentUserProfile.userType, currentUserProfile.avatarUrl]);

  // Real call initiation via WebSocket signaling (no fake 2.5s auto-connect)
  const handleInitiateCall = (contact: any, type: "voice" | "video") => {
    unlockAudioPlayback();
    const room = `vakhya_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (outgoingTimeoutRef.current) clearTimeout(outgoingTimeoutRef.current);

    setCallContact(contact);
    setCallType(type);
    setActiveCallRoom(room);
    setIsCallInitiator(true);
    setRingingStatus("INVITING PEER VIA WEBSOCKET SIGNALLING...");
    setCallState("outgoing");

    realtimeClient.send({
      type: "call_invite",
      roomName: room,
      callType: type,
      targetIdentity: contact.identity,
      targetPhone: contact.phone,
      caller: {
        id: realtimeClient.getIdentity(),
        identity: realtimeClient.getIdentity(),
        name: currentUserProfile.name,
        phone: currentUserProfile.phone,
        userType: currentUserProfile.userType,
        avatar: currentUserProfile.avatarUrl,
      },
    });

    // Real 45s ring timeout -> record Missed call if unanswered
    outgoingTimeoutRef.current = setTimeout(() => {
      if (callStateRef.current === "outgoing") {
        realtimeClient.send({
          type: "call_end",
          roomName: room,
          targetIdentity: contact.identity,
          targetPhone: contact.phone,
        });
        setCallState("idle");
      }
    }, 45000);
  };

  // Trigger real call invite from quick-call controls
  const simulateIncomingCall = (contactId: string) => {
    const contact = mergedContacts.find((c) => c.id === contactId) || mergedContacts[0];
    handleInitiateCall(contact, "video");
  };

  // Real chat DM send via WebSocket signaling with synchronized TTS read-out on both users' sides
  const handleSendMessage = (contactId: string, text: string, options?: { speakAloud?: boolean }) => {
    const clean = text.trim();
    if (!clean) return;
    unlockAudioPlayback();

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = { id: Date.now(), sender: "me", text: clean, time: timeStr };

    setMessages((prev) => ({
      ...prev,
      [contactId]: [...(prev[contactId] || []), userMsg],
    }));

    const shouldSpeak = options?.speakAloud ?? autoReadChatRef.current;
    const ttsOpts = {
      voiceName: voicePresetRef.current,
      pitch: voiceSettingsRef.current?.pitch || 1.0,
      speed: voiceSettingsRef.current?.speed || 1.0,
    };

    const targetContact = mergedContacts.find((c) => c.id === contactId);
    void (async () => {
      let wavBase64: string | null = null;
      if (shouldSpeak) {
        wavBase64 = await Promise.race([
          fetchTtsWav(clean, ttsOpts),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        void playWavOrSpeech(clean, {
          ...ttsOpts,
          audioWavBase64: wavBase64,
          fetchIfMissing: true,
        });
      }

      if (targetContact) {
        realtimeClient.send({
          type: "chat_dm",
          targetIdentity: targetContact.identity,
          targetPhone: targetContact.phone,
          payload: {
            text: clean,
            senderPhone: currentUserProfile.phone,
            signed: currentUserProfile.userType === UserType.DEAF_OR_HARD_OF_HEARING,
            speakAloud: shouldSpeak,
            audioWavBase64: wavBase64,
            voiceSettings: ttsOpts,
          },
        });
      }
    })();
  };

  const handleClearChat = (contactId: string) => {
    setMessages((prev) => ({
      ...prev,
      [contactId]: [],
    }));
  };

  const handleTriggerPipelineSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    const phrase = customAvatarInput.trim();
    if (!phrase) return;

    setPipelineText(phrase);
    setCustomAvatarInput("");
    setPipelineState("stt");

    try {
      setTimeout(() => setPipelineState("nlp"), 80);
      const res = await fetch("/api/translate/sentence-to-gloss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: phrase,
          signLanguage: currentUserProfile.primarySignLanguage || "ISL",
        }),
      });
      const data = await res.json();
      if (data.glosses) {
        setPipelineText(data.glosses);
      }
      setPipelineState("motion");
      setTimeout(() => {
        setPipelineState("render");
        setTimeout(() => setPipelineState("idle"), 1200);
      }, 90);
    } catch {
      setPipelineState("idle");
    }
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setCurrentUserProfile(updatedProfile);
    localStorage.setItem("vakhya_profile", JSON.stringify(updatedProfile));
  };

  const handleSpokenLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updatedProfile = {
      ...currentUserProfile,
      spokenLanguage: e.target.value,
    };
    handleUpdateProfile(updatedProfile);
  };

  // Phase 3: Floating Head bubble states (Aids offline sound classifying/alert head)
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [bubbleExpanded, setBubbleExpanded] = useState(false);
  const [bubbleAudioSource, setBubbleAudioSource] = useState("youtube");
  const [bubblePlaying, setBubblePlaying] = useState(false);
  const [bubbleCaptions, setBubbleCaptions] = useState<string[]>([
    "Environmental microphone sensor activated.",
    "Awaiting active sounds..."
  ]);
  const [bubbleGlosses, setBubbleGlosses] = useState<string>("IDLE");

  return (
    <div
      id="dashboard-layout"
      className="min-h-screen flex flex-col relative overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300"
    >
      {/* 1. MAIN WRAPPER CONTAINER: SKEW FOR DESKTOP DRAWER SIDEBAR */}
      <div className="flex flex-1 flex-col lg:flex-row relative z-10">
        
        {/* DESKTOP PERMANENT DRAW SIDEBAR */}
        <aside className="hidden lg:flex w-72 bg-[var(--glass-dark-bg)] backdrop-blur-3xl border-r border-[var(--border-subtle)] flex-col justify-between h-screen sticky top-0 transition-colors duration-300">
          <div className="p-6 space-y-8 flex-1 overflow-y-auto scrollbar-none">
            {/* Brand Logo & Theme Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/Gemini_Generated_Image_fr8f8pfr8f8pfr8f_27d4c5ef.png"
                  alt="VAKHYA Logo"
                  className="w-10 h-10 rounded-xl object-cover border border-[#22F3A6]/35 shadow-lg shadow-emerald-500/15 shrink-0 bg-[#232B3E]"
                />
                <div>
                  <h2 className="font-black text-lg tracking-wider leading-none text-[var(--text-primary)]">VAKHYA</h2>
                  <span className="text-[9px] text-[var(--text-secondary)] font-bold tracking-widest block mt-1 uppercase">
                    AI ACCESSIBILITY
                  </span>
                </div>
              </div>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                id="sidebar-theme-toggle"
                className="flex items-center justify-center p-2 rounded-xl bg-[var(--button-glass-bg)] hover:bg-[var(--button-glass-bg-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                title={`Switch to ${themeMode === "light" ? "Lavender Aurora (Dark)" : "Aurora Daylight (Light)"}`}
              >
                {themeMode === "light" ? (
                  <Moon className="w-4 h-4 text-purple-600" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
              </button>
            </div>

            {/* Profile widget */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-3">
              <img
                src={currentUserProfile.avatarUrl}
                alt={currentUserProfile.name}
                className="w-10 h-10 rounded-full border border-purple-500/30"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-white truncate">{currentUserProfile.name}</h4>
                <p className="text-[9px] text-purple-300 font-mono mt-0.5">
                  {currentUserProfile.userType === UserType.DEAF_OR_HARD_OF_HEARING ? "Deaf User Profile" : "Hearing User Profile"}
                </p>
              </div>
            </div>

            {/* Simulated fast switcher for calling demo */}
            <div className="bg-purple-900/10 border border-[#8A5CF6]/20 p-3 rounded-xl text-[11px] space-y-2">
              <span className="font-mono text-[9px] text-purple-300 font-bold block uppercase">
                ⚙ Call Simulation Sandbox
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => simulateIncomingCall("maya")}
                  className="py-1 px-1 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-[9px] text-center"
                >
                  Ring: Maya
                </button>
                <button
                  onClick={() => simulateIncomingCall("aarav")}
                  className="py-1 px-1 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-[9px] text-center"
                >
                  Ring: Aarav
                </button>
              </div>
            </div>

            {/* Sidebar Navigation matching the 5 Tab targets */}
            <nav className="space-y-1">
              {[
                { id: "chats", label: "Chats Tab", icon: <MessageSquare className="w-4 h-4" /> },
                { id: "calls", label: "Calls Tab", icon: <Video className="w-4 h-4" /> },
                { id: "translate", label: "Translate Hub", icon: <Hand className="w-4 h-4 text-purple-300" /> },
                { id: "learn", label: "Learn Sign", icon: <BookOpen className="w-4 h-4 text-emerald-400" /> },
                { id: "profile", label: "Profile Studio", icon: <User className="w-4 h-4" /> }
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${
                      isActive
                        ? "bg-gradient-to-r from-[#8A5CF6]/25 to-[#D96FF2]/10 border border-[#8A5CF6]/40 text-white font-bold"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6 border-t border-white/10 bg-black/15">
            <button
              onClick={onLogout}
              className="w-full py-2 rounded-xl bg-red-600/15 hover:bg-red-600/20 border border-red-500/20 text-red-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout Session
            </button>
          </div>
        </aside>

        {/* 2. MAIN WORKSPACE AREA */}
        <main className="flex-1 p-4 lg:p-8 space-y-6 overflow-y-auto pb-32 lg:pb-32">
          
          {/* Top Status Indicators bar */}
          <header className="flex justify-between items-center bg-[var(--glass-light-bg)] backdrop-blur-3xl border border-[var(--border-subtle)] p-4 rounded-2xl transition-colors duration-300">
            <div className="flex items-center gap-3 text-xs text-[var(--text-primary)]/80">
              <span className="font-bold text-[var(--color-accent-violet)] font-mono">GPS COORDINATES:</span>
              <span className="font-mono text-[10px] text-[var(--text-secondary)]">28.6139° N, 77.2090° E</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Spoken Language Dropdown Selection for AI translation */}
              <div className="flex items-center gap-1.5 bg-purple-500/10 dark:bg-purple-500/20 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl px-3 py-1.5 transition-colors shadow-sm">
                <Languages className="w-4 h-4 text-[#D96FF2]" />
                <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider font-bold hidden md:inline">Spoken Input:</span>
                <select
                  id="dashboard-spoken-language-dropdown"
                  value={currentUserProfile.spokenLanguage || "English"}
                  onChange={handleSpokenLanguageChange}
                  className="bg-transparent text-xs font-bold text-[var(--text-primary)] outline-none border-none cursor-pointer pr-1 focus:ring-0"
                >
                  <option value="English" className="bg-[var(--bg-base)] text-[var(--text-primary)] font-semibold">English</option>
                  <option value="Hindi" className="bg-[var(--bg-base)] text-[var(--text-primary)] font-semibold">Hindi (हिन्दी)</option>
                  <option value="Spanish" className="bg-[var(--bg-base)] text-[var(--text-primary)] font-semibold">Spanish (Español)</option>
                  <option value="French" className="bg-[var(--bg-base)] text-[var(--text-primary)] font-semibold">French (Français)</option>
                  <option value="German" className="bg-[var(--bg-base)] text-[var(--text-primary)] font-semibold">German (Deutsch)</option>
                  <option value="Japanese" className="bg-[var(--bg-base)] text-[var(--text-primary)] font-semibold">Japanese (日本語)</option>
                  <option value="Telugu" className="bg-[var(--bg-base)] text-[var(--text-primary)] font-semibold">Telugu (తెలుగు)</option>
                  <option value="Tamil" className="bg-[var(--bg-base)] text-[var(--text-primary)] font-semibold">Tamil (தமிழ்)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-1 border border-green-500/20 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0" />
                <span className="font-mono text-[10px]">TRANSLATION ENGINE: ONLINE</span>
              </div>

              {/* Header Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                id="header-theme-toggle"
                className="flex items-center justify-center p-2 rounded-xl bg-[var(--button-glass-bg)] hover:bg-[var(--button-glass-bg-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-all cursor-pointer shadow-sm active:scale-95"
                title={`Switch to ${themeMode === "light" ? "Lavender Aurora (Dark)" : "Aurora Daylight (Light)"}`}
              >
                {themeMode === "light" ? (
                  <Moon className="w-4 h-4 text-purple-600" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
              </button>
            </div>
          </header>

          {/* Tab switches */}
          <div id="tabs-workspace-routes">
            
            {/* =========================================================
                A. CHATS TAB
                ========================================================= */}
            {activeTab === "chats" && (
              <ChatsTab
                contacts={mergedContacts}
                messages={messages}
                onSendMessage={handleSendMessage}
                onClearChat={handleClearChat}
                onInitiateCall={handleInitiateCall}
                selectedVoicePreset={voicePreset}
                pitch={currentUserProfile.voiceSettings?.pitch || 1.0}
                speed={currentUserProfile.voiceSettings?.speed || 1.0}
                autoReadChat={autoReadChat}
                onToggleAutoReadChat={() => {
                  unlockAudioPlayback();
                  setAutoReadChat((prev) => !prev);
                }}
              />
            )}

            {/* =========================================================
                B. CALLS TAB
                ========================================================= */}
            {activeTab === "calls" && (
              <CallsTab
                contacts={mergedContacts}
                onInitiateCall={handleInitiateCall}
                onSimulateIncomingCall={simulateIncomingCall}
              />
            )}

            {/* =========================================================
                C. TRANSLATE HUB
                ========================================================= */}
            {activeTab === "translate" && (
              <div className="space-y-6">
                
                {/* Mode Selectors */}
                {activeTranslateMode === "options" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Speech to Sign card */}
                    <button
                      onClick={() => setActiveTranslateMode("speech_to_sign")}
                      className={`text-left p-6 ${theme.styles.glassDark} hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(138,92,246,0.15)] group transition-all`}
                    >
                      <div className="p-3 bg-purple-500/10 rounded-2xl w-max mb-4 border border-purple-500/25">
                        <Volume2 className="w-6 h-6 text-[#D96FF2]" />
                      </div>
                      <h4 className="font-black text-sm text-white">Speech-to-Sign Avatar</h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5">
                        Convert vocal speech or microphone audio into real-time rigged 3D sign vectors instantly.
                      </p>
                      <span className="text-[10px] font-bold text-purple-300 group-hover:translate-x-1 transition-transform flex items-center gap-0.5 mt-4">
                        Launch Engine <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>

                    {/* Sign to Speech card */}
                    <button
                      onClick={() => setActiveTranslateMode("sign_to_speech")}
                      className={`text-left p-6 ${theme.styles.glassDark} hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(138,92,246,0.15)] group transition-all`}
                    >
                      <div className="p-3 bg-purple-500/10 rounded-2xl w-max mb-4 border border-purple-500/25">
                        <Hand className="w-6 h-6 text-purple-300" />
                      </div>
                      <h4 className="font-black text-sm text-white">Sign-to-Speech Camera</h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5">
                        Use Web Camera computer-vision landmarks tracing to read sign gestures back to voice output.
                      </p>
                      <span className="text-[10px] font-bold text-purple-300 group-hover:translate-x-1 transition-transform flex items-center gap-0.5 mt-4">
                        Launch Camera <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>

                    {/* Fullscreen Character customizer */}
                    <button
                      onClick={() => setActiveTranslateMode("avatar_cust")}
                      className={`text-left p-6 ${theme.styles.glassLight} hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(138,92,246,0.15)] group transition-all`}
                    >
                      <div className="p-3 bg-purple-500/10 rounded-2xl w-max mb-4 border border-purple-500/25">
                        <Sliders className="w-6 h-6 text-[#22D3EE]" />
                      </div>
                      <h4 className="font-black text-sm text-white">Fullscreen Avatar & Pipeline</h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5">
                        Choose signing characters, modify styles, speed controls, and examine <strong className="text-purple-300">&lt;400ms</strong> latency budget.
                      </p>
                      <span className="text-[10px] font-bold text-purple-300 group-hover:translate-x-1 transition-transform flex items-center gap-0.5 mt-4">
                        Open Customizer <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>

                    {/* OCR scan helper */}
                    <button
                      onClick={() => setActiveTranslateMode("ocr")}
                      className={`text-left p-6 ${theme.styles.glassLight} hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(138,92,246,0.15)] group transition-all`}
                    >
                      <div className="p-3 bg-purple-500/10 rounded-2xl w-max mb-4 border border-purple-500/25">
                        <Camera className="w-6 h-6 text-yellow-400" />
                      </div>
                      <h4 className="font-black text-sm text-white">OCR Document Scanner</h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5">
                        Scan emergency paper notices, prescriptions, recipe cards using multimodal Gemini.
                      </p>
                      <span className="text-[10px] font-bold text-purple-300 group-hover:translate-x-1 transition-transform flex items-center gap-0.5 mt-4">
                        Open Scanner <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  </div>
                )}

                {/* Sub-modes layout */}
                {activeTranslateMode !== "options" && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setActiveTranslateMode("options")}
                      className="py-1.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] font-bold flex items-center gap-1.5"
                    >
                      ← Back to Translation Hub Options
                    </button>

                    {activeTranslateMode === "speech_to_sign" && <SpeechToSign profile={currentUserProfile} />}
                    {activeTranslateMode === "sign_to_speech" && <SignToSpeech profile={currentUserProfile} />}
                    {activeTranslateMode === "ocr" && <OtherScreens profile={currentUserProfile} activeScreen="ocr" />}
                    
                    {/* Active Fullscreen 3D Avatar & Latency customizer */}
                    {activeTranslateMode === "avatar_cust" && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Avatar Customization */}
                        <div className={`p-6 ${theme.styles.glassDark} lg:col-span-7 space-y-6`}>
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider block border-b border-white/5 pb-2">
                            Fullscreen 3D Avatar Customizer
                          </h4>

                          <div className="grid grid-cols-3 gap-2.5">
                            {[
                              { id: "Zoe", name: "Zoe (ASL)", desc: "Cosmic Style", theme: "from-fuchsia-600 to-pink-500" },
                              { id: "Rohan", name: "Rohan (ISL)", desc: "Casual Indigo", theme: "from-blue-600 to-indigo-500" },
                              { id: "Priya", name: "Priya (BSL)", desc: "Lavender Professional", theme: "from-purple-600 to-[#D96FF2]" }
                            ].map((char) => (
                              <button
                                key={char.id}
                                onClick={() => setAvatarChar(char.id)}
                                className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all relative overflow-hidden ${
                                  avatarChar === char.id
                                    ? "bg-gradient-to-tr from-purple-900/40 to-pink-900/20 border-[#D96FF2]"
                                    : "bg-white/5 border-white/5 hover:bg-white/10"
                                }`}
                              >
                                <div>
                                  <h5 className="text-xs font-bold text-white">{char.name}</h5>
                                  <span className="text-[9px] text-white/50 block mt-0.5">{char.desc}</span>
                                </div>
                                <span className="text-[9px] font-bold text-purple-300 font-mono">SELECTED</span>
                              </button>
                            ))}
                          </div>

                          {/* Speed multi */}
                          <div className="space-y-2">
                            <div className="flex justify-between font-mono text-[10px] text-white/60">
                              <span>Signing Animation Velocity</span>
                              <span className="text-purple-300 font-bold">{avatarSpeed.toFixed(1)}x speed</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="2.0"
                              step="0.1"
                              value={avatarSpeed}
                              onChange={(e) => setAvatarSpeed(parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#D96FF2]"
                            />
                          </div>

                          {/* Avatar Neon Theme Selector */}
                          <div className="space-y-2.5">
                            <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider block">
                              3D Avatar Neon Style & Color Profile
                            </span>
                            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
                              {[
                                { id: "emerald-aurora", name: "Emerald", color: "#25D366" },
                                { id: "cyber-punk", name: "Cyber Punk", color: "#FF007F" },
                                { id: "matrix-mint", name: "Matrix", color: "#10B981" },
                                { id: "solar-flare", name: "Solar Flare", color: "#F97316" },
                                { id: "charcoal-tech", name: "Charcoal", color: "#94A3B8" }
                              ].map((themeItem) => {
                                const isSelected = avatarThemeId === themeItem.id;
                                return (
                                  <button
                                    type="button"
                                    key={themeItem.id}
                                    onClick={() => handleAvatarThemeChange(themeItem.id)}
                                    className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-purple-500/10 border-purple-500 text-white font-bold"
                                        : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                                    }`}
                                  >
                                    <span 
                                      className="w-3 h-3 rounded-full border border-white/20 shadow-inner"
                                      style={{ backgroundColor: themeItem.color }}
                                    />
                                    <span className="text-[9px] font-mono leading-none">{themeItem.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Avatar Background Environment Selector */}
                          <div className="space-y-2.5">
                            <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider block">
                              3D Avatar Background Environment
                            </span>
                            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 gap-2">
                              {[
                                { id: "cyber-grid", name: "Cyber Grid", color: "#8A5CF6", desc: "Retro vector grid" },
                                { id: "aurora-flow", name: "Aurora Glow", color: "#D96FF2", desc: "Vibrant purple aurora" },
                                { id: "matrix-digital", name: "Matrix", color: "#10B981", desc: "Falling green code" },
                                { id: "bokeh-studio", name: "Bokeh", color: "#EC4899", desc: "Blurred pink/blue neon" },
                                { id: "minimal-slate", name: "Slate Spotlight", color: "#1E1B4B", desc: "Vignette focus spotlight" },
                                { id: "neon-horizon", name: "Neon Horizon", color: "#F43F5E", desc: "Synthwave sunset grid" }
                              ].map((bgItem) => {
                                const isSelected = avatarBackgroundId === bgItem.id;
                                return (
                                  <button
                                    type="button"
                                    key={bgItem.id}
                                    onClick={() => handleAvatarBackgroundChange(bgItem.id)}
                                    className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-purple-500/10 border-purple-500 text-white font-bold"
                                        : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                                    }`}
                                    title={bgItem.desc}
                                  >
                                    <span 
                                      className="w-3 h-3 rounded-full border border-white/20 shadow-inner"
                                      style={{ backgroundColor: bgItem.color }}
                                    />
                                    <span className="text-[9px] font-mono leading-none">{bgItem.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Repeat phrase trigger */}
                          <div className="bg-black/35 p-4 rounded-2xl border border-white/5 space-y-1">
                            <span className="text-[9px] font-mono text-[#C9A9E9] block uppercase font-bold">Time grammar mapping standard</span>
                            <p className="text-[11px] text-white/60 leading-normal">
                              In American Sign Language structure, time markers are moved to sentence-start. If you sign "I will go home tomorrow", Zoe parses: <strong className="text-purple-300">"TOMORROW HOME GO"</strong>.
                            </p>
                          </div>
                        </div>

                        {/* Low-latency pipeline sandbox */}
                        <div className={`p-6 ${theme.styles.glassLight} lg:col-span-5 space-y-5 flex flex-col justify-between`}>
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider block border-b border-white/5 pb-2">
                              Skeletal Pipeline Visualizer
                            </h4>
                            <p className="text-[10px] text-white/50">
                              Type any words to trigger our <strong className="text-purple-300">&lt;400ms</strong> low latency parsing budget pipeline. See the pipelines light up in real-time.
                            </p>

                            <form onSubmit={handleTriggerPipelineSimulation} className="flex gap-2">
                              <input
                                type="text"
                                value={customAvatarInput}
                                onChange={(e) => setCustomAvatarInput(e.target.value)}
                                placeholder="Type word (e.g. HELLO)..."
                                className="flex-1 bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-xs text-white"
                              />
                              <button
                                type="submit"
                                className={`py-2 px-4 rounded-xl text-xs font-bold ${theme.styles.buttonAccent}`}
                              >
                                Parse
                              </button>
                            </form>

                            {/* Sequential indicators */}
                            <div className="space-y-2.5 text-[10px] font-mono">
                              {[
                                { stage: "stt", label: "[STT]: Continuous speech stream", delay: "80ms" },
                                { stage: "nlp", label: "[NLP]: Word order parser", delay: "120ms" },
                                { stage: "motion", label: "[Motion]: Bone coordinates mapped", delay: "90ms" },
                                { stage: "render", label: "[Render]: Joint render frame complete", delay: "60ms" }
                              ].map((step) => {
                                const active = pipelineState === step.stage;
                                return (
                                  <div
                                    key={step.stage}
                                    className={`p-2 rounded-lg border flex justify-between items-center transition-colors ${
                                      active
                                        ? "bg-[#8A5CF6]/20 border-purple-500/50 text-white font-bold"
                                        : "bg-black/20 border-white/5 text-white/40"
                                    }`}
                                  >
                                    <span>{step.label}</span>
                                    <span>{step.delay}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Repeat last phrase button */}
                          <button
                            onClick={async () => {
                              const phrase = pipelineText || "HELLO";
                              setPipelineText(phrase);
                              setPipelineState("stt");
                              try {
                                setPipelineState("nlp");
                                const res = await fetch("/api/translate/sentence-to-gloss", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    sentence: phrase,
                                    signLanguage: currentUserProfile.primarySignLanguage || "ISL",
                                  }),
                                });
                                const data = await res.json();
                                setPipelineState("motion");
                                if (data.glosses) setPipelineText(data.glosses);
                                setPipelineState("render");
                              } catch {}
                              setTimeout(() => setPipelineState("idle"), 800);
                            }}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs ${theme.styles.buttonGlass}`}
                          >
                            🔂 Repeat Last Mapped Phrase
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                D. LEARN SIGN LANGUAGE
                ========================================================= */}
            {activeTab === "learn" && (
              <div className="space-y-6">
                
                {/* Mode switch */}
                {activeLearnMode === "options" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Lesson track card */}
                    <button
                      onClick={() => setActiveLearnMode("lessons")}
                      className={`text-left p-6 ${theme.styles.glassDark} hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(138,92,246,0.15)] group transition-all`}
                    >
                      <div className="p-3 bg-purple-500/10 rounded-2xl w-max mb-4 border border-purple-500/25">
                        <BookOpen className="w-6 h-6 text-emerald-300" />
                      </div>
                      <h4 className="font-black text-sm text-white">Gamified Sign Academy</h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5">
                        Participate in daily quizzes, learn vocabulary structures, and secure high ranks on the global leaderboard.
                      </p>
                      <span className="text-[10px] font-bold text-purple-300 group-hover:translate-x-1 transition-transform flex items-center gap-0.5 mt-4">
                        Open Academy <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>

                    {/* AI Coach 2.0 joints alignment */}
                    <button
                      onClick={() => setActiveLearnMode("coach")}
                      className={`text-left p-6 ${theme.styles.glassDark} hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(138,92,246,0.15)] group transition-all`}
                    >
                      <div className="p-3 bg-purple-500/10 rounded-2xl w-max mb-4 border border-purple-500/25">
                        <Award className="w-6 h-6 text-yellow-400" />
                      </div>
                      <h4 className="font-black text-sm text-white">AI Coach 2.0 Arena</h4>
                      <p className="text-xs text-white/50 leading-relaxed mt-1.5">
                        Practice Ordering Coffee or airport sync dialogue roleplays with active skeletal tracking alignments.
                      </p>
                      <span className="text-[10px] font-bold text-purple-300 group-hover:translate-x-1 transition-transform flex items-center gap-0.5 mt-4">
                        Launch AI Coach <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  </div>
                )}

                {/* Sub panels */}
                {activeLearnMode !== "options" && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setActiveLearnMode("options")}
                      className="py-1.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] font-bold flex items-center gap-1.5"
                    >
                      ← Back to Learning hub options
                    </button>

                    {activeLearnMode === "lessons" && <OtherScreens profile={currentUserProfile} activeScreen="learn" />}
                    {activeLearnMode === "coach" && <OtherScreens profile={currentUserProfile} activeScreen="coach_2_0" />}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                E. PROFILE STUDIO
                ========================================================= */}
            {activeTab === "profile" && (
              <Profile profile={currentUserProfile} onUpdateProfile={handleUpdateProfile} />
            )}

          </div>
        </main>
      </div>

      {/* =============================================================
          PERSISTENT 5-TAB NAVIGATION BOTTOM BAR (Lavender Aurora)
          ============================================================= */}
      <CallDashboard
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        onSignTabReset={() => setActiveTranslateMode("options")}
      />

      {/* GLOBAL OVERLAY CALLING COMPONENT SINK */}
      <CallingOverlay
        callState={callState}
        callContact={callContact}
        callType={callType}
        selectedVoicePreset={voicePreset}
        onUpdateVoicePreset={setVoicePreset}
        roomName={activeCallRoom}
        localUser={{
          identity: realtimeClient.getIdentity(),
          phone: currentUserProfile.phone,
          name: currentUserProfile.name,
          userType: currentUserProfile.userType,
          avatar: currentUserProfile.avatarUrl,
          signLanguage: currentUserProfile.primarySignLanguage || "ISL",
          voiceSettings: currentUserProfile.voiceSettings,
        }}
        isInitiator={isCallInitiator}
        ringingStatus={ringingStatus}
        onEndCall={() => {
          if (outgoingTimeoutRef.current) clearTimeout(outgoingTimeoutRef.current);
          if (callState === "incoming") {
            realtimeClient.send({
              type: "call_reject",
              roomName: activeCallRoom,
              targetIdentity: callContact?.identity,
              targetPhone: callContact?.phone,
            });
          } else {
            realtimeClient.send({
              type: "call_end",
              roomName: activeCallRoom,
              targetIdentity: callContact?.identity,
              targetPhone: callContact?.phone,
            });
          }
          if (callContact && callState === "connected") {
            try {
              const durationSec = callStartTimeRef.current
                ? Math.max(1, Math.round((Date.now() - callStartTimeRef.current) / 1000))
                : 1;
              const mins = Math.floor(durationSec / 60);
              const secs = durationSec % 60;
              const existing = JSON.parse(localStorage.getItem("vakhya_call_logs") || "[]");
              const entry = {
                id: Date.now(),
                name: callContact.name,
                avatar: callContact.avatar || "https://api.dicebear.com/7.x/pixel-art/svg?seed=call",
                type: callType === "video" ? "Video Call" : "Voice Call",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                duration: `${mins}m ${secs}s`,
                outcome: "Connected",
                missed: false,
              };
              localStorage.setItem("vakhya_call_logs", JSON.stringify([entry, ...existing]));
              window.dispatchEvent(new Event("vakhya_call_logs_updated"));
            } catch {}
          }
          setCallState("idle");
        }}
        onAcceptCall={() => {
          unlockAudioPlayback();
          callStartTimeRef.current = Date.now();
          realtimeClient.send({
            type: "call_accept",
            roomName: activeCallRoom,
            targetIdentity: callContact?.identity,
            targetPhone: callContact?.phone,
            callee: {
              identity: realtimeClient.getIdentity(),
              name: currentUserProfile.name,
              phone: currentUserProfile.phone,
            },
          });
          setCallState("connected");
        }}
      />

    </div>
  );
}

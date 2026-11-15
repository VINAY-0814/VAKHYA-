/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Phone,
  Video,
  Plus,
  Trash2,
  Users,
  Grid,
  Calendar,
  Star,
  CheckCircle,
  Clock,
  Clock3,
  PhoneCall,
  PhoneOff,
  UserCheck,
  Zap
} from "lucide-react";
import { theme } from "../theme";

interface CallsTabProps {
  contacts: any[];
  onInitiateCall: (contact: any, callType: "voice" | "video") => void;
  onSimulateIncomingCall?: (contactId: string) => void;
}

export default function CallsTab({ contacts, onInitiateCall, onSimulateIncomingCall }: CallsTabProps) {
  // Dialpad States
  const [typedNumber, setTypedNumber] = useState("");
  const [recentLogs, setRecentLogs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("vakhya_call_logs");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 1, name: "Maya Sharma", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=maya", type: "Video Call", timestamp: "10:32 AM", duration: "5m 23s", outcome: "Connected", missed: false },
      { id: 2, name: "Aarav Patel", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=aarav", type: "Video Call", timestamp: "09:12 AM", duration: "--", outcome: "Missed", missed: true },
      { id: 3, name: "Dr. Singh", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=singh", type: "Group Call", timestamp: "Yesterday", duration: "18m 40s", outcome: "Connected", missed: false }
    ];
  });

  React.useEffect(() => {
    const syncLogs = () => {
      try {
        const saved = localStorage.getItem("vakhya_call_logs");
        if (saved) setRecentLogs(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener("vakhya_call_logs_updated", syncLogs);
    return () => window.removeEventListener("vakhya_call_logs_updated", syncLogs);
  }, []);

  // Group scheduling states
  const [scheduledRooms, setScheduledRooms] = useState<any[]>([
    { id: 1, title: "Accessibility Weekly Sync", time: "Today at 4:00 PM", signLangs: "ASL / ISL", participants: 4 }
  ]);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomTime, setNewRoomTime] = useState("");
  const [newRoomLangs, setNewRoomLangs] = useState("ASL / ISL");

  // Dialpad press visualizer
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const DIALPAD_KEYS = [
    { num: "1", letters: " " }, { num: "2", letters: "A B C" }, { num: "3", letters: "D E F" },
    { num: "4", letters: "G H I" }, { num: "5", letters: "J K L" }, { num: "6", letters: "M N O" },
    { num: "7", letters: "P Q R S" }, { num: "8", letters: "T U V" }, { num: "9", letters: "W X Y Z" },
    { num: "*", letters: "" }, { num: "0", letters: "+" }, { num: "#", letters: "" }
  ];

  const handleKeyPress = (num: string) => {
    setActiveKey(num);
    setTimeout(() => setActiveKey(null), 150);
    
    // Synthesize DTMF tone simulation
    if (window.AudioContext || (window as any).webkitAudioContext) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Pick frequency based on dialpad key
        const freqMap: Record<string, number> = {
          "1": 697, "2": 770, "3": 852,
          "4": 941, "5": 1209, "6": 1336,
          "7": 1477, "8": 697, "9": 770,
          "0": 852, "*": 941, "#": 1209
        };
        osc.frequency.setValueAtTime(freqMap[num] || 440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch (err) {}
    }

    setTypedNumber((prev) => prev + num);
  };

  const handleDeleteLog = (logId: number) => {
    setRecentLogs((prev) => {
      const next = prev.filter((log) => log.id !== logId);
      localStorage.setItem("vakhya_call_logs", JSON.stringify(next));
      return next;
    });
  };

  const handleDialpadCall = (type: "voice" | "video") => {
    if (!typedNumber.trim()) return;
    // Find matching contact or construct fake temporary peer
    const matched = contacts.find((c) => c.phone.includes(typedNumber)) || {
      id: "unknown",
      name: `Unknown Contact (${typedNumber})`,
      avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=dialed",
      phone: typedNumber,
      online: true,
      lastSeen: "Online"
    };

    onInitiateCall(matched, type);
    setTypedNumber("");
  };

  const handleScheduleRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim() || !newRoomTime.trim()) return;
    
    const newRoom = {
      id: Date.now(),
      title: newRoomTitle.trim(),
      time: newRoomTime,
      signLangs: newRoomLangs,
      participants: 1
    };

    setScheduledRooms((prev) => [...prev, newRoom]);
    setNewRoomTitle("");
    setNewRoomTime("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
      {/* LEFT PANEL: FAVORITES STRIP & RECENT CALL LOGS */}
      <div className={`lg:col-span-7 p-5 ${theme.styles.glassDark} space-y-5 flex flex-col justify-start h-full`}>
        {/* Favorites contact strip */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono tracking-widest text-[#C9A9E9] uppercase block font-bold flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            VAKHYA Favorites (One-Tap Call)
          </span>
          <div className="flex gap-4 overflow-x-auto py-1 scrollbar-none">
            {contacts.map((cnt) => (
              <button
                key={cnt.id}
                id={`fav-call-${cnt.id}`}
                onClick={() => onInitiateCall(cnt, "video")}
                className="flex flex-col items-center gap-1 group focus:outline-none shrink-0"
              >
                <div className="relative">
                  <img
                    src={cnt.avatar}
                    alt={cnt.name}
                    className="w-11 h-11 rounded-full border border-purple-500/30 bg-black/40 p-0.5 group-hover:scale-105 active:scale-95 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-[var(--bg-base)] rounded-full" />
                </div>
                <span className="text-[9px] text-[var(--text-secondary)] font-semibold truncate max-w-[55px]">
                  {cnt.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* =============================================================
            DEAF INCOMING CALL ACCESSIBILITY SIMULATOR & HARDWARE TESTBED
            ============================================================= */}
        <div className="bg-gradient-to-r from-[var(--color-accent-violet)]/10 via-[var(--color-accent-violet)]/5 to-[var(--color-accent-indigo)]/10 border border-[var(--color-accent-violet)]/25 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono font-black tracking-wider text-[#D96FF2] uppercase bg-[#D96FF2]/10 border border-[#D96FF2]/35 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              ACCESSIBLE HARDWARE TESTBED
            </span>
            <span className="text-[8px] font-mono text-[var(--color-accent-violet)]">DEAF PROFILE COUPLING</span>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-[var(--text-primary)] flex items-center gap-1.5">
              Simulate Incoming Call Accessibility Intent
            </h4>
            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
              Test how Vakhya solves incoming call discovery for Deaf users using screen flashes, real/simulated haptic buzz waves, and quick text-to-speech reply presets.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {contacts.slice(0, 3).map((cnt) => (
              <button
                key={cnt.id}
                onClick={() => onSimulateIncomingCall?.(cnt.id)}
                className="flex-1 min-w-[110px] py-1.5 px-3 rounded-xl bg-[var(--button-glass-bg)] hover:bg-[var(--button-glass-bg-hover)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-primary)] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[var(--color-accent-violet)]" />
                Simulate {cnt.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Recent logs */}
        <div className="space-y-2 flex-1 overflow-y-auto scrollbar-none min-h-[300px]">
          <span className="text-[10px] font-mono text-[var(--text-secondary)]/50 uppercase block font-bold">
            Recent Logs
          </span>

          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {recentLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-3 bg-[var(--button-glass-bg)] border border-[var(--border-subtle)] rounded-2xl flex justify-between items-center group hover:bg-[var(--button-glass-bg-hover)] transition-colors"
                >
                  <div className="flex gap-3 items-center min-w-0">
                    <img
                      src={log.avatar}
                      alt={log.name}
                      className="w-9 h-9 rounded-full bg-white/10"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h5 className={`font-bold text-xs ${log.missed ? "text-red-500" : "text-[var(--text-primary)]"}`}>
                        {log.name}
                      </h5>
                      <div className="flex items-center gap-2 mt-0.5 font-mono text-[9px] text-[var(--text-secondary)]/60">
                        <span className="font-semibold text-[var(--color-accent-violet)]">{log.type}</span>
                        <span>•</span>
                        <span>{log.timestamp}</span>
                        {log.duration !== "--" && (
                          <>
                            <span>•</span>
                            <span>{log.duration}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {log.missed && (
                      <span className="text-[8px] font-mono bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                        MISSED
                      </span>
                    )}
                    
                    <button
                      onClick={() => {
                        const contact = contacts.find(c => c.name === log.name) || contacts[0];
                        onInitiateCall(contact, "video");
                      }}
                      className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-[#8A5CF6] hover:text-white text-[#D96FF2] border border-purple-500/20 transition-colors"
                      title="Redial Call"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600 hover:text-white text-red-400 border border-red-500/10 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {recentLogs.length === 0 && (
              <div className="text-center py-8 text-[var(--text-secondary)]/50 text-[11px] font-mono">
                No recent call logs found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: INTERACTIVE DIALPAD & GROUP SCHEDULING */}
      <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
        {/* Dialpad block */}
        <div className={`p-5 ${theme.styles.glassLight} space-y-4 rounded-3xl border border-[var(--border-subtle)]`}>
          <div className="space-y-1.5 text-center">
            <span className="text-[9px] font-mono text-[#D96FF2] font-black uppercase tracking-widest block">
              Dual-Tone Multi-Frequency Dialpad
            </span>
            {/* Formatted typed phone field */}
            <div className="h-10 bg-[var(--button-glass-bg)] rounded-xl border border-[var(--border-subtle)] flex items-center justify-between px-4">
              <span className="text-sm font-mono font-bold text-[var(--text-primary)] tracking-widest truncate">
                {typedNumber || "ENTER PHONE NUMBER"}
              </span>
              {typedNumber && (
                <button
                  onClick={() => setTypedNumber("")}
                  className="text-[10px] text-red-500 hover:underline font-mono cursor-pointer"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>

          {/* Core keys grid */}
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            {DIALPAD_KEYS.map((key) => {
              const isKeyActive = activeKey === key.num;
              return (
                <button
                  key={key.num}
                  id={`dial-key-${key.num}`}
                  onClick={() => handleKeyPress(key.num)}
                  className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border transition-all duration-150 mx-auto cursor-pointer ${
                    isKeyActive
                      ? "bg-gradient-to-tr from-[#8A5CF6] to-[#D96FF2] border-white text-white scale-95 shadow-[0_0_12px_rgba(217,111,242,0.4)]"
                      : "bg-[var(--button-glass-bg)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--button-glass-bg-hover)] hover:border-purple-500/25 active:scale-95"
                  }`}
                >
                  <span className="text-sm font-black font-mono leading-none">{key.num}</span>
                  <span className="text-[7px] font-mono tracking-wider font-semibold opacity-40 uppercase leading-none mt-0.5">
                    {key.letters}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Trigger Dialpad calling buttons */}
          <div className="flex gap-2 max-w-xs mx-auto">
            <button
              onClick={() => handleDialpadCall("voice")}
              disabled={!typedNumber}
              className="flex-1 py-3 rounded-2xl bg-[var(--button-glass-bg)] hover:bg-[var(--button-glass-bg-hover)] border border-[var(--border-subtle)] disabled:opacity-40 text-xs font-bold text-[var(--text-primary)]/80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Phone className="w-4 h-4 text-[var(--color-accent-violet)] animate-bounce" />
              Voice Link
            </button>
            <button
              onClick={() => handleDialpadCall("video")}
              disabled={!typedNumber}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] disabled:opacity-40 text-xs font-bold text-white transition-all hover:shadow-[0_0_15px_rgba(217,111,242,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              Video Link
            </button>
          </div>
        </div>

        {/* Group room scheduling */}
        <div className={`p-5 ${theme.styles.glassLight} space-y-4 rounded-3xl border border-[var(--border-subtle)]`}>
          <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
            <div>
              <h5 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Group Call Rooms</h5>
              <span className="text-[9px] text-[var(--text-secondary)]/75 block">Schedule multi-participant signing conferences</span>
            </div>
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>

          {/* Scheduled cards list */}
          <div className="space-y-2">
            {scheduledRooms.map((room) => (
              <div
                key={room.id}
                className="p-3 bg-[var(--button-glass-bg)] border border-[var(--border-subtle)] rounded-xl flex justify-between items-center text-xs"
              >
                <div>
                  <h6 className="font-bold text-[var(--text-primary)] leading-normal flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" />
                    {room.title}
                  </h6>
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5 font-mono">
                    {room.time} • Languages: {room.signLangs}
                  </span>
                </div>
                <button
                  onClick={() =>
                    onInitiateCall(
                      {
                        id: `room_${room.id}`,
                        name: room.title,
                        avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=room",
                        phone: room.signLangs,
                        userType: "Conference Room",
                      },
                      "video"
                    )
                  }
                  className="py-1 px-3 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 hover:bg-[#8A5CF6] hover:text-white border border-purple-500/35 text-purple-600 dark:text-purple-300 font-bold text-[10px] transition-colors cursor-pointer"
                >
                  Join
                </button>
              </div>
            ))}
          </div>

          {/* Form to schedule a new one */}
          <form onSubmit={handleScheduleRoom} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <input
                type="text"
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                placeholder="Meeting sync title..."
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl py-1.5 px-3 text-[var(--text-primary)] outline-none focus:border-purple-500/50"
              />
              <input
                type="text"
                value={newRoomTime}
                onChange={(e) => setNewRoomTime(e.target.value)}
                placeholder="Time (e.g. 5:30 PM)"
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl py-1.5 px-3 text-[var(--text-primary)] outline-none focus:border-purple-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={!newRoomTitle || !newRoomTime}
              className="w-full py-2 bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] disabled:opacity-40 transition-colors rounded-xl text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule Sign conference
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

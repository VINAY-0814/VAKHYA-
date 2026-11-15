/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Volume2,
  Send,
  Video,
  Phone,
  Paperclip,
  Clock,
  Sparkles,
  Layers,
  X,
  Play,
  Check,
  Plus,
  Compass,
  ArrowLeft,
  ChevronRight,
  Hand,
  VolumeX,
  MoreVertical
} from "lucide-react";
import { theme } from "../theme";

interface ChatsTabProps {
  contacts: any[];
  messages: Record<string, any[]>;
  onSendMessage: (contactId: string, text: string) => void;
  onClearChat?: (contactId: string) => void;
  onInitiateCall: (contact: any, callType: "voice" | "video") => void;
  selectedVoicePreset: string;
  pitch: number;
  speed: number;
}

export default function ChatsTab({
  contacts,
  messages,
  onSendMessage,
  onClearChat,
  onInitiateCall,
  selectedVoicePreset,
  pitch,
  speed
}: ChatsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newMessageText, setNewMessageText] = useState("");

  // Stories States
  const [activeStoryContact, setActiveStoryContact] = useState<any | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [autoCaption, setAutoCaption] = useState(true);
  const [autoSign, setAutoSign] = useState(true);
  const [storyReplyText, setStoryReplyText] = useState("");
  const [storyPoses, setStoryPoses] = useState<any[]>([]);
  const [storyGlosses, setStoryGlosses] = useState<string>("");
  
  // Hover/Context actions on list items
  const [hoveredContactId, setHoveredContactId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const storyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const storyAnimRef = useRef<number | null>(null);

  const activeChatContact = contacts.find((c) => c.id === activeChatId);
  const activeChatMessages = activeChatId ? messages[activeChatId] || [] : [];

  // Filtered contacts based on search
  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.statusText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChatMessages]);

  // Story playback timer
  useEffect(() => {
    let timer: any;
    if (activeStoryContact) {
      setStoryProgress(0);
      timer = setInterval(() => {
        setStoryProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setActiveStoryContact(null);
            return 100;
          }
          return prev + 1.2;
        });
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeStoryContact]);

  // Fetch real Python sign pose sequence for story content
  useEffect(() => {
    if (!activeStoryContact?.storyContent) {
      setStoryPoses([]);
      setStoryGlosses("");
      return;
    }
    let cancelled = false;
    fetch("/api/translate/sentence-to-gloss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence: activeStoryContact.storyContent, signLanguage: "ASL" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.glosses) setStoryGlosses(d.glosses);
        if (Array.isArray(d.pose_sequence)) setStoryPoses(d.pose_sequence);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeStoryContact]);

  // Render real translated pose keyframes inside the story auto-sign overlay
  useEffect(() => {
    if (activeStoryContact && autoSign && storyProgress < 100) {
      const canvas = storyCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = 160;
          canvas.height = 140;
          let frame = 0;

          const draw = () => {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "rgba(15, 7, 32, 0.85)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const fx = canvas.width / 2;
            const fy = canvas.height / 2 - 20;
            ctx.fillStyle = "#8A5CF6";
            ctx.beginPath();
            ctx.arc(fx, fy, 4, 0, Math.PI * 2);
            ctx.arc(fx - 12, fy - 8, 3, 0, Math.PI * 2);
            ctx.arc(fx + 12, fy - 8, 3, 0, Math.PI * 2);
            ctx.fill();

            const kf = storyPoses.length > 0 ? storyPoses[Math.floor(frame / 6) % storyPoses.length] : null;
            const rwX = kf ? kf.right_wrist[0] * canvas.width : fx + 40;
            const rwY = kf ? kf.right_wrist[1] * canvas.height : fy + 35;
            const lwX = kf ? kf.left_wrist[0] * canvas.width : fx - 40;
            const lwY = kf ? kf.left_wrist[1] * canvas.height : fy + 38;

            ctx.strokeStyle = "#22D3EE";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(fx - 22, fy + 25);
            ctx.lineTo(fx + 22, fy + 25);
            ctx.lineTo(rwX, rwY);
            ctx.moveTo(fx - 22, fy + 25);
            ctx.lineTo(lwX, lwY);
            ctx.stroke();

            ctx.fillStyle = "#EC4899";
            [
              [fx - 22, fy + 25],
              [fx + 22, fy + 25],
              [lwX, lwY],
              [rwX, rwY],
            ].forEach(([x, y]) => {
              ctx.beginPath();
              ctx.arc(x, y, 3.8, 0, Math.PI * 2);
              ctx.fill();
            });

            if (storyGlosses) {
              ctx.fillStyle = "#C9A9E9";
              ctx.font = "7px monospace";
              ctx.fillText(storyGlosses.slice(0, 22), 6, canvas.height - 6);
            }

            storyAnimRef.current = requestAnimationFrame(draw);
          };
          draw();
        }
      }
    }
    return () => {
      if (storyAnimRef.current) cancelAnimationFrame(storyAnimRef.current);
    };
  }, [activeStoryContact, autoSign, storyProgress, storyPoses, storyGlosses]);

  const handleSendText = () => {
    if (!newMessageText.trim() || !activeChatId) return;
    onSendMessage(activeChatId, newMessageText.trim());
    setNewMessageText("");
  };

  // Speaks typed text out-loud using custom voice parameters
  const handleVoiceSpeakout = () => {
    if (!newMessageText.trim()) return;
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(newMessageText.trim());
    
    // Choose voice preset category
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find((v) =>
      selectedVoicePreset.includes("Female")
        ? v.name.includes("Female") || v.name.includes("Zira")
        : v.name.includes("Male") || v.name.includes("David")
    );

    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.pitch = pitch;
    utterance.rate = speed;

    window.speechSynthesis.speak(utterance);

    // Also send text to the message feed
    handleSendText();
  };

  const handleDeleteChat = (contactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onClearChat?.(contactId);
    if (activeChatId === contactId) {
      setActiveChatId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
      {/* LEFT COLUMN: CONVERSATION DIRECTORY */}
      <div className={`lg:col-span-4 p-5 ${theme.styles.glassDark} space-y-4 flex flex-col justify-start h-full`}>
        {/* Statuses / Stories Bar */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono tracking-widest text-[var(--color-accent-violet)] uppercase block font-semibold">
            Status Updates (24h Stories)
          </span>
          <div className="flex gap-3 overflow-x-auto py-1 scrollbar-none scroll-smooth">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                id={`story-trigger-${contact.id}`}
                onClick={() => setActiveStoryContact(contact)}
                className="flex flex-col items-center gap-1 shrink-0 group focus:outline-none"
              >
                <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-[#8A5CF6] to-[#D96FF2] hover:scale-105 active:scale-95 transition-transform duration-200">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#8A5CF6] to-[#D96FF2] filter blur-sm opacity-60 group-hover:opacity-100 transition-opacity" />
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-12 h-12 rounded-full border-2 border-[var(--bg-base)] relative z-10 bg-black/40"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[var(--bg-base)]" />
                </div>
                <span className="text-[9px] text-[var(--text-secondary)] font-semibold max-w-[60px] truncate">
                  {contact.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Everywhere bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts, messages..."
            className="w-full py-2 pl-10 pr-4 rounded-xl text-xs bg-[var(--button-glass-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[#D96FF2]/50 focus:ring-1 focus:ring-[#D96FF2]/20 font-sans"
          />
        </div>

        {/* Contacts Threads list */}
        <div className="space-y-2 flex-1 overflow-y-auto scrollbar-none min-h-[300px]">
          <span className="text-[10px] font-mono text-[var(--text-secondary)]/50 uppercase block font-bold">
            All Chats
          </span>
          
          <div className="space-y-1.5">
            {filteredContacts.map((cnt) => {
              const lastMsg = messages[cnt.id]?.slice(-1)[0];
              const isUnread = Boolean(lastMsg && lastMsg.sender === "remote" && activeChatId !== cnt.id && lastMsg.id > 100000);
              const isHovered = hoveredContactId === cnt.id;

              return (
                <div
                  key={cnt.id}
                  id={`chat-item-${cnt.id}`}
                  onClick={() => setActiveChatId(cnt.id)}
                  onMouseEnter={() => setHoveredContactId(cnt.id)}
                  onMouseLeave={() => setHoveredContactId(null)}
                  className={`p-3 rounded-2xl flex justify-between items-center cursor-pointer border relative group transition-all duration-200 ${
                    activeChatId === cnt.id
                      ? "bg-gradient-to-r from-[#8A5CF6]/15 to-[#D96FF2]/10 border-[var(--color-accent-violet)]/30"
                      : "bg-[var(--button-glass-bg)] border-[var(--border-subtle)] hover:bg-[var(--button-glass-bg-hover)]"
                  }`}
                >
                  <div className="flex gap-3 items-center min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <img
                        src={cnt.avatar}
                        alt={cnt.name}
                        className="w-10 h-10 rounded-full bg-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-base)] ${
                          cnt.online ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                        {cnt.name}
                        {cnt.id === "aarav" && (
                          <span title="Deaf Profile" className="inline-flex">
                            <Hand className="w-3 h-3 text-[#D96FF2]" />
                          </span>
                        )}
                      </h5>
                      {cnt.online ? (
                        <p className="text-[10px] text-emerald-400 font-semibold truncate mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block shrink-0" />
                          <span>{cnt.lastSeen || "Online • Live"}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                          {lastMsg ? lastMsg.text : cnt.statusText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                    <span className="text-[9px] font-mono text-[var(--text-secondary)]/50">
                      {lastMsg ? lastMsg.time : cnt.online ? "LIVE" : "10:00 AM"}
                    </span>
                    
                    {/* Quick Video Action (always visible when online, or on hover) */}
                    {cnt.online ? (
                      <div className="flex gap-1.5 relative z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInitiateCall(cnt, "video");
                          }}
                          className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/40 transition-colors"
                          title="Video Call Now"
                        >
                          <Video className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {isHovered ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-1.5 relative z-10"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onInitiateCall(cnt, "video");
                              }}
                              className="p-1.5 rounded-lg bg-[#8A5CF6]/20 hover:bg-[#8A5CF6] text-[#D96FF2] hover:text-white border border-[#8A5CF6]/40 transition-colors"
                              title="Call Peer"
                            >
                              <Video className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteChat(cnt.id, e)}
                              className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/20 transition-colors"
                              title="Delete thread"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ) : (
                          isUnread && (
                            <span className="w-4 h-4 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center border border-[var(--bg-base)]">
                              1
                            </span>
                          )
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE CONVERSATION AREA */}
      <div className="lg:col-span-8 flex flex-col min-h-[500px]">
        {activeChatId && activeChatContact ? (
          <div className={`flex flex-col justify-between h-full p-5 ${theme.styles.glassLight} flex-1 overflow-hidden relative rounded-3xl border border-[var(--border-subtle)]`}>
            {/* Thread Header */}
            <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3">
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => setActiveChatId(null)}
                  className="lg:hidden p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="relative">
                  <img
                    src={activeChatContact.avatar}
                    alt={activeChatContact.name}
                    className="w-10 h-10 rounded-full bg-white/10 border border-purple-500/20"
                    referrerPolicy="no-referrer"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-base)] ${
                      activeChatContact.online ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">{activeChatContact.name}</h4>
                  <span className="text-[10px] text-green-600 dark:text-green-400 font-medium tracking-wide">
                    {activeChatContact.online ? "Active Presence • Online" : "Last seen 2h ago"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onInitiateCall(activeChatContact, "voice")}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme.styles.buttonGlass}`}
                  title="Voice Link"
                >
                  <Phone className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                </button>
                <button
                  onClick={() => onInitiateCall(activeChatContact, "video")}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme.styles.buttonGlass}`}
                  title="Video Translation Link"
                >
                  <Video className="w-4 h-4 text-[#D96FF2]" />
                </button>
                <button className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme.styles.buttonGlass}`}>
                  <MoreVertical className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>

            {/* Conversation Feed */}
            <div className="flex-1 overflow-y-auto space-y-3.5 my-4 pr-1 scrollbar-thin max-h-[340px] min-h-[250px]">
              {activeChatMessages.map((msg, idx) => {
                const isMe = msg.sender === "me";
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-1.5`}
                  >
                    {!isMe && (
                      <img
                        src={activeChatContact.avatar}
                        alt="avatar"
                        className="w-6 h-6 rounded-full bg-white/10 mb-1"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="space-y-1">
                      <div
                        className={`p-3 max-w-xs md:max-w-md rounded-2xl text-xs relative ${
                          isMe
                            ? "bg-gradient-to-tr from-[#8A5CF6] to-[#D96FF2] text-white rounded-br-none shadow-md"
                            : "bg-[var(--button-glass-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-bl-none"
                        }`}
                      >
                        {/* Signed status indicator badge */}
                        {!isMe && msg.signed && (
                          <span className="text-[8px] font-mono text-[#D96FF2] font-black uppercase block tracking-widest mb-1">
                            ★ Translated Sign Language Gloss
                          </span>
                        )}
                        <p className="leading-relaxed font-sans">{msg.text}</p>
                      </div>
                      <span className={`text-[8px] font-mono text-[var(--text-secondary)]/60 block ${isMe ? "text-right" : "text-left"}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Dock */}
            <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex gap-2 items-center bg-[var(--button-glass-bg)] p-2.5 rounded-2xl border border-[var(--border-subtle)]">
                <button className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--button-glass-bg-hover)] rounded-lg">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                  placeholder="Type message text..."
                  className="flex-1 bg-transparent border-none outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 font-sans"
                />

                {/* Translate into sign glossing directly button */}
                <button
                  onClick={handleSendText}
                  className="p-2 bg-purple-600/10 text-purple-600 dark:text-purple-300 border border-purple-500/25 rounded-xl hover:bg-purple-600/20 transition-colors"
                  title="Normal Send"
                >
                  <Send className="w-4 h-4" />
                </button>

                {/* Advanced Multi-Modal Speech Modulator trigger */}
                <button
                  onClick={handleVoiceSpeakout}
                  disabled={!newMessageText.trim()}
                  className="p-2 bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] rounded-xl hover:shadow-[0_0_12px_rgba(217,111,242,0.3)] disabled:opacity-45 disabled:pointer-events-none transition-all text-white font-bold cursor-pointer"
                  title="Voice Modulate & Send"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] text-[var(--text-secondary)] font-mono">
                  DSP Preset: <strong className="text-[var(--color-accent-violet)]">{selectedVoicePreset}</strong> • Pitch: {pitch}x
                </span>
                <span className="text-[9px] text-purple-400 font-bold flex items-center gap-0.5">
                  Secure encryption active <Check className="w-3 h-3 text-green-400" />
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className={`p-6 ${theme.styles.glassLight} flex-1 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl min-h-[500px]`}>
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#8A5CF6]/15 to-[#D96FF2]/10 border border-[#8A5CF6]/20 flex items-center justify-center text-purple-300 animate-pulse">
              <Compass className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">VAKHYA Messaging Core</h4>
              <p className="text-xs text-white/50 max-w-sm mt-1 leading-relaxed">
                Fuzzy search-everywhere is active. Select an active contact conversation thread on the left, or view stories to launch translation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* STORY VIEWER MODAL OVERLAY */}
      <AnimatePresence>
        {activeStoryContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F0720]/95 backdrop-blur-3xl z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-[#1C1230] border border-white/10 rounded-3xl p-6 relative overflow-hidden space-y-5">
              {/* Progress Bar indicator */}
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] h-full"
                  style={{ width: `${storyProgress}%` }}
                />
              </div>

              {/* Story Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <img
                    src={activeStoryContact.avatar}
                    alt="avatar"
                    className="w-10 h-10 rounded-full bg-white/10 border border-[#8A5CF6]"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white">{activeStoryContact.name}</h4>
                    <span className="text-[9px] text-white/40 block">24h Status Update</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveStoryContact(null)}
                  className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Simulated Story Media / Content card */}
              <div className="h-64 bg-black/40 rounded-2xl border border-white/5 p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-2 left-2 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-[8px] font-mono text-purple-300">
                  {activeStoryContact.storyMedia === "video" ? "MP4 VIDEO ATTACHMENT" : "TEXT-ONLY STATUS"}
                </div>

                <div className="flex-1 flex items-center justify-center text-center">
                  <p className="text-sm font-bold text-white max-w-xs leading-relaxed italic px-4">
                    "{activeStoryContact.storyContent}"
                  </p>
                </div>

                {/* Auto Sign Animation Overlay Box inside the viewer */}
                <AnimatePresence>
                  {autoSign && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: 20 }}
                      className="absolute bottom-3 right-3 w-40 h-36 rounded-xl border border-white/10 overflow-hidden shadow-2xl"
                    >
                      <canvas ref={storyCanvasRef} className="w-full h-full" />
                      <div className="absolute top-1 left-1.5 bg-black/40 px-1.5 py-0.5 rounded text-[7px] font-mono text-purple-200">
                        AUTO-SIGN TRANSLATION
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Auto-caption bottom strip */}
                <AnimatePresence>
                  {autoCaption && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="bg-black/60 backdrop-blur-md p-2.5 rounded-xl border border-white/5 text-[10px] text-purple-200 font-mono text-center leading-normal"
                    >
                      [Auto Captions]: "{activeStoryContact.storyContent}"
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Story Viewer control panel toggles */}
              <div className="flex justify-between items-center bg-black/25 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-white/50 font-semibold font-mono uppercase">
                  DEAF ACCESSIBILITY LAYER
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setAutoCaption(!autoCaption)}
                    className={`py-1 px-2.5 rounded-lg text-[9px] font-bold border transition-colors ${
                      autoCaption
                        ? "bg-purple-600/20 border-purple-500 text-purple-300"
                        : "bg-white/5 border-white/10 text-white/50"
                    }`}
                  >
                    CC Caption
                  </button>
                  <button
                    onClick={() => setAutoSign(!autoSign)}
                    className={`py-1 px-2.5 rounded-lg text-[9px] font-bold border transition-colors ${
                      autoSign
                        ? "bg-purple-600/20 border-purple-500 text-purple-300"
                        : "bg-white/5 border-white/10 text-white/50"
                    }`}
                  >
                    Avatar Overlay
                  </button>
                </div>
              </div>

              {/* Send reply message */}
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={storyReplyText}
                  onChange={(e) => setStoryReplyText(e.target.value)}
                  placeholder="Type a reply to story..."
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-white outline-none focus:border-[#D96FF2]/50 font-sans"
                />
                <button
                  onClick={() => {
                    if (storyReplyText.trim() && activeStoryContact) {
                      onSendMessage(activeStoryContact.id, storyReplyText.trim());
                      setStoryReplyText("");
                    }
                    setActiveStoryContact(null);
                  }}
                  className={`py-2 px-4 rounded-xl text-xs font-bold ${theme.styles.buttonAccent}`}
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Camera,
  Mail,
  Phone,
  Shield,
  Bell,
  Sliders,
  Volume2,
  Trash2,
  Lock,
  Eye,
  Check,
  Languages,
  Activity,
  UserX,
  History,
  Bookmark,
  Sparkles,
  Info,
  Accessibility,
  FileText,
  SlidersHorizontal,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { UserProfile, UserType, SignLanguage } from "../types";
import { theme } from "../theme";
import VoiceStudio from "./VoiceStudio";
import ArchitectureConsole from "./ArchitectureConsole";
import OtherScreens from "./OtherScreens";

interface ProfileProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

export default function Profile({ profile, onUpdateProfile }: ProfileProps) {
  // Tabs within the consolidated Profile Component
  const [activeTab, setActiveTab] = useState<"info" | "privacy" | "accessibility" | "voice" | "uml" | "sdk">("info");

  // User Info states
  const [name, setName] = useState(profile.name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [statusText, setStatusText] = useState(
    profile.spokenLanguage === "ASL" 
      ? "Continuous AI ASL Translation active. 🤟" 
      : "Breaking communication barriers with low-latency AI! 🌟"
  );
  const [email, setEmail] = useState(profile.backupEmail || "user@vakhya.ai");
  const [phone, setPhone] = useState(profile.phone);
  const [userType, setUserType] = useState<UserType>(profile.userType);
  const [primarySign, setPrimarySign] = useState<SignLanguage>(profile.primarySignLanguage);

  // Privacy Configs states
  const [photoVisibility, setPhotoVisibility] = useState<"everyone" | "contacts" | "nobody">("everyone");
  const [lastSeenVisibility, setLastSeenVisibility] = useState<"everyone" | "contacts" | "nobody">("contacts");
  const [readReceipts, setReadReceipts] = useState(true);

  // Blocked users management state
  const [blockedUsers, setBlockedUsers] = useState<Array<{ id: string; name: string; phone: string }>>([
    { id: "b1", name: "Spam Telemarketer", phone: "+91 99000 88811" },
    { id: "b2", name: "Unknown Robo-Call", phone: "+91 91111 22222" },
  ]);
  const [newBlockInput, setNewBlockInput] = useState("");
  const [newBlockPhone, setNewBlockPhone] = useState("");

  // Activity History Tracking mock log
  const [activityLogs, setActivityLogs] = useState([
    { id: "log-1", type: "call", title: "Video Call with Maya Sharma", detail: "24m 12s • ASL-to-Speech active", date: "Today, 10:32 AM", color: "text-[#C9A9E9]" },
    { id: "log-2", type: "quiz", title: "ASL Greetings Quiz Completed", detail: "Scored 150 points • 100% Accuracy", date: "Yesterday, 4:15 PM", color: "text-emerald-400" },
    { id: "log-3", type: "cloning", title: "Voice Cloning Model Calibrated", detail: "Secure local Enclave signature saved", date: "July 05, 2026", color: "text-cyan-400" },
    { id: "log-4", type: "call", title: "Group Conference Room", detail: "Medical Interpreter Sarah present", date: "July 04, 2026", color: "text-purple-400" },
    { id: "log-5", type: "translate", title: "Offline OCR Sign Scan", detail: "Emergency hospital guide brochure", date: "July 02, 2026", color: "text-amber-400" }
  ]);

  // Accessibility Visual Simulator States
  const [hapticPulseActive, setHapticPulseActive] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState<"low" | "medium" | "high">("medium");
  const [screenFlashActive, setScreenFlashActive] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Save changes
  const handleSaveChanges = () => {
    const updated: UserProfile = {
      ...profile,
      name,
      avatarUrl,
      backupEmail: email,
      phone,
      userType,
      primarySignLanguage: primarySign,
      accessibilitySettings: {
        ...profile.accessibilitySettings,
        textSize: profile.accessibilitySettings?.textSize || "normal",
        highContrast: profile.accessibilitySettings?.highContrast || false,
        reducedMotion: profile.accessibilitySettings?.reducedMotion || false,
        hapticIntensity: profile.accessibilitySettings?.hapticIntensity || "medium",
        captionStyle: profile.accessibilitySettings?.captionStyle || "standard"
      }
    };
    onUpdateProfile(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleAddBlock = () => {
    if (!newBlockInput.trim()) return;
    setBlockedUsers(prev => [
      ...prev,
      {
        id: `b-${Date.now()}`,
        name: newBlockInput.trim(),
        phone: newBlockPhone.trim() || "+91 98888 77777"
      }
    ]);
    setNewBlockInput("");
    setNewBlockPhone("");
  };

  const handleUnblock = (id: string) => {
    setBlockedUsers(prev => prev.filter(u => u.id !== id));
  };

  const clearHistory = () => {
    setActivityLogs([]);
  };

  return (
    <div className="space-y-6 text-[var(--text-primary)] font-sans" id="profile-component-root">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h3 className="text-xl font-black tracking-wide text-[var(--text-primary)] flex items-center gap-2">
            <User className="w-6 h-6 text-[#C9A9E9]" />
            Unified Profile & Settings Hub
          </h3>
          <p className="text-xs text-[var(--text-secondary)]/70 mt-1">
            Manage your personal credentials, sensory accessibility overlays, and privacy guard parameters.
          </p>
        </div>

        {/* Action Button */}
        {(activeTab === "info" || activeTab === "privacy") && (
          <button
            onClick={handleSaveChanges}
            className="py-2 px-5 rounded-xl bg-gradient-to-r from-purple-400 to-[#C9A9E9] text-black font-extrabold text-xs tracking-wider uppercase shadow-[0_4px_15px_rgba(201,169,233,0.35)] hover:brightness-110 active:scale-95 transition-all self-start md:self-center flex items-center gap-1.5 cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-black stroke-[3]" />
                Saved Successfully
              </>
            ) : (
              "Apply Changes"
            )}
          </button>
        )}
      </div>

      {/* CORE TAB NAVIGATION BAR */}
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--border-subtle)]">
        {[
          { id: "info", label: "User Info", icon: <User className="w-4 h-4" /> },
          { id: "privacy", label: "Privacy Guard", icon: <Shield className="w-4 h-4" /> },
          { id: "accessibility", label: "Accessibility Settings", icon: <Accessibility className="w-4 h-4" /> },
          { id: "voice", label: "Vocal Modulation", icon: <Volume2 className="w-4 h-4" /> },
          { id: "uml", label: "Specs & Diagrams", icon: <SlidersHorizontal className="w-4 h-4" /> },
          { id: "sdk", label: "Enterprise SDK", icon: <FileText className="w-4 h-4" /> }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all border cursor-pointer ${
                isActive 
                  ? "bg-[#C9A9E9]/20 border-[#C9A9E9]/40 text-[#C9A9E9] shadow-inner" 
                  : "bg-[var(--button-glass-bg)] border-[var(--border-subtle)] text-[var(--text-secondary)]/80 hover:bg-[var(--button-glass-bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* MAIN TAB CONTENT DISPLAY */}
      <div className="bg-[var(--glass-dark-bg)] border border-[var(--border-subtle)] rounded-3xl p-6 min-h-[420px]">
        <AnimatePresence mode="wait">
          
          {/* SECTION 1: USER INFO */}
          {activeTab === "info" && (
            <motion.div
              key="info-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Side: Avatar and bio summary */}
                <div className="md:col-span-4 flex flex-col items-center text-center space-y-4 bg-[var(--glass-light-bg)] p-5 rounded-2xl border border-[var(--border-subtle)]">
                  <div className="relative group">
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-24 h-24 rounded-full border-2 border-[#C9A9E9] bg-black/45 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6 text-[#C9A9E9]" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[var(--text-primary)]">{name || "Deaf user"}</h4>
                    <span className="text-[10px] font-mono text-[#C9A9E9] uppercase tracking-wide bg-[#C9A9E9]/10 px-2 py-0.5 rounded-full border border-[#C9A9E9]/20 mt-1 inline-block">
                      {userType === UserType.DEAF_OR_HARD_OF_HEARING ? "DEAF" : "HEARING"} PROFILE
                    </span>
                  </div>

                  <div className="w-full space-y-2">
                    <label className="text-[10px] font-mono text-[var(--text-secondary)]/50 block text-left uppercase">Direct Custom Avatar URL</label>
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Enter avatar URL..."
                      className="w-full bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] rounded-xl py-1.5 px-3 text-xs text-[var(--text-primary)] focus:border-[#C9A9E9]/50 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right Side: Info forms */}
                <div className="md:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-[var(--text-secondary)]/60 uppercase">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-xs text-[var(--text-primary)] focus:border-[#C9A9E9]/50 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-[var(--text-secondary)]/60 uppercase">Backup Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-xs text-[var(--text-primary)] focus:border-[#C9A9E9]/50 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-[var(--text-secondary)]/60 uppercase">Emergency/Broadcasting Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-xs text-[var(--text-primary)] focus:border-[#C9A9E9]/50 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-[var(--text-secondary)]/60 uppercase">Primary Sign Language</label>
                      <select
                        value={primarySign}
                        onChange={(e) => setPrimarySign(e.target.value as SignLanguage)}
                        className="w-full bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-xs text-[var(--text-primary)] focus:border-[#C9A9E9]/50 focus:outline-none cursor-pointer"
                      >
                        <option value={SignLanguage.ASL}>ASL (American Sign Language)</option>
                        <option value={SignLanguage.ISL}>ISL (Indian Sign Language)</option>
                        <option value={SignLanguage.BSL}>BSL (British Sign Language)</option>
                        <option value={SignLanguage.LFS}>LFS (French Sign Language)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-[var(--text-secondary)]/60 uppercase">Communication Mode</label>
                    <select
                      value={userType}
                      onChange={(e) => setUserType(e.target.value as UserType)}
                      className="w-full bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-xs text-[var(--text-primary)] focus:border-[#C9A9E9]/50 focus:outline-none cursor-pointer"
                    >
                      <option value={UserType.DEAF_OR_HARD_OF_HEARING}>Deaf or Hard-of-Hearing (Defaults to ASL visual translation overlays)</option>
                      <option value={UserType.HEARING_PERSON}>Hearing Person (Defaults to Speech-to-Sign transcription avatar)</option>
                      <option value={UserType.INTERPRETER_OR_FAMILY}>Certified Interpreter / Family link</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-[var(--text-secondary)]/60 uppercase">Status Mood / Bio Badge</label>
                    <input
                      type="text"
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                      className="w-full bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] rounded-xl py-2 px-3 text-xs text-[var(--text-primary)] focus:border-[#C9A9E9]/50 focus:outline-none"
                    />
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* SECTION 2: PRIVACY SETTINGS */}
          {activeTab === "privacy" && (
            <motion.div
              key="privacy-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Side: General privacy toggles */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    WebRTC & Profile Metadata Visibility
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]/70 leading-relaxed">
                    Vakhya secures your visual joints and skeletal coordinate streams locally on device. Configure who can access your contact indicators.
                  </p>

                  <div className="space-y-3.5 pt-2">
                    {/* Photo visibility */}
                    <div className="flex justify-between items-center p-4 bg-[var(--glass-light-bg)] rounded-2xl border border-[var(--border-subtle)]">
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)] block">Profile Picture Visibility</span>
                        <span className="text-[10px] text-[var(--text-secondary)]/50">Select who can see your avatar image</span>
                      </div>
                      <div className="flex bg-[var(--glass-input-bg)] p-1 rounded-xl gap-1 border border-[var(--border-subtle)]">
                        {(["everyone", "contacts", "nobody"] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setPhotoVisibility(opt)}
                            className={`text-[9px] font-bold py-1 px-3 rounded-lg capitalize transition-all cursor-pointer ${
                              photoVisibility === opt
                                ? "bg-[#C9A9E9]/25 text-[#C9A9E9]"
                                : "text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Last Seen visibility */}
                    <div className="flex justify-between items-center p-4 bg-[var(--glass-light-bg)] rounded-2xl border border-[var(--border-subtle)]">
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)] block">Last Seen & Online status</span>
                        <span className="text-[10px] text-[var(--text-secondary)]/50">Broadcasting connection times to peers</span>
                      </div>
                      <div className="flex bg-[var(--glass-input-bg)] p-1 rounded-xl gap-1 border border-[var(--border-subtle)]">
                        {(["everyone", "contacts", "nobody"] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setLastSeenVisibility(opt)}
                            className={`text-[9px] font-bold py-1 px-3 rounded-lg capitalize transition-all cursor-pointer ${
                              lastSeenVisibility === opt
                                ? "bg-[#C9A9E9]/25 text-[#C9A9E9]"
                                : "text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Read receipts */}
                    <div className="flex justify-between items-center p-4 bg-[var(--glass-light-bg)] rounded-2xl border border-[var(--border-subtle)]">
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)] block">Read Receipts (Blue Checkmarks)</span>
                        <span className="text-[10px] text-[var(--text-secondary)]/50">Disable to read messages without notifying sender</span>
                      </div>
                      <button
                        onClick={() => setReadReceipts(!readReceipts)}
                        className={`w-11 h-6 rounded-full p-1 transition-colors duration-250 cursor-pointer ${
                          readReceipts ? "bg-emerald-500" : "bg-[var(--glass-input-bg)] border border-[var(--border-subtle)]"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full transition-transform duration-250 ${
                            readReceipts ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Local encryption */}
                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/25 flex gap-3.5 items-start">
                      <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider">E2E Cryptographic Enclave active</h5>
                        <p className="text-[10px] text-[var(--text-secondary)]/70 leading-relaxed mt-1">
                          Both voice modulation synthesis models and camera skeletal coordinates run in custom local sandboxes. No raw user multimedia is sent outside Vakhya.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Blocked Contacts & Activity Logs */}
                <div className="space-y-4 bg-[var(--glass-light-bg)] p-5 rounded-2xl border border-[var(--border-subtle)]">
                  <h4 className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider flex items-center gap-2">
                    <UserX className="w-4 h-4" />
                    Blocklist & Diagnostic Logs
                  </h4>

                  {/* Blocklist form */}
                  <div className="space-y-2 border-b border-[var(--border-subtle)] pb-4">
                    <span className="text-[10px] text-[var(--text-secondary)]/60 font-mono block uppercase">Block contact or spam number</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Name..."
                        value={newBlockInput}
                        onChange={(e) => setNewBlockInput(e.target.value)}
                        className="bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] rounded-xl py-1.5 px-3 text-xs text-[var(--text-primary)]"
                      />
                      <input
                        type="text"
                        placeholder="Phone..."
                        value={newBlockPhone}
                        onChange={(e) => setNewBlockPhone(e.target.value)}
                        className="bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] rounded-xl py-1.5 px-3 text-xs text-[var(--text-primary)]"
                      />
                    </div>
                    <button
                      onClick={handleAddBlock}
                      className="w-full py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-[#C9A9E9] text-xs font-bold transition-all cursor-pointer"
                    >
                      + Register Block Signature
                    </button>

                    <div className="max-h-24 overflow-y-auto space-y-1.5 mt-2">
                      {blockedUsers.map((u) => (
                        <div key={u.id} className="flex justify-between items-center bg-[var(--button-glass-bg)] p-2 rounded-lg text-[10px] border border-[var(--border-subtle)]">
                          <div>
                            <span className="font-bold block text-[var(--text-primary)]">{u.name}</span>
                            <span className="text-[var(--text-secondary)]/50">{u.phone}</span>
                          </div>
                          <button
                            onClick={() => handleUnblock(u.id)}
                            className="text-red-500 hover:text-red-400 font-bold px-2 py-1 cursor-pointer"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[var(--text-secondary)]/60 font-mono uppercase">Diagnostic Audit Trail</span>
                      {activityLogs.length > 0 && (
                        <button onClick={clearHistory} className="text-[9px] text-red-500 hover:underline cursor-pointer">
                          Clear Audit Trail
                        </button>
                      )}
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                      {activityLogs.length === 0 ? (
                        <p className="text-[10px] text-[var(--text-secondary)]/40 text-center py-4">No recent diagnostic events recorded.</p>
                      ) : (
                        activityLogs.map((log) => (
                          <div key={log.id} className="p-2.5 bg-[var(--button-glass-bg)] rounded-xl border border-[var(--border-subtle)] space-y-1 flex items-start gap-2 text-[10px]">
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span className={`font-bold uppercase tracking-wider ${log.color}`}>{log.title}</span>
                                <span className="text-[8px] text-[var(--text-secondary)]/40">{log.date}</span>
                              </div>
                              <p className="text-[var(--text-secondary)]/70 leading-relaxed mt-0.5">{log.detail}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* SECTION 3: ACCESSIBILITY SETTINGS (REQUIRED TAB) */}
          {activeTab === "accessibility" && (
            <motion.div
              key="accessibility-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-[var(--text-primary)]"
            >
              {/* SCREEN FLASH ACCESSIBILITY SIMULATOR OVERLAY */}
              {screenFlashActive && (
                <motion.div
                  id="accessibility-screen-flash-overlay-profile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.8, 0, 0.8, 0] }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="fixed inset-0 bg-white/25 z-50 pointer-events-none mix-blend-screen"
                />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Visual Controls Panel */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* Interface & Text Size */}
                  <div className={`p-5 bg-[var(--glass-light-bg)] border border-[var(--border-subtle)] rounded-3xl space-y-4`}>
                    <h4 className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4" />
                      Layout & Text Sizing
                    </h4>

                    <div className="space-y-4">
                      {/* Global Font Size Select */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-primary)]/80 block">Global Text Sizing</span>
                          <span className="text-[10px] text-purple-600 dark:text-purple-300 font-mono capitalize">
                            {profile.accessibilitySettings?.textSize || "normal"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "small", label: "Small" },
                            { id: "normal", label: "Normal" },
                            { id: "large", label: "Large" }
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => {
                                onUpdateProfile({
                                  ...profile,
                                  accessibilitySettings: {
                                    ...profile.accessibilitySettings,
                                    textSize: opt.id as any
                                  }
                                });
                              }}
                              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                (profile.accessibilitySettings?.textSize || "normal") === opt.id
                                  ? "bg-[#C9A9E9]/20 border-[#C9A9E9]/50 text-[#C9A9E9]"
                                  : "bg-[var(--glass-input-bg)] border-[var(--border-subtle)] text-[var(--text-secondary)]/50 hover:bg-[var(--glass-input-bg-focus)] hover:text-[var(--text-primary)]"
                              }`}
                            >
                                {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Interface Checkbox Toggles */}
                      <div className="space-y-2.5 border-t border-[var(--border-subtle)] pt-3">
                        <label className="flex justify-between items-center cursor-pointer py-1 text-xs">
                          <span className="text-[var(--text-primary)]/85">High Contrast Palette Mode</span>
                          <input
                            type="checkbox"
                            checked={profile.accessibilitySettings?.highContrast || false}
                            onChange={(e) => {
                              onUpdateProfile({
                                ...profile,
                                accessibilitySettings: {
                                  ...profile.accessibilitySettings,
                                  highContrast: e.target.checked
                                }
                              });
                            }}
                            className="rounded bg-[var(--glass-input-bg)] border-[var(--border-subtle)] text-purple-600 focus:ring-0 cursor-pointer w-4 h-4"
                          />
                        </label>

                        <label className="flex justify-between items-center cursor-pointer py-1 text-xs">
                          <span className="text-[var(--text-primary)]/85">Reduce Layout Motion</span>
                          <input
                            type="checkbox"
                            checked={profile.accessibilitySettings?.reducedMotion || false}
                            onChange={(e) => {
                              onUpdateProfile({
                                ...profile,
                                accessibilitySettings: {
                                  ...profile.accessibilitySettings,
                                  reducedMotion: e.target.checked
                                }
                              });
                            }}
                            className="rounded bg-[var(--glass-input-bg)] border-[var(--border-subtle)] text-purple-600 focus:ring-0 cursor-pointer w-4 h-4"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Haptics & Vibration Intensity Panel */}
                  <div className={`p-5 bg-[var(--glass-light-bg)] border border-[var(--border-subtle)] rounded-3xl space-y-4 relative overflow-hidden`}>
                    <h4 className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-4 h-4" />
                      Haptics & Vibration Intensity
                    </h4>

                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: "none", label: "None" },
                          { id: "low", label: "Low" },
                          { id: "medium", label: "Medium" },
                          { id: "high", label: "High" }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              onUpdateProfile({
                                ...profile,
                                accessibilitySettings: {
                                  ...profile.accessibilitySettings,
                                  hapticIntensity: opt.id as any
                                }
                              });
                              // Trigger visual haptic wave animation
                              if (opt.id !== "none") {
                                setPulseIntensity(opt.id as any);
                                setHapticPulseActive(true);
                                setTimeout(() => setHapticPulseActive(false), 900);
                              }
                            }}
                            className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              (profile.accessibilitySettings?.hapticIntensity || "medium") === opt.id
                                ? "bg-[#C9A9E9]/20 border-[#C9A9E9]/50 text-[#C9A9E9]"
                                : "bg-[var(--glass-input-bg)] border-[var(--border-subtle)] text-[var(--text-secondary)]/50 hover:bg-[var(--glass-input-bg-focus)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* VISUAL HAPTIC PULSEWAVE ANIMATION AREA */}
                      <div className="h-24 bg-[var(--glass-input-bg)] rounded-xl border border-[var(--border-subtle)] relative flex items-center justify-center overflow-hidden">
                        {hapticPulseActive ? (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {/* Ring 1 */}
                            <motion.div
                              initial={{ width: 0, height: 0, opacity: 1 }}
                              animate={{ width: "200px", height: "200px", opacity: 0 }}
                              transition={{
                                duration: pulseIntensity === "high" ? 0.5 : pulseIntensity === "medium" ? 0.8 : 1.2,
                                ease: "easeOut",
                                repeat: pulseIntensity === "high" ? 2 : 1
                              }}
                              className={`absolute rounded-full border-4 ${
                                pulseIntensity === "high"
                                  ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                  : pulseIntensity === "medium"
                                  ? "border-purple-400/50 shadow-[0_0_15px_rgba(138,92,246,0.3)]"
                                  : "border-emerald-400/50 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                              }`}
                            />
                            {/* Core icon vibrate animation */}
                            <motion.div
                              animate={{
                                x: pulseIntensity === "high" ? [0, -4, 4, -4, 4, 0] : pulseIntensity === "medium" ? [0, -2, 2, -2, 2, 0] : [0, -0.5, 0.5, 0]
                              }}
                              transition={{ duration: 0.3, repeat: 3 }}
                            >
                              <Activity className={`w-8 h-8 ${
                                pulseIntensity === "high"
                                  ? "text-red-400"
                                  : pulseIntensity === "medium"
                                  ? "text-purple-600 dark:text-purple-300"
                                  : "text-emerald-500 dark:text-emerald-300"
                              }`} />
                            </motion.div>
                          </div>
                        ) : (
                          <div className="text-center space-y-1 text-[var(--text-secondary)]/40">
                            <Activity className="w-5 h-5 mx-auto opacity-50" />
                            <span className="text-[10px] font-mono block">Tap any intensity to preview vibration</span>
                          </div>
                        )}
                      </div>

                      {/* SCREEN FLASH TEST TRIGGER */}
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setScreenFlashActive(true);
                            setTimeout(() => setScreenFlashActive(false), 1500);
                          }}
                          className="w-full py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-[#C9A9E9] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/20 hover:text-white transition-all cursor-pointer"
                        >
                          ⚡ Test Screen Flash Alert Trigger
                        </button>
                        <p className="text-[9px] text-[var(--text-secondary)]/45 leading-normal mt-1 text-center">
                          Flashes the active workspace in a soft strobe pattern to visually alert Deaf users to incoming call signals.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Live Caption Customizer & Preview Screen */}
                <div className="lg:col-span-7 space-y-4">
                  <div className={`p-5 bg-[var(--glass-light-bg)] border border-[var(--border-subtle)] rounded-3xl space-y-4`}>
                    <h4 className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-4 h-4" />
                      Closed Captions Styling & Typography
                    </h4>

                    <div className="space-y-4">
                      {/* Style Presets */}
                      <div className="space-y-2">
                        <span className="text-xs text-[var(--text-primary)]/80 block">Caption Style Preset</span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "standard", label: "Standard Bar" },
                            { id: "large-bg", label: "Frosted Glass" },
                            { id: "outline", label: "No Bar (Outline)" }
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => {
                                onUpdateProfile({
                                  ...profile,
                                  accessibilitySettings: {
                                    ...profile.accessibilitySettings,
                                    captionStyle: opt.id as any
                                  }
                                });
                              }}
                              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                (profile.accessibilitySettings?.captionStyle || "standard") === opt.id
                                  ? "bg-[#C9A9E9]/20 border-[#C9A9E9]/50 text-[#C9A9E9]"
                                  : "bg-[var(--glass-input-bg)] border-[var(--border-subtle)] text-[var(--text-secondary)]/50 hover:bg-[var(--glass-input-bg-focus)] hover:text-[var(--text-primary)]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Real-time Visualizer Container */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono uppercase text-[#C9A9E9] block tracking-wide">
                          Real-time Captions Preview
                        </span>
                        
                        <div className="h-56 bg-gradient-to-br from-[#1A1230] to-[#0A0615] rounded-2xl border border-[var(--border-subtle)] overflow-hidden relative flex flex-col justify-between p-3">
                          {/* Video Stream Mock Background */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-25">
                            <svg className="w-24 h-24 text-purple-500" viewBox="0 0 100 100">
                              <circle cx="35" cy="40" r="15" stroke="currentColor" strokeWidth="2" fill="none" />
                              <circle cx="65" cy="40" r="15" stroke="currentColor" strokeWidth="2" fill="none" />
                              <line x1="35" y1="55" x2="35" y2="85" stroke="currentColor" strokeWidth="2" />
                              <line x1="65" y1="55" x2="65" y2="85" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          </div>

                          <div className="z-10 flex justify-between animate-pulse">
                            <span className="text-[8px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded uppercase">
                              ASL-to-Speech call feed
                            </span>
                            <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              60 FPS ACTIVE
                            </span>
                          </div>

                          {/* Overlaid Captions (Adapts dynamically!) */}
                          <div className="z-10 relative h-16 flex items-end justify-center pb-2">
                            {(profile.accessibilitySettings?.captionStyle || "standard") === "standard" && (
                              <div className={`w-[95%] bg-black/80 px-4 py-2.5 rounded-xl border border-white/5 text-white text-center leading-normal shadow-2xl transition-all duration-300 ${
                                (profile.accessibilitySettings?.textSize || "normal") === "large" 
                                  ? "text-sm font-semibold" 
                                  : (profile.accessibilitySettings?.textSize || "normal") === "small"
                                  ? "text-[10px]" 
                                  : "text-xs"
                              }`}>
                                "We are committed to building highly accessible technology."
                              </div>
                            )}

                            {(profile.accessibilitySettings?.captionStyle || "standard") === "large-bg" && (
                              <div className={`w-[95%] bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl text-[#C9A9E9] font-black text-center leading-normal shadow-[0_8px_32px_0_rgba(138,92,246,0.3)] transition-all duration-300 ${
                                (profile.accessibilitySettings?.textSize || "normal") === "large" 
                                  ? "text-base tracking-wide" 
                                  : (profile.accessibilitySettings?.textSize || "normal") === "small"
                                  ? "text-xs" 
                                  : "text-sm"
                              }`}>
                                "We are committed to building highly accessible technology."
                              </div>
                            )}

                            {(profile.accessibilitySettings?.captionStyle || "standard") === "outline" && (
                              <div className={`w-[95%] text-center text-white font-extrabold tracking-wide leading-normal transition-all duration-300 [text-shadow:_0_2px_0_#000,_0_-2px_0_#000,_2px_0_0_#000,_-2px_0_0_#000] ${
                                (profile.accessibilitySettings?.textSize || "normal") === "large" 
                                  ? "text-base" 
                                  : (profile.accessibilitySettings?.textSize || "normal") === "small"
                                  ? "text-xs" 
                                  : "text-sm"
                              }`}>
                                "We are committed to building highly accessible technology."
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* SECTION 4: VOCAL MODULATION STUDIO */}
          {activeTab === "voice" && (
            <motion.div
              key="voice-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <VoiceStudio profile={profile} onUpdateProfile={onUpdateProfile} />
            </motion.div>
          )}

          {/* SECTION 5: SPECS & DIAGRAMS */}
          {activeTab === "uml" && (
            <motion.div
              key="uml-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ArchitectureConsole />
            </motion.div>
          )}

          {/* SECTION 6: ENTERPRISE SDK */}
          {activeTab === "sdk" && (
            <motion.div
              key="sdk-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <OtherScreens profile={profile} activeScreen="enterprise_sdk" onUpdateProfile={onUpdateProfile} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}

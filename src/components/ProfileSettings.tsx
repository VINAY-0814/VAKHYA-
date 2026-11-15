/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
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
  Shirt
} from "lucide-react";
import { UserProfile, UserType, SignLanguage } from "../types";
import { theme } from "../theme";

interface ProfileSettingsProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

export default function ProfileSettings({ profile, onUpdateProfile }: ProfileSettingsProps) {
  // Tabs within profile configurations
  const [activeSubTab, setActiveSubTab] = useState<"info" | "privacy" | "preferences" | "blocked" | "history">("info");

  // Profile fields state
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

  // Privacy Configs state
  const [photoVisibility, setPhotoVisibility] = useState<"everyone" | "contacts" | "nobody">("everyone");
  const [lastSeenVisibility, setLastSeenVisibility] = useState<"everyone" | "contacts" | "nobody">("contacts");
  const [readReceipts, setReadReceipts] = useState(true);

  // User Notification & Interface preferences
  const [textSize, setTextSize] = useState<"small" | "normal" | "large">(profile.accessibilitySettings.textSize);
  const [hapticIntensity, setHapticIntensity] = useState<"none" | "low" | "medium" | "high">(
    profile.accessibilitySettings.hapticIntensity
  );
  const [captionStyle, setCaptionStyle] = useState<"standard" | "large-bg" | "outline">(
    profile.accessibilitySettings.captionStyle
  );
  const [highContrast, setHighContrast] = useState(profile.accessibilitySettings.highContrast);
  const [reducedMotion, setReducedMotion] = useState(profile.accessibilitySettings.reducedMotion);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [hapticFlashEnabled, setHapticFlashEnabled] = useState(true);
  const [avatarThemeId, setAvatarThemeId] = useState<string>(
    (profile.accessibilitySettings as any).avatarThemeId || "emerald-aurora"
  );
  const [avatarBackgroundId, setAvatarBackgroundId] = useState<string>(
    (profile.accessibilitySettings as any).avatarBackgroundId || "cyber-grid"
  );

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
        textSize,
        highContrast,
        reducedMotion,
        hapticIntensity,
        captionStyle,
        avatarThemeId: avatarThemeId as any,
        avatarBackgroundId: avatarBackgroundId as any
      }
    };
    onUpdateProfile(updated);
    window.dispatchEvent(new Event("avatar_settings_updated"));
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
    <div className="space-y-6 text-white font-sans">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[#C9A9E9]" />
            Profile settings & diagnostics
          </h3>
          <p className="text-xs text-white/50 mt-1">
            Configure Extended and Full-tier profiles, bio management, accessibility, and E2E privacy controls.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSaveChanges}
          className="py-2 px-5 rounded-xl bg-gradient-to-r from-purple-400 to-[#C9A9E9] text-black font-extrabold text-xs tracking-wider uppercase shadow-[0_4px_15px_rgba(201,169,233,0.35)] hover:brightness-110 active:scale-95 transition-all self-start md:self-center flex items-center gap-1.5"
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
      </div>

      {/* HORIZONTAL MINI-TAB BAR */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-white/5">
        {[
          { id: "info", label: "Profile Info", icon: <User className="w-3.5 h-3.5" /> },
          { id: "privacy", label: "Privacy Guard", icon: <Shield className="w-3.5 h-3.5" /> },
          { id: "preferences", label: "Notification & UX", icon: <Bell className="w-3.5 h-3.5" /> },
          { id: "blocked", label: "Blocked Contacts", icon: <UserX className="w-3.5 h-3.5" /> },
          { id: "history", label: "Activity Log", icon: <History className="w-3.5 h-3.5" /> }
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all border ${
                isActive 
                  ? "bg-[#C9A9E9]/20 border-[#C9A9E9]/40 text-[#C9A9E9] shadow-inner" 
                  : "bg-[#182229] border-white/5 text-white/50 hover:bg-[#1f2c34] hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANEL */}
      <div className="bg-[#111b21] border border-white/5 rounded-3xl p-6 min-h-[380px]">
        <AnimatePresence mode="wait">
          
          {/* A. GENERAL PROFILE INFO (EXTENDED) */}
          {activeSubTab === "info" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Avatar and bio header */}
                <div className="md:col-span-4 flex flex-col items-center text-center space-y-4 bg-[#182229] p-5 rounded-2xl border border-white/5">
                  <div className="relative group">
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-24 h-24 rounded-full border-2 border-[#C9A9E9] bg-black/40 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6 text-[#C9A9E9]" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{name || "Deaf user"}</h4>
                    <span className="text-[10px] font-mono text-[#C9A9E9] uppercase tracking-wide bg-[#C9A9E9]/10 px-2 py-0.5 rounded-full border border-[#C9A9E9]/20 mt-1 inline-block">
                      {userType === UserType.DEAF_OR_HARD_OF_HEARING ? "DEAF" : "HEARING"} PROFILE
                    </span>
                  </div>

                  <div className="w-full space-y-2">
                    <label className="text-[10px] font-mono text-white/40 block text-left uppercase">Direct Custom Avatar URL</label>
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Enter avatar URL..."
                      className="w-full bg-black/35 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white/80 focus:border-[#C9A9E9]/50 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Profile Fields editing form */}
                <div className="md:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-white/50 uppercase">Display Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#182229] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-[#C9A9E9]/50 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-white/50 uppercase">Primary Contact Number</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-[#182229] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-[#C9A9E9]/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-white/50 uppercase">Backup Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#182229] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-[#C9A9E9]/50 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-white/50 uppercase">Primary Sign Language</label>
                      <select
                        value={primarySign}
                        onChange={(e) => setPrimarySign(e.target.value as SignLanguage)}
                        className="w-full bg-[#182229] border border-white/10 rounded-xl py-2 px-3 text-xs text-[#C9A9E9] font-bold focus:border-[#C9A9E9]/50 focus:outline-none cursor-pointer"
                      >
                        <option value={SignLanguage.ASL}>American Sign Language (ASL)</option>
                        <option value={SignLanguage.ISL}>Indian Sign Language (ISL)</option>
                        <option value={SignLanguage.BSL}>British Sign Language (BSL)</option>
                        <option value={SignLanguage.LFS}>French Sign Language (LFS)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-white/50 uppercase">Custom Bio / Status Message</label>
                    <textarea
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                      rows={2}
                      className="w-full bg-[#182229] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-[#C9A9E9]/50 focus:outline-none"
                      placeholder="Type your bio status..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-white/50 uppercase">Communication Mode</label>
                    <select
                      value={userType}
                      onChange={(e) => setUserType(e.target.value as UserType)}
                      className="w-full bg-[#182229] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:border-[#C9A9E9]/50 focus:outline-none cursor-pointer"
                    >
                      <option value={UserType.DEAF_OR_HARD_OF_HEARING}>Deaf or Hard-of-Hearing (Defaults to ASL visual translation overlays)</option>
                      <option value={UserType.HEARING_PERSON}>Hearing Person (Defaults to Speech-to-Sign transcription avatar)</option>
                      <option value={UserType.INTERPRETER_OR_FAMILY}>Certified Interpreter / Family link</option>
                    </select>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* B. PRIVACY CONFIGS (EXTENDED) */}
          {activeSubTab === "privacy" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Webrtc & profile metadata visibility
                </h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  Vakhya secures your visual joints and skeletal coordinate streams locally on device. Configure who can access your contact indicators.
                </p>
              </div>

              <div className="space-y-4 max-w-xl">
                
                {/* Photo visibility */}
                <div className="flex justify-between items-center p-4 bg-[#182229] rounded-2xl border border-white/5">
                  <div>
                    <span className="text-xs font-bold text-white block">Profile Picture Visibility</span>
                    <span className="text-[10px] text-white/40">Select who can see your avatar image</span>
                  </div>
                  <div className="flex bg-black/40 p-1 rounded-xl gap-1">
                    {(["everyone", "contacts", "nobody"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setPhotoVisibility(opt)}
                        className={`text-[9px] font-bold py-1 px-3 rounded-lg capitalize transition-all ${
                          photoVisibility === opt
                            ? "bg-[#C9A9E9]/25 text-[#C9A9E9]"
                            : "text-white/40 hover:text-white"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Last Seen visibility */}
                <div className="flex justify-between items-center p-4 bg-[#182229] rounded-2xl border border-white/5">
                  <div>
                    <span className="text-xs font-bold text-white block">Last Seen & Online status</span>
                    <span className="text-[10px] text-white/40">Broadcasting connection times to peers</span>
                  </div>
                  <div className="flex bg-black/40 p-1 rounded-xl gap-1">
                    {(["everyone", "contacts", "nobody"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setLastSeenVisibility(opt)}
                        className={`text-[9px] font-bold py-1 px-3 rounded-lg capitalize transition-all ${
                          lastSeenVisibility === opt
                            ? "bg-[#C9A9E9]/25 text-[#C9A9E9]"
                            : "text-white/40 hover:text-white"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Read receipts */}
                <div className="flex justify-between items-center p-4 bg-[#182229] rounded-2xl border border-white/5">
                  <div>
                    <span className="text-xs font-bold text-white block">Read Receipts (Blue Checkmarks)</span>
                    <span className="text-[10px] text-white/40">Disable to read messages without notifying sender</span>
                  </div>
                  <button
                    onClick={() => setReadReceipts(!readReceipts)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-250 ${
                      readReceipts ? "bg-emerald-500" : "bg-white/10"
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
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">E2E Cryptographic Enclave active</h5>
                    <p className="text-[10px] text-white/60 leading-relaxed mt-1">
                      Both voice modulation synthesis models and camera skeletal coordinates run in custom local sandboxes. No raw user multimedia is sent outside Vakhya.
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* C. USER PREFERENCES & ACCESSIBILITY (FULL) */}
          {activeSubTab === "preferences" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Alerts, Haptic flash & captions styling
                </h4>
                <p className="text-xs text-white/50">
                  Configure real-time calling diagnostics, vibration haptic feedback intensity (beneficial for Deaf users), and caption rendering layouts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Caption layout configuration */}
                <div className="p-4 bg-[#182229] rounded-2xl border border-white/5 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-white block">Caption Styling Layout</span>
                    <span className="text-[10px] text-white/40">Live caption fonts rendering in WebRTC calls</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "standard", label: "Standard" },
                      { id: "large-bg", label: "Frosted Bar" },
                      { id: "outline", label: "Outline" }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setCaptionStyle(opt.id as any)}
                        className={`py-2 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                          captionStyle === opt.id
                            ? "bg-[#C9A9E9]/20 border-[#C9A9E9]/50 text-[#C9A9E9]"
                            : "bg-black/30 border-white/5 text-white/50 hover:bg-black/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vibration and haptic intensity */}
                <div className="p-4 bg-[#182229] rounded-2xl border border-white/5 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-white block">Haptic Vibration intensity</span>
                    <span className="text-[10px] text-white/40">Critical alert notifications vibration intensity</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "none", label: "None" },
                      { id: "low", label: "Low" },
                      { id: "medium", label: "Medium" },
                      { id: "high", label: "High" }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setHapticIntensity(opt.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-[9px] font-bold border transition-all ${
                          hapticIntensity === opt.id
                            ? "bg-[#C9A9E9]/20 border-[#C9A9E9]/50 text-[#C9A9E9]"
                            : "bg-black/30 border-white/5 text-white/50 hover:bg-black/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Size Accessibility */}
                <div className="p-4 bg-[#182229] rounded-2xl border border-white/5 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-white block">Global Text Font Size</span>
                    <span className="text-[10px] text-white/40">Modify readable system sizing parameters</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "small", label: "Small (11px)" },
                      { id: "normal", label: "Normal (13px)" },
                      { id: "large", label: "Large (15px)" }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setTextSize(opt.id as any)}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all ${
                          textSize === opt.id
                            ? "bg-[#C9A9E9]/20 border-[#C9A9E9]/50 text-[#C9A9E9]"
                            : "bg-black/30 border-white/5 text-white/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Other switches */}
                <div className="p-4 bg-[#182229] rounded-2xl border border-white/5 space-y-3">
                  <span className="text-xs font-bold text-white block">Interface Toggles</span>
                  <div className="space-y-2 text-[11px]">
                    
                    <label className="flex justify-between items-center cursor-pointer">
                      <span>Sound alerts & Ringtone triggers</span>
                      <input
                        type="checkbox"
                        checked={soundAlerts}
                        onChange={(e) => setSoundAlerts(e.target.checked)}
                        className="rounded bg-black/40 border-white/10 text-purple-600 focus:ring-0 cursor-pointer"
                      />
                    </label>

                    <label className="flex justify-between items-center cursor-pointer">
                      <span className="flex items-center gap-1.5 text-purple-300 font-bold">
                        Haptic Screen Flashing alert
                      </span>
                      <input
                        type="checkbox"
                        checked={hapticFlashEnabled}
                        onChange={(e) => setHapticFlashEnabled(e.target.checked)}
                        className="rounded bg-black/40 border-white/10 text-purple-600 focus:ring-0 cursor-pointer"
                      />
                    </label>

                    <label className="flex justify-between items-center cursor-pointer">
                      <span>Enable High Contrast Theme</span>
                      <input
                        type="checkbox"
                        checked={highContrast}
                        onChange={(e) => setHighContrast(e.target.checked)}
                        className="rounded bg-black/40 border-white/10 text-purple-600 focus:ring-0 cursor-pointer"
                      />
                    </label>

                    <label className="flex justify-between items-center cursor-pointer">
                      <span>Reduce Layout Motion</span>
                      <input
                        type="checkbox"
                        checked={reducedMotion}
                        onChange={(e) => setReducedMotion(e.target.checked)}
                        className="rounded bg-black/40 border-white/10 text-purple-600 focus:ring-0 cursor-pointer"
                      />
                    </label>

                  </div>
                </div>

                {/* 3D Avatar Appearance Profile Customizer */}
                <div className="p-5 bg-gradient-to-tr from-[#1a1333] to-[#121b21] rounded-2xl border border-purple-500/20 space-y-4 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Shirt className="w-5 h-5 text-purple-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">3D Avatar Color Theme / Appearance Profile</span>
                      <span className="text-[10px] text-white/40">Select the default neon skeletal style profile of the sign-language model</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { id: "emerald-aurora", name: "Aurora Emerald", color: "#25D366" },
                      { id: "cyber-punk", name: "Cyber Punk", color: "#FF007F" },
                      { id: "matrix-mint", name: "Matrix Mint", color: "#10B981" },
                      { id: "solar-flare", name: "Solar Flare", color: "#F97316" },
                      { id: "charcoal-tech", name: "Charcoal Tech", color: "#94A3B8" }
                    ].map((themeItem) => {
                      const isSelected = avatarThemeId === themeItem.id;
                      return (
                        <button
                          key={themeItem.id}
                          onClick={() => setAvatarThemeId(themeItem.id)}
                          className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-500/10 border-purple-500 text-white font-bold ring-1 ring-purple-500/20"
                              : "bg-black/35 border-white/5 text-white/50 hover:bg-black/50 hover:text-white"
                          }`}
                        >
                          <span 
                            className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                            style={{ backgroundColor: themeItem.color }}
                          />
                          <span className="text-[10px] text-center font-mono leading-none">{themeItem.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3D Avatar Environment Background Selector */}
                <div className="p-5 bg-gradient-to-tr from-[#1a1333] to-[#121b21] rounded-2xl border border-purple-500/20 space-y-4 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-purple-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">3D Avatar Background Environment</span>
                      <span className="text-[10px] text-white/40">Choose default visual background style for 3D sign-language model rendering</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    {[
                      { id: "cyber-grid", name: "Cyber Grid", color: "#8A5CF6" },
                      { id: "aurora-flow", name: "Aurora Glow", color: "#D96FF2" },
                      { id: "matrix-digital", name: "Matrix Digital", color: "#10B981" },
                      { id: "bokeh-studio", name: "Bokeh Studio", color: "#EC4899" },
                      { id: "minimal-slate", name: "Minimal Slate", color: "#1E1B4B" },
                      { id: "neon-horizon", name: "Neon Horizon", color: "#F43F5E" }
                    ].map((bgItem) => {
                      const isSelected = avatarBackgroundId === bgItem.id;
                      return (
                        <button
                          key={bgItem.id}
                          type="button"
                          onClick={() => setAvatarBackgroundId(bgItem.id)}
                          className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-500/10 border-purple-500 text-white font-bold ring-1 ring-purple-500/20"
                              : "bg-black/35 border-white/5 text-white/50 hover:bg-black/50 hover:text-white"
                          }`}
                        >
                          <span 
                            className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                            style={{ backgroundColor: bgItem.color }}
                          />
                          <span className="text-[10px] text-center font-mono leading-none">{bgItem.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* D. BLOCKED USERS MANAGEMENT (FULL) */}
          {activeSubTab === "blocked" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  Blocked user registers
                </h4>
                <p className="text-xs text-white/50 leading-relaxed">
                  Blocked numbers cannot initiate secure WebRTC channels or see your live 3D signing avatar status.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Block form */}
                <div className="md:col-span-5 bg-[#182229] p-4 rounded-2xl border border-white/5 space-y-3.5">
                  <span className="text-xs font-bold text-white block uppercase tracking-wider font-mono">Block new contact</span>
                  <div className="space-y-2 text-xs">
                    <input
                      type="text"
                      value={newBlockInput}
                      onChange={(e) => setNewBlockInput(e.target.value)}
                      placeholder="Enter contact nickname..."
                      className="w-full bg-black/35 border border-white/10 rounded-xl py-2 px-3 outline-none focus:border-[#C9A9E9]/50 text-white"
                    />
                    <input
                      type="text"
                      value={newBlockPhone}
                      onChange={(e) => setNewBlockPhone(e.target.value)}
                      placeholder="Phone (e.g. +91 99999 ...)"
                      className="w-full bg-black/35 border border-white/10 rounded-xl py-2 px-3 outline-none focus:border-[#C9A9E9]/50 text-white"
                    />
                    <button
                      onClick={handleAddBlock}
                      className="w-full py-2 rounded-xl bg-red-500/15 text-red-300 font-bold border border-red-500/30 hover:bg-red-500/25 transition-all uppercase tracking-widest text-[10px]"
                    >
                      Block Contact
                    </button>
                  </div>
                </div>

                {/* Blocked List */}
                <div className="md:col-span-7 bg-[#182229] p-4 rounded-2xl border border-white/5 space-y-3 min-h-[180px] flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-white block uppercase tracking-wider font-mono">Active Blocked List ({blockedUsers.length})</span>
                    
                    {blockedUsers.length === 0 ? (
                      <div className="text-center py-8 text-white/30 text-xs">
                        No blocked contacts found in registry.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {blockedUsers.map((u) => (
                          <div
                            key={u.id}
                            className="flex justify-between items-center p-2.5 bg-black/35 rounded-xl border border-white/5"
                          >
                            <div>
                              <span className="text-xs font-bold text-white block">{u.name}</span>
                              <span className="text-[10px] font-mono text-white/40">{u.phone}</span>
                            </div>
                            <button
                              onClick={() => handleUnblock(u.id)}
                              className="text-[9px] font-black bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all uppercase"
                            >
                              Unblock
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/40 border-t border-white/5 pt-2">
                    <Info className="w-3.5 h-3.5" />
                    <span>These block registrations are synchronized off-line.</span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* E. USER ACTIVITY LOGS (FULL) */}
          {activeSubTab === "history" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Secure system activity log
                  </h4>
                  <p className="text-xs text-white/50">
                    Activity history helps verify local translations metrics, offline scores, and calling logs.
                  </p>
                </div>
                {activityLogs.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="py-1 px-2.5 rounded-lg border border-white/10 bg-white/5 text-[9px] font-bold text-red-300 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                  >
                    Clear Log
                  </button>
                )}
              </div>

              {activityLogs.length === 0 ? (
                <div className="bg-[#182229] border border-white/5 rounded-2xl py-12 text-center text-xs text-white/30">
                  No registered activities found. Begin calling or practicing sign-language to populate logs!
                </div>
              ) : (
                <div className="bg-[#182229] border border-white/5 rounded-2xl p-4 space-y-3 max-h-[250px] overflow-y-auto scrollbar-thin">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex justify-between items-center p-2.5 bg-black/25 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex gap-2.5 items-center">
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                        <div>
                          <span className="text-xs font-bold text-white block">{log.title}</span>
                          <span className="text-[10px] text-white/50 block mt-0.5">{log.detail}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-white/30 whitespace-nowrap">{log.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}

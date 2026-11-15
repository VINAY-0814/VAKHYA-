/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Hand,
  Volume2,
  Users,
  Eye,
  Camera,
  Mic,
  Bell,
  Check,
  Languages,
  User,
  Sliders,
  Sparkles,
  Accessibility
} from "lucide-react";
import { UserType, SignLanguage, UserProfile } from "../types";
import { theme } from "../theme";

interface UserSelectionOnboardingProps {
  phoneNumber: string;
  onComplete: (profile: UserProfile) => void;
}

export default function UserSelectionOnboarding({ phoneNumber, onComplete }: UserSelectionOnboardingProps) {
  const [step, setStep] = useState<"usertype" | "languages" | "profile" | "permissions" | "accessibility">("usertype");

  // Selection states
  const [userType, setUserType] = useState<UserType | null>(null);
  const [signLanguage, setSignLanguage] = useState<SignLanguage>(SignLanguage.ASL);
  const [spokenLang, setSpokenLang] = useState("English (US)");
  const [voiceName, setVoiceName] = useState("Zephyr");
  const [pitch, setPitch] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const [warmth, setWarmth] = useState(70);

  // Profile states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("https://api.dicebear.com/7.x/pixel-art/svg?seed=vakhya1");

  // Permissions simulation triggers
  const [camPerm, setCamPerm] = useState(false);
  const [micPerm, setMicPerm] = useState(false);
  const [notifPerm, setNotifPerm] = useState(false);

  // Accessibility states
  const [textSize, setTextSize] = useState<"small" | "normal" | "large">("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [captionStyle, setCaptionStyle] = useState<"standard" | "large-bg" | "outline">("standard");

  const avatarPresets = [
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=vakhya1",
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=vakhya2",
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=vakhya3",
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=vakhya4",
  ];

  const requestPermissionSimulated = async (type: "camera" | "microphone" | "notifications") => {
    if (type === "camera") {
      try {
        const stream = await navigator.mediaDevices?.getUserMedia({ video: true });
        stream?.getTracks().forEach((t) => t.stop());
      } catch {
        // Headless fallback
      }
      setCamPerm(true);
    } else if (type === "microphone") {
      try {
        const stream = await navigator.mediaDevices?.getUserMedia({ audio: true });
        stream?.getTracks().forEach((t) => t.stop());
      } catch {
        // Headless fallback
      }
      setMicPerm(true);
    } else if (type === "notifications") {
      try {
        if (typeof Notification !== "undefined" && Notification.requestPermission) {
          await Notification.requestPermission();
        }
      } catch {
        // Headless fallback
      }
      setNotifPerm(true);
    }
  };

  const handleFinish = () => {
    const finalProfile: UserProfile = {
      name: name || `VakhyaUser_${phoneNumber.slice(-4)}`,
      userType: userType || UserType.DEAF_OR_HARD_OF_HEARING,
      primarySignLanguage: signLanguage,
      spokenLanguage: spokenLang,
      avatarUrl,
      backupEmail: email || undefined,
      phone: phoneNumber,
      voiceSettings: {
        voiceId: voiceName.toLowerCase(),
        voiceName,
        pitch,
        speed,
        warmth,
        cloningEnabled: false,
        clonedVoiceSampled: false,
      },
      accessibilitySettings: {
        textSize,
        highContrast,
        reducedMotion,
        hapticIntensity: "medium",
        captionStyle,
      },
    };
    onComplete(finalProfile);
  };

  return (
    <div
      id="selection-onboarding-container"
      className="min-h-screen flex flex-col items-center justify-center p-6 text-[var(--text-primary)] relative overflow-hidden"
      style={{ background: "var(--bg-gradient)" }}
    >
      <div className="absolute w-[400px] h-[400px] bg-[var(--glow-color-1)] rounded-full filter blur-[100px] opacity-25 top-10" />
      <div className="absolute w-[400px] h-[400px] bg-[var(--glow-color-2)] rounded-full filter blur-[100px] opacity-15 bottom-10" />

      <div className={`w-full max-w-lg ${theme.styles.glassDark} p-8 z-10`}>
        {/* Step Indicator Progress Bar */}
        <div className="flex gap-1.5 mb-8">
          {["usertype", "languages", "profile", "permissions", "accessibility"].map((s, idx) => {
            const stepsList = ["usertype", "languages", "profile", "permissions", "accessibility"];
            const currentIdx = stepsList.indexOf(step);
            const active = idx <= currentIdx;
            return (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  active ? "bg-gradient-to-r from-[#128C7E] to-[#25D366]" : "bg-[var(--border-subtle)]"
                }`}
              />
            );
          })}
        </div>

        {/* STEP 1: USER TYPE SELECTION */}
        {step === "usertype" && (
          <div className="space-y-6 text-[var(--text-primary)]">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#25D366]">
                Personalize Your Vakhya Space
              </span>
              <h2 className="text-2xl font-bold mt-1 text-[var(--text-primary)]">Select Your Profile Type</h2>
              <p className="text-sm text-[var(--text-secondary)]/80 mt-1.5">
                We adjust the layout, core voice outputs, and onboarding guides based on your type.
              </p>
            </div>

            <div className="space-y-4">
              {/* Card 1: Deaf */}
              <button
                id="type-deaf-btn"
                onClick={() => setUserType(UserType.DEAF_OR_HARD_OF_HEARING)}
                className={`w-full p-5 rounded-2xl border text-left flex items-start gap-4 transition-all duration-200 cursor-pointer ${
                  userType === UserType.DEAF_OR_HARD_OF_HEARING
                    ? "bg-emerald-500/10 border-[#25D366] ring-2 ring-[#25D366]/30 text-[var(--text-primary)]"
                    : "bg-[var(--glass-input-bg)] border-[var(--border-subtle)] hover:bg-[var(--glass-input-bg-focus)] text-[var(--text-primary)]"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#128C7E] to-[#25D366] flex items-center justify-center flex-shrink-0 text-white">
                  <Hand className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[var(--text-primary)]">I am Deaf / Hard of Hearing</h4>
                  <p className="text-xs text-[var(--text-secondary)]/70 mt-1 leading-relaxed">
                    Convert your hand gestures and signs into spoken vocalizations and text dynamically during calling or physical encounters.
                  </p>
                </div>
              </button>

              {/* Card 2: Hearing */}
              <button
                id="type-hearing-btn"
                onClick={() => setUserType(UserType.HEARING_PERSON)}
                className={`w-full p-5 rounded-2xl border text-left flex items-start gap-4 transition-all duration-200 cursor-pointer ${
                  userType === UserType.HEARING_PERSON
                    ? "bg-emerald-500/10 border-[#25D366] ring-2 ring-[#25D366]/30 text-[var(--text-primary)]"
                    : "bg-[var(--glass-input-bg)] border-[var(--border-subtle)] hover:bg-[var(--glass-input-bg-focus)] text-[var(--text-primary)]"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#075E54] to-[#128C7E] flex items-center justify-center flex-shrink-0 text-white">
                  <Volume2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[var(--text-primary)]">I am a Hearing Person</h4>
                  <p className="text-xs text-[var(--text-secondary)]/70 mt-1 leading-relaxed">
                    Speak naturally. Spoken vocabulary converts instantly into an expressive 3D sign-language avatar overlay on calls.
                  </p>
                </div>
              </button>

              {/* Card 3: Interpreter */}
              <button
                id="type-interpreter-btn"
                onClick={() => setUserType(UserType.INTERPRETER_OR_FAMILY)}
                className={`w-full p-5 rounded-2xl border text-left flex items-start gap-4 transition-all duration-200 cursor-pointer ${
                  userType === UserType.INTERPRETER_OR_FAMILY
                    ? "bg-emerald-500/10 border-[#25D366] ring-2 ring-[#25D366]/30 text-[var(--text-primary)]"
                    : "bg-[var(--glass-input-bg)] border-[var(--border-subtle)] hover:bg-[var(--glass-input-bg-focus)] text-[var(--text-primary)]"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-[#128C7E] dark:text-[#25D366]" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[var(--text-primary)]">I am an Interpreter / Family Member</h4>
                  <p className="text-xs text-[var(--text-secondary)]/70 mt-1 leading-relaxed">
                    Facilitate dual-direction accessibility or assist in custom group conference translation spaces.
                  </p>
                </div>
              </button>
            </div>

            <button
              id="type-next-btn"
              disabled={!userType}
              onClick={() => setStep("languages")}
              className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wider flex items-center justify-center gap-1.5 cursor-pointer ${
                !userType ? "opacity-50 cursor-not-allowed bg-[var(--glass-input-bg)] border border-[var(--border-subtle)] text-[var(--text-secondary)]" : theme.styles.buttonAccent
              }`}
            >
              Continue Preferences
            </button>
          </div>
        )}

        {/* STEP 2: LANGUAGE & SIGN PREFERENCES */}
        {step === "languages" && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#25D366]">
                Ecosystem Settings
              </span>
              <h2 className="text-2xl font-bold mt-1">Language & Sign Preference</h2>
              <p className="text-sm text-white/70 mt-1.5">
                Set standard spoken voices and region-specific sign grammar systems.
              </p>
            </div>

            <div className="space-y-5">
              {/* Spoken Language */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#128C7E] dark:text-[#25D366] uppercase tracking-wider block">
                  Primary Spoken Language
                </label>
                <div className="relative">
                  <Languages className="absolute left-4 top-3.5 w-5 h-5 text-emerald-500" />
                  <select
                    id="spoken-lang-select"
                    value={spokenLang}
                    onChange={(e) => setSpokenLang(e.target.value)}
                    className={`w-full h-12 pl-12 pr-4 rounded-xl text-sm appearance-none ${theme.styles.glassInput}`}
                  >
                    <option value="English (US)">English (US)</option>
                    <option value="English (UK)">English (UK)</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                  </select>
                </div>
              </div>

              {/* Sign Language Preference */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#128C7E] dark:text-[#25D366] uppercase tracking-wider block">
                  Sign Language Grammar Standard
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: SignLanguage.ASL, label: "ASL (American)" },
                    { value: SignLanguage.ISL, label: "ISL (Indian)" },
                    { value: SignLanguage.BSL, label: "BSL (British)" },
                    { value: SignLanguage.LFS, label: "LFS (French)" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      id={`sign-${item.value}-btn`}
                      type="button"
                      onClick={() => setSignLanguage(item.value)}
                      className={`py-3.5 px-4 rounded-xl text-xs font-bold border transition-colors ${
                        signLanguage === item.value
                          ? "bg-gradient-to-r from-[#128C7E] to-[#25D366] border-transparent text-white"
                          : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice presets modulation setup (Only shown for Deaf / Interpreter types or personalized) */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#25D366]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Voice Preset Modulation
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["Zephyr", "Kore", "Puck"].map((name) => (
                    <button
                      key={name}
                      id={`voice-${name}-btn`}
                      type="button"
                      onClick={() => setVoiceName(name)}
                      className={`py-2 px-3 rounded-lg text-[11px] font-bold border transition-colors ${
                        voiceName === name
                          ? "bg-[#25D366]/40 border-[#25D366] text-white"
                          : "bg-white/5 border-white/5 text-white/60"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {/* Pitch and Speed adjustment Sliders */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Pitch: {pitch.toFixed(1)}x</span>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={pitch}
                      onChange={(e) => setPitch(parseFloat(e.target.value))}
                      className="w-2/3 accent-purple-400 cursor-pointer h-1"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Speed: {speed.toFixed(1)}x</span>
                    <input
                      type="range"
                      min="0.6"
                      max="1.6"
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-2/3 accent-purple-400 cursor-pointer h-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep("usertype")}
                className="w-1/3 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold text-xs"
              >
                Back
              </button>
              <button
                id="lang-next-btn"
                type="button"
                onClick={() => setStep("profile")}
                className={`flex-1 py-3 rounded-xl font-bold text-xs ${theme.styles.buttonAccent}`}
              >
                Profile Settings
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PROFILE SETUP */}
        {step === "profile" && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#25D366]">
                Your Avatar identity
              </span>
              <h2 className="text-2xl font-bold mt-1">Profile Configuration</h2>
              <p className="text-sm text-white/70 mt-1.5">
                Set up how other users identify you on VAKHYA space calling.
              </p>
            </div>

            <div className="space-y-5">
              {/* Avatar Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#128C7E] dark:text-[#25D366] uppercase tracking-wider block text-center">
                  Select Profile Avatar
                </label>
                <div className="flex justify-center gap-4">
                  {avatarPresets.map((url) => (
                    <button
                      key={url}
                      id={`avatar-preset-${url.slice(-4)}-btn`}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`relative w-16 h-16 rounded-full overflow-hidden border-2 p-1 bg-white/10 transition-transform ${
                        avatarUrl === url ? "border-[#25D366] scale-110" : "border-transparent opacity-60"
                      }`}
                    >
                      <img src={url} alt="preset avatar" className="w-full h-full rounded-full" referrerPolicy="no-referrer" />
                      {avatarUrl === url && (
                        <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center border border-[#111B21]">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

               {/* Name Entry */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#128C7E] dark:text-[#25D366] uppercase tracking-wider block">
                  Profile Nickname
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-emerald-500" />
                  <input
                    id="profile-name-input"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full h-12 pl-12 pr-4 rounded-xl text-sm font-medium ${theme.styles.glassInput}`}
                    required
                  />
                </div>
              </div>

              {/* Email Entry */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#128C7E] dark:text-[#25D366] uppercase tracking-wider block">
                  Backup Email Address (Optional)
                </label>
                <input
                  id="profile-email-input"
                  type="email"
                  placeholder="e.g. backup@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full h-12 px-4 rounded-xl text-sm ${theme.styles.glassInput}`}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep("languages")}
                className="w-1/3 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold text-xs"
              >
                Back
              </button>
              <button
                id="profile-next-btn"
                type="button"
                disabled={!name}
                onClick={() => setStep("permissions")}
                className={`flex-1 py-3 rounded-xl font-bold text-xs ${
                  !name ? "opacity-50 cursor-not-allowed bg-white/5 border border-white/10" : theme.styles.buttonAccent
                }`}
              >
                Hardware Permissions
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: PERMISSIONS PRIMER */}
        {step === "permissions" && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#25D366]">
                Secure Consent Primer
              </span>
              <h2 className="text-2xl font-bold mt-1">Hardware Authorization</h2>
              <p className="text-sm text-white/70 mt-1.5">
                Vakhya requires hardware interface access for core live translation loops.
              </p>
            </div>

            <div className="space-y-4">
              {/* Camera permission card */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                    <Camera className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs">Video Stream & Sign Camera</h5>
                    <p className="text-[10px] text-white/50 leading-relaxed max-w-xs">
                      Required for real-time skeletal sign hand-landmark analysis.
                    </p>
                  </div>
                </div>
                <button
                  id="perm-camera-btn"
                  type="button"
                  onClick={() => requestPermissionSimulated("camera")}
                  className={`py-1.5 px-3.5 rounded-full text-[10px] font-bold border transition-colors ${
                    camPerm
                      ? "bg-green-500/20 border-green-500 text-green-300"
                      : "bg-white/5 border-white/15 text-white hover:bg-white/10"
                  }`}
                >
                  {camPerm ? "Granted" : "Authorize"}
                </button>
              </div>

              {/* Mic permission card */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                    <Mic className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs">Audio Capture & Vocals</h5>
                    <p className="text-[10px] text-white/50 leading-relaxed max-w-xs">
                      Enables real-time speech translation and vocal recognition services.
                    </p>
                  </div>
                </div>
                <button
                  id="perm-microphone-btn"
                  type="button"
                  onClick={() => requestPermissionSimulated("microphone")}
                  className={`py-1.5 px-3.5 rounded-full text-[10px] font-bold border transition-colors ${
                    micPerm
                      ? "bg-green-500/20 border-green-500 text-green-300"
                      : "bg-white/5 border-white/15 text-white hover:bg-white/10"
                  }`}
                >
                  {micPerm ? "Granted" : "Authorize"}
                </button>
              </div>

              {/* Notification permission card */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                    <Bell className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs">Call Alerts & Notifications</h5>
                    <p className="text-[10px] text-white/50 leading-relaxed max-w-xs">
                      Receives background incoming call signaling pings instantly.
                    </p>
                  </div>
                </div>
                <button
                  id="perm-notifications-btn"
                  type="button"
                  onClick={() => requestPermissionSimulated("notifications")}
                  className={`py-1.5 px-3.5 rounded-full text-[10px] font-bold border transition-colors ${
                    notifPerm
                      ? "bg-green-500/20 border-green-500 text-green-300"
                      : "bg-white/5 border-white/15 text-white hover:bg-white/10"
                  }`}
                >
                  {notifPerm ? "Granted" : "Authorize"}
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setStep("profile")}
                className="w-1/3 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold text-xs"
              >
                Back
              </button>
              <button
                id="perm-next-btn"
                type="button"
                onClick={() => setStep("accessibility")}
                className={`flex-1 py-3 rounded-xl font-bold text-xs ${theme.styles.buttonAccent}`}
              >
                Accessibility setup
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: ACCESSIBILITY PREFERENCES */}
        {step === "accessibility" && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#25D366]">
                Accessibility-First Design
              </span>
              <h2 className="text-2xl font-bold mt-1">Interface Optimization</h2>
              <p className="text-sm text-white/70 mt-1.5">
                We believe in total accessibility control. Optimize your visual parameters.
              </p>
            </div>

            <div className="space-y-4">
              {/* Text Size Slider/Selector */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px]">
                    Adaptive Text Zoom
                  </span>
                  <span className="font-semibold text-white/80 capitalize">{textSize} text</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["small", "normal", "large"] as const).map((sz) => (
                    <button
                      key={sz}
                      id={`accessibility-text-${sz}-btn`}
                      type="button"
                      onClick={() => setTextSize(sz)}
                      className={`py-2 rounded-lg text-xs font-bold border capitalize transition-colors ${
                        textSize === sz
                          ? "bg-[#25D366]/40 border-[#25D366] text-white"
                          : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3">
                {/* High Contrast */}
                <button
                  id="accessibility-contrast-toggle"
                  type="button"
                  onClick={() => setHighContrast(!highContrast)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-colors ${
                    highContrast ? "bg-[#25D366]/40 border-[#25D366]" : "bg-white/5 border-white/10"
                  }`}
                >
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold">High Contrast</span>
                </button>

                {/* Reduced Motion */}
                <button
                  id="accessibility-motion-toggle"
                  type="button"
                  onClick={() => setReducedMotion(!reducedMotion)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-colors ${
                    reducedMotion ? "bg-[#25D366]/40 border-[#25D366]" : "bg-white/5 border-white/10"
                  }`}
                >
                  <Accessibility className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold">Reduced Motion</span>
                </button>
              </div>

              {/* Caption Styles */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] block">
                  Captions Overlay Style
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "standard", label: "Standard" },
                    { value: "large-bg", label: "Large BG" },
                    { value: "outline", label: "Outline" },
                  ].map((style) => (
                    <button
                      key={style.value}
                      id={`accessibility-caption-${style.value}-btn`}
                      type="button"
                      onClick={() => setCaptionStyle(style.value as any)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                        captionStyle === style.value
                          ? "bg-[#25D366]/40 border-[#25D366] text-white"
                          : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep("permissions")}
                className="w-1/3 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold text-xs"
              >
                Back
              </button>
              <button
                id="complete-onboarding-btn"
                type="button"
                onClick={handleFinish}
                className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 ${theme.styles.buttonAccent}`}
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                Launch Vakhya Space
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

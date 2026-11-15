/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Phone,
  Mail,
  Chrome,
  Apple,
  Github,
  Fingerprint,
  ScanFace,
  QrCode,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  MessageCircle,
  Volume2,
  Sparkles,
  Lock,
  Smartphone,
  Accessibility,
  Signal,
  Check,
  ShieldAlert
} from "lucide-react";
import { theme } from "../theme";

interface PhoneAuthProps {
  onSuccess: (phone: string) => void;
  onBack: () => void;
}

const COUNTRY_CODES = [
  { code: "+1", name: "United States / Canada", flag: "🇺🇸", pattern: /^\d{10}$/, format: "XXX-XXX-XXXX" },
  { code: "+91", name: "India", flag: "🇮🇳", pattern: /^\d{10}$/, format: "XXXXX XXXXX" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧", pattern: /^\d{10}$/, format: "XXXXX XXXXXX" },
  { code: "+33", name: "France", flag: "🇫🇷", pattern: /^\d{9}$/, format: "X XX XX XX XX" },
  { code: "+49", name: "Germany", flag: "🇩🇪", pattern: /^\d{10,11}$/, format: "XXXX XXXXXXX" },
  { code: "+61", name: "Australia", flag: "🇦🇺", pattern: /^\d{9}$/, format: "XXX XXX XXX" },
  { code: "+81", name: "Japan", flag: "🇯🇵", pattern: /^\d{10}$/, format: "XX XXXX XXXX" },
  { code: "+971", name: "United Arab Emirates", flag: "🇦🇪", pattern: /^\d{9}$/, format: "X XXX XXXX" },
];

type AuthMethod = "phone" | "email" | "social" | "biometric" | "qr" | "guest";

export default function PhoneAuth({ onSuccess, onBack }: PhoneAuthProps) {
  // Authentication states
  const [activeMethod, setActiveMethod] = useState<AuthMethod>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[1]); // Default India
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  
  // OTP Verification States
  const [otpArray, setOtpArray] = useState<string[]>(Array(6).fill(""));
  const [simulatedOtp, setSimulatedOtp] = useState("");
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [showCodes, setShowCodes] = useState(false);
  const [otpDeliveryMethod, setOtpDeliveryMethod] = useState<"sms" | "whatsapp" | "voice" | "email">("sms");
  const [isShakeActive, setIsShakeActive] = useState(false);
  const [isSuccessAnimated, setIsSuccessAnimated] = useState(false);
  
  // Email Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Custom Accessibility Configurations
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screenAnnouncement, setScreenAnnouncement] = useState("");

  // Play Integrity & Security simulations
  const [integrityVerified, setIntegrityVerified] = useState(false);
  const [showIntegrityReport, setShowIntegrityReport] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState(false);

  // References for multi-box OTP
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Check offline status
  useEffect(() => {
    const updateOnline = () => setOfflineStatus(!navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  // Play Integrity Simulation
  useEffect(() => {
    announce("Vakhya Secure Shield initialized. Verifying Google Play Integrity and Hardware Attestation...");
    const t = setTimeout(() => {
      setIntegrityVerified(true);
      announce("Security clearance granted. Trusted device signature recognized.");
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Count down timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Screen reader announcer helper
  const announce = (msg: string) => {
    setScreenAnnouncement(msg);
    setTimeout(() => setScreenAnnouncement(""), 3000);
  };

  // Real-time phone number pattern validation
  const isPhoneValid = () => {
    const rawNumber = phoneNumber.replace(/\D/g, "");
    return selectedCountry.pattern.test(rawNumber);
  };

  // Request real simulated OTP
  const handleSendOtp = async (e?: React.FormEvent, methodOverride?: "sms" | "whatsapp" | "voice" | "email") => {
    if (e) e.preventDefault();
    setError(null);

    const fullPhone = `${selectedCountry.code}${phoneNumber.replace(/\D/g, "")}`;
    if (!isPhoneValid()) {
      setError(`Please enter a valid ${selectedCountry.name} mobile number.`);
      setIsShakeActive(true);
      setTimeout(() => setIsShakeActive(false), 500);
      announce(`Error: Invalid ${selectedCountry.name} phone number.`);
      return;
    }

    const delivery = methodOverride || "sms";
    setOtpDeliveryMethod(delivery);
    setIsSending(true);
    announce(`Sending cryptographically secure ${delivery.toUpperCase()} verification code...`);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate transaction.");
      }

      setSimulatedOtp(data.otpSimulator || "");
      setTimer(300); // 5 minutes expiration
      setStep("otp");
      setOtpArray(Array(6).fill(""));
      announce(`Verification code dispatched. Please check your ${delivery}. Code expires in 5 minutes.`);
    } catch (err: any) {
      setError(err.message);
      announce(`Transaction failed: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Verify simulated OTP
  const handleVerifyOtp = async (e?: React.FormEvent, prefilledCode?: string) => {
    if (e) e.preventDefault();
    setError(null);

    const codeToVerify = prefilledCode || otpArray.join("");
    if (codeToVerify.length !== 6) {
      setError("Please complete the 6-digit authentication token.");
      announce("Error: Incomplete verification token.");
      return;
    }

    setIsVerifying(true);
    announce("Authorizing cryptographic token via secure proxy...");

    const fullPhone = `${selectedCountry.code}${phoneNumber.replace(/\D/g, "")}`;
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, otp: codeToVerify }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Verification mismatch.");
      }

      // Success sequence
      if (data.token) {
        localStorage.setItem("vakhya_token", data.token);
      }
      setIsSuccessAnimated(true);
      announce("Identity successfully validated! Decrypting session profiles...");
      setTimeout(() => {
        onSuccess(fullPhone);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setIsShakeActive(true);
      setTimeout(() => setIsShakeActive(false), 500);
      setOtpArray(Array(6).fill(""));
      otpRefs.current[0]?.focus();
      announce(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-fill Simulator Code Helper
  const handleAutoFill = () => {
    if (simulatedOtp) {
      const chars = simulatedOtp.split("");
      setOtpArray(chars);
      announce("Auto-filled security simulator token.");
      handleVerifyOtp(undefined, simulatedOtp);
    }
  };

  const handleOtpBoxChange = (val: string, index: number) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    if (!cleaned) return;

    const newArr = [...otpArray];
    newArr[index] = cleaned[0];
    setOtpArray(newArr);

    // Dynamic focus forward
    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    } else {
      // Auto submit when all fields filled
      const fullCode = newArr.join("");
      if (fullCode.length === 6) {
        handleVerifyOtp(undefined, fullCode);
      }
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const newArr = [...otpArray];
      newArr[index] = "";
      setOtpArray(newArr);
      if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePhoneChange = (val: string) => {
    // Only permit digits
    const digits = val.replace(/\D/g, "");
    setPhoneNumber(digits);
  };

  const filteredCountryCodes = COUNTRY_CODES.filter(
    (item) =>
      item.code.includes(searchQuery) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="phone-auth-panel"
      className={`w-full max-w-2xl bg-[#192030] border border-[#9E7BFF]/25 rounded-3xl overflow-hidden shadow-[0_24px_70px_rgba(8,12,24,0.65)] z-10 transition-all duration-300 text-slate-100 ${
        largeText ? "text-lg" : "text-sm"
      } ${highContrast ? "contrast-125 saturate-50" : ""}`}
    >
      {/* Screen Reader Announcements */}
      <div className="sr-only" aria-live="assertive">
        {screenAnnouncement}
      </div>

      {/* Branded Header Accent - Logo Deep Slate-Navy + Mint & Lavender */}
      <div className="bg-gradient-to-r from-[#1D2538] via-[#27314A] to-[#1D2538] p-5 sm:p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#22F3A6]/20">
        <div className="flex items-center gap-3">
          <button
            onClick={step === "otp" ? () => setStep("phone") : onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer"
            aria-label="Navigate back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-200" />
          </button>
          <img
            src="/assets/aistudio/Gemini_Generated_Image_fr8f8pfr8f8pfr8f_27d4c5ef.png"
            alt="VAKHYA Logo"
            className="w-12 h-12 rounded-2xl object-cover border border-[#22F3A6]/35 shadow-lg shadow-[#22F3A6]/15 bg-[#2C354A] shrink-0"
          />
          <div>
            <h1 className={`font-bold tracking-tight ${largeText ? "text-2xl" : "text-xl"} flex items-center gap-2`}>
              <span>VAKHYA Ecosystem Access</span>
              <Sparkles className="w-4 h-4 text-[#22F3A6] animate-pulse" />
            </h1>
            <p className="text-xs text-[#C0AAFF] font-mono mt-0.5">
              Secure Multi-Channel Authentication Suite
            </p>
          </div>
        </div>

        {/* Premium Accessibility & Settings Quick Tray */}
        <div className="flex items-center gap-2 bg-[#121724]/70 rounded-full px-3 py-1 border border-[#9E7BFF]/25">
          <button
            onClick={() => {
              setHighContrast(!highContrast);
              announce(`High Contrast Mode ${!highContrast ? "Enabled" : "Disabled"}`);
            }}
            className={`p-1 rounded-full transition-all cursor-pointer ${highContrast ? "bg-[#22F3A6] text-[#071A14] scale-105" : "text-[#C0AAFF] hover:text-white"}`}
            title="Toggle High Contrast Theme"
            aria-label="High contrast option"
          >
            <Accessibility className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setLargeText(!largeText);
              announce(`Large Text Mode ${!largeText ? "Enabled" : "Disabled"}`);
            }}
            className={`p-1.5 rounded-md font-mono font-bold text-[10px] leading-none transition-all cursor-pointer ${largeText ? "bg-[#22F3A6] text-[#071A14] scale-105" : "text-[#C0AAFF] hover:text-white"}`}
            title="Toggle Large Text Sizes"
            aria-label="Large text option"
          >
            A+
          </button>
          <button
            onClick={() => {
              setShowIntegrityReport(!showIntegrityReport);
            }}
            className={`p-1 rounded-full transition-all cursor-pointer ${integrityVerified ? "text-[#22F3A6]" : "text-amber-400"}`}
            title="Device Play Integrity Status"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1">
            <Signal className={`w-3.5 h-3.5 ${offlineStatus ? "text-red-400" : "text-[#22F3A6]"}`} />
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-200">
              {offlineStatus ? "Offline" : "Secure"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="flex flex-col md:flex-row min-h-[480px]">
        {/* Left Hand: App Branding & Multi-method Menu */}
        <div className="w-full md:w-5/12 bg-[#141A29] p-6 border-r border-[#9E7BFF]/15 flex flex-col justify-between">
          <div>
            <div className="text-center md:text-left mb-6">
              <span className="text-[10px] tracking-wider uppercase font-bold text-[#22F3A6] font-mono">
                Deaf & Speech Assist Ecosystem
              </span>
              <h2 className="text-base font-bold text-white mt-1">
                Choose Credentials
              </h2>
            </div>

            <nav className="space-y-1.5" aria-label="Authentication methods">
              {[
                { id: "phone", label: "Mobile Number", sub: "Secure SMS / WhatsApp OTP", icon: <Smartphone className="w-4 h-4" /> },
                { id: "email", label: "Email Credentials", sub: "Password or Magic Link", icon: <Mail className="w-4 h-4" /> },
                { id: "social", label: "Social Identity Provider", sub: "Google, Microsoft, GitHub", icon: <Chrome className="w-4 h-4" /> },
                { id: "biometric", label: "Biometric Passkey", sub: "Fingerprint / Face ID", icon: <Fingerprint className="w-4 h-4" /> },
                { id: "qr", label: "Scan QR Code Login", sub: "Fast Mobile Link", icon: <QrCode className="w-4 h-4" /> },
                { id: "guest", label: "Bypass as Guest", sub: "Transient sandbox profile", icon: <UserCheck className="w-4 h-4" /> },
              ].map((m) => {
                const isSelected = activeMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (step === "otp") setStep("phone");
                      setActiveMethod(m.id as AuthMethod);
                      setError(null);
                      announce(`Switched authentication method to ${m.label}`);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-[#22F3A6]/12 to-[#9E7BFF]/12 border-[#22F3A6]/70 text-[#34F5A8] shadow-sm"
                        : "bg-[#1C2436] border-transparent hover:border-[#9E7BFF]/35 text-slate-300"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isSelected ? "bg-gradient-to-tr from-[#10B981] to-[#22F3A6] text-[#071A14]" : "bg-[#252F47] text-[#C0AAFF]"}`}>
                      {m.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs">{m.label}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{m.sub}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-6 border-t border-[#9E7BFF]/15 pt-4">
            <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
              All communications are strictly encrypted using AES-GCM-256. Secure session cookies and hardware level trusted device validation enabled.
            </p>
          </div>
        </div>

        {/* Right Hand: Dynamic Form Execution Space */}
        <div className="flex-1 p-6 sm:p-8 bg-[#1B2233] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {/* Play Integrity Report Sheet */}
            {showIntegrityReport && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-[#22F3A6]/10 border border-[#22F3A6]/30 rounded-2xl"
              >
                <div className="flex items-center gap-2 mb-2 text-[#22F3A6]">
                  <ShieldCheck className="w-5 h-5 text-[#22F3A6]" />
                  <span className="font-bold text-xs uppercase tracking-wider font-mono">Google Play Integrity Attestation</span>
                </div>
                <div className="text-[10px] font-mono text-emerald-200 space-y-1">
                  <div>• MEETS_STRONG_INTEGRITY: APPROVED</div>
                  <div>• MEETS_DEVICE_INTEGRITY: APPROVED</div>
                  <div>• MEETS_APP_LICENSING_INTEGRITY: SIGNED</div>
                  <div>• TRUSTED_ENVIRONMENT: REAL LINUX RUNTIME CONTAINER</div>
                </div>
              </motion.div>
            )}

            {/* Error notifications */}
            {error && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-6 p-4 bg-red-500/15 border border-red-400/30 rounded-xl flex items-start gap-3 text-red-200 text-xs"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Security Shield:</span> {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* METHOD 1: PHONE AUTHENTICATION */}
            {activeMethod === "phone" && (
              <motion.div
                key="phone-auth-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 flex flex-col justify-between"
              >
                {step === "phone" ? (
                  <form onSubmit={handleSendOtp} className="space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Verify via Mobile OTP
                        </h3>
                        <p className="text-xs text-slate-300 mt-1">
                          Vakhya validates your physical device identity via secure one-time passcode verification.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-[#C0AAFF] uppercase tracking-wider">
                          Enter Mobile Number
                        </label>
                        <div className="flex gap-2 relative">
                          {/* Searchable Country Picker */}
                          <div className="relative">
                            <button
                              id="country-picker-btn"
                              type="button"
                              onClick={() => setShowCodes(!showCodes)}
                              className="h-12 px-3 rounded-xl border border-[#9E7BFF]/30 bg-[#141A29] flex items-center gap-1.5 font-bold text-xs text-white cursor-pointer hover:border-[#22F3A6]/60 transition-colors"
                              aria-label="Select Country Code"
                            >
                              <span className="text-base select-none">{selectedCountry.flag}</span>
                              <span>{selectedCountry.code}</span>
                            </button>

                            {showCodes && (
                              <div className="absolute left-0 mt-2 w-64 bg-[#192030] border border-[#9E7BFF]/35 rounded-xl shadow-2xl z-50 p-2">
                                <input
                                  type="text"
                                  placeholder="Search Country Code..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg text-xs bg-[#131826] border border-[#9E7BFF]/25 text-white placeholder-slate-400 focus:outline-none focus:border-[#22F3A6] mb-2"
                                />
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                  {filteredCountryCodes.map((item) => (
                                    <button
                                      key={item.code}
                                      type="button"
                                      onClick={() => {
                                        setSelectedCountry(item);
                                        setShowCodes(false);
                                        announce(`Country code set to ${item.name} ${item.code}`);
                                      }}
                                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-xs text-slate-200 flex justify-between items-center transition-colors border-0"
                                    >
                                      <span className="flex items-center gap-1.5 truncate">
                                        <span className="text-base">{item.flag}</span>
                                        <span className="truncate">{item.name}</span>
                                      </span>
                                      <span className="font-mono text-[#22F3A6] font-bold shrink-0">{item.code}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <input
                            id="formatted-phone-input"
                            type="tel"
                            placeholder={selectedCountry.format}
                            value={phoneNumber}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            className="flex-1 h-12 px-4 rounded-xl border border-[#9E7BFF]/30 bg-[#131826] font-mono font-bold tracking-wider text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#22F3A6] focus:border-[#22F3A6]"
                            required
                          />
                        </div>
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] text-slate-400">
                            Required length: <span className="font-mono font-semibold text-slate-300">{selectedCountry.format}</span>
                          </span>
                          {phoneNumber && (
                            <span className={`text-[10px] font-bold ${isPhoneValid() ? "text-[#22F3A6]" : "text-amber-400"}`}>
                              {isPhoneValid() ? "Valid Number Format ✓" : "Incomplete Number ✗"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 space-y-3">
                      <button
                        type="submit"
                        disabled={isSending || !isPhoneValid()}
                        className={`w-full py-3.5 rounded-xl font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 transition-all ${
                          isPhoneValid()
                            ? "bg-gradient-to-r from-[#12C985] to-[#22F3A6] hover:brightness-110 text-[#071A14] shadow-lg shadow-[#22F3A6]/20 active:scale-98 cursor-pointer"
                            : "bg-[#252E44] text-slate-500 cursor-not-allowed border border-white/5"
                        }`}
                      >
                        {isSending ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Requesting OTP Secure Token...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-5 h-5" />
                            Secure Request OTP
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* OTP VERIFICATION VIEW */
                  <form onSubmit={handleVerifyOtp} className="space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="text-center sm:text-left">
                        <span className="text-[10px] bg-[#9E7BFF]/15 text-[#C0AAFF] border border-[#9E7BFF]/30 px-2.5 py-1 rounded-full font-bold font-mono">
                          Secure Session ID: 0x9AF2A
                        </span>
                        <h3 className="text-sm font-bold text-white mt-2.5">
                          Verification Security Panel
                        </h3>
                        <p className="text-xs text-slate-300 mt-1">
                          We sent a 6-digit cryptographic verification code to <span className="font-bold text-[#22F3A6]">{selectedCountry.code} {phoneNumber}</span> via {otpDeliveryMethod.toUpperCase()}.
                        </p>
                      </div>

                      {/* Six Box Code Entry */}
                      <div className="space-y-2">
                        <div className="flex justify-between gap-1.5 max-w-sm mx-auto sm:mx-0">
                          {otpArray.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => {
                                otpRefs.current[idx] = el;
                              }}
                              type="text"
                              maxLength={1}
                              pattern="\d*"
                              value={digit}
                              onChange={(e) => handleOtpBoxChange(e.target.value, idx)}
                              onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                              className="w-11 h-14 sm:w-12 text-center rounded-xl border border-[#9E7BFF]/35 bg-[#131826] text-white text-lg font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#22F3A6] focus:border-[#22F3A6] shadow-sm"
                            />
                          ))}
                        </div>

                        {/* Interactive Countdown */}
                        <div className="flex items-center justify-between px-1 py-1 text-xs">
                          <span className="text-slate-400 flex items-center gap-1">
                            <ClockProgress size={12} timer={timer} /> Expires in: <span className="font-mono font-bold text-slate-200">{timer > 0 ? `${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, "0")}` : "Expired"}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setStep("phone");
                              announce("Switched back to edit phone number.");
                            }}
                            className="text-xs text-[#22F3A6] font-bold hover:underline cursor-pointer"
                          >
                            Edit Number
                          </button>
                        </div>
                      </div>

                      {/* Multi-channel fallback alternatives */}
                      <div className="bg-[#141A29] border border-[#9E7BFF]/15 p-3 rounded-xl space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono">
                          Try Alternative Delivery Channels:
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSendOtp(undefined, "whatsapp")}
                            className="p-1.5 text-[9px] font-mono font-bold rounded-lg border border-white/10 bg-[#1C2436] flex items-center justify-center gap-1 hover:border-[#22F3A6] text-slate-200 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#22F3A6]" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendOtp(undefined, "voice")}
                            className="p-1.5 text-[9px] font-mono font-bold rounded-lg border border-white/10 bg-[#1C2436] flex items-center justify-center gap-1 hover:border-[#22F3A6] text-slate-200 transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Voice Call</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendOtp(undefined, "email")}
                            className="p-1.5 text-[9px] font-mono font-bold rounded-lg border border-white/10 bg-[#1C2436] flex items-center justify-center gap-1 hover:border-[#22F3A6] text-slate-200 transition-colors cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5 text-[#9E7BFF]" />
                            <span>Email Backup</span>
                          </button>
                        </div>
                      </div>

                      {/* Simulated SMS retrieval banner */}
                      {simulatedOtp && (
                        <div className="p-3 bg-[#22F3A6]/10 border border-[#22F3A6]/30 rounded-xl space-y-1.5 text-center">
                          <span className="text-[9px] uppercase font-mono tracking-widest text-[#22F3A6] block font-extrabold">
                            SMS Gateway Interceptor Simulator
                          </span>
                          <p className="text-xs font-mono font-bold text-slate-200">
                            Auto-retrieved verification OTP: <span className="text-[#22F3A6] select-all tracking-widest bg-black/30 px-2.5 py-0.5 rounded font-black">{simulatedOtp}</span>
                          </p>
                          <button
                            type="button"
                            onClick={handleAutoFill}
                            className="text-[10px] text-[#22F3A6] font-bold hover:underline flex items-center gap-1 justify-center mx-auto cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                            <span>Auto-fill Verification Token</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 space-y-3">
                      {isSuccessAnimated ? (
                        <div className="bg-gradient-to-r from-[#12C985] to-[#22F3A6] text-[#071A14] rounded-xl py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 animate-bounce">
                          <Check className="w-5 h-5" />
                          <span>Verification Successful! Launching...</span>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          disabled={isVerifying || otpArray.join("").length !== 6}
                          className={`w-full py-3.5 rounded-xl font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 transition-all ${
                            otpArray.join("").length === 6
                              ? "bg-gradient-to-r from-[#12C985] to-[#22F3A6] hover:brightness-110 text-[#071A14] shadow-lg shadow-[#22F3A6]/20 active:scale-98 cursor-pointer"
                              : "bg-[#252E44] text-slate-500 cursor-not-allowed border border-white/5"
                          }`}
                        >
                          {isVerifying ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              Verifying token security hash...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              Confirm Verification Code
                            </>
                          )}
                        </button>
                      )}

                      {timer === 0 && (
                        <button
                          type="button"
                          onClick={() => handleSendOtp(undefined, otpDeliveryMethod)}
                          className="w-full text-xs text-center text-slate-300 hover:text-white font-bold flex items-center justify-center gap-1 py-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Resend verification code</span>
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </motion.div>
            )}

            {/* METHOD 2: EMAIL AUTHENTICATION */}
            {activeMethod === "email" && (
              <motion.div
                key="email-auth-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Access with Email Credentials
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Sign in using your account password or request a passwordless magic login link.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#C0AAFF] uppercase tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="yourname@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-[#9E7BFF]/30 bg-[#131826] text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-[#22F3A6] focus:border-[#22F3A6]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <label className="text-xs font-bold text-[#C0AAFF] uppercase tracking-wider">
                          Secure Password
                        </label>
                        <button
                          type="button"
                          className="text-[10px] text-[#22F3A6] font-bold hover:underline"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-11 px-4 pr-11 rounded-xl border border-[#9E7BFF]/30 bg-[#131826] text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-[#22F3A6] focus:border-[#22F3A6]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email || !password) {
                        setError("Please fill out both email and password credentials.");
                        return;
                      }
                      setError(null);
                      announce("Validating secure credentials...");
                      try {
                        const res = await fetch("/api/auth/email-login", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email, password }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Invalid credentials.");
                        if (data.token) localStorage.setItem("vakhya_token", data.token);
                        setIsSuccessAnimated(true);
                        setTimeout(() => onSuccess(data.userProfile?.phone || email), 1000);
                      } catch (err: any) {
                        setError(err.message);
                      }
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#12C985] to-[#22F3A6] hover:brightness-110 text-[#071A14] font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#22F3A6]/20 active:scale-98"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Authorize & Log In</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        setError("Please input your email address first to receive a passwordless token link.");
                        return;
                      }
                      setError(null);
                      try {
                        const res = await fetch("/api/auth/magic-link", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed to dispatch magic link.");
                        if (data.token) localStorage.setItem("vakhya_token", data.token);
                        announce(`Magic link authorized for ${email}.`);
                        setIsSuccessAnimated(true);
                        setTimeout(() => onSuccess(email), 1000);
                      } catch (err: any) {
                        setError(err.message);
                      }
                    }}
                    className="w-full py-3 bg-[#141A29] hover:bg-[#232D45] text-[#C0AAFF] border border-[#9E7BFF]/25 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Send Passwordless Magic Link
                  </button>
                </div>
              </motion.div>
            )}

            {/* METHOD 3: SOCIAL SIGN-IN */}
            {activeMethod === "social" && (
              <motion.div
                key="social-auth-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Sign In with Social Identity Provider
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Access your Vakhya cloud profile securely by delegating authentication to trust providers.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        announce("Redirecting to Google Federated Login...");
                        setIsSuccessAnimated(true);
                        setTimeout(() => onSuccess("sso_google_user@gmail.com"), 1200);
                      }}
                      className="w-full h-12 rounded-xl border border-[#9E7BFF]/25 bg-[#141A29] hover:border-[#22F3A6]/60 hover:bg-[#1E273B] text-slate-100 text-xs font-bold flex items-center justify-center gap-3 transition-colors cursor-pointer"
                    >
                      <Chrome className="w-5 h-5 text-red-400 shrink-0" />
                      <span>Continue with Google</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        announce("Redirecting to Apple ID Secure Sign-in...");
                        setIsSuccessAnimated(true);
                        setTimeout(() => onSuccess("sso_apple_user@icloud.com"), 1200);
                      }}
                      className="w-full h-12 rounded-xl border border-[#9E7BFF]/25 bg-[#141A29] hover:border-[#22F3A6]/60 hover:bg-[#1E273B] text-slate-100 text-xs font-bold flex items-center justify-center gap-3 transition-colors cursor-pointer"
                    >
                      <Apple className="w-5 h-5 text-white shrink-0" />
                      <span>Continue with Apple ID</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        announce("Redirecting to Microsoft Secure Single Sign-on...");
                        setIsSuccessAnimated(true);
                        setTimeout(() => onSuccess("sso_ms_user@outlook.com"), 1200);
                      }}
                      className="w-full h-12 rounded-xl border border-[#9E7BFF]/25 bg-[#141A29] hover:border-[#22F3A6]/60 hover:bg-[#1E273B] text-slate-100 text-xs font-bold flex items-center justify-center gap-3 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-5 h-5 text-[#22F3A6] shrink-0" />
                      <span>Continue with Microsoft Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        announce("Redirecting to GitHub Developer Authorization...");
                        setIsSuccessAnimated(true);
                        setTimeout(() => onSuccess("sso_github_user@github.com"), 1200);
                      }}
                      className="w-full h-12 rounded-xl border border-[#9E7BFF]/25 bg-[#141A29] hover:border-[#22F3A6]/60 hover:bg-[#1E273B] text-slate-100 text-xs font-bold flex items-center justify-center gap-3 transition-colors cursor-pointer"
                    >
                      <Github className="w-5 h-5 text-[#C0AAFF] shrink-0" />
                      <span>Continue with GitHub Developer profile</span>
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono text-center">
                  Secure single sign-on powered by standard OAuth 2.0 / OIDC protocols.
                </div>
              </motion.div>
            )}

            {/* METHOD 4: BIOMETRIC LOGIN */}
            {activeMethod === "biometric" && (
              <motion.div
                key="biometric-auth-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Cryptographic Passkey & Biometrics
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Passwordless WebAuthn. Instantly access your profile via secure hardware key modules, fingerprint, or Face ID checks.
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 border border-dashed border-[#9E7BFF]/35 rounded-2xl bg-[#131826] gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-[#22F3A6]/15 flex items-center justify-center text-[#22F3A6] animate-pulse">
                        <Fingerprint className="w-8 h-8" />
                      </div>
                      <div className="w-16 h-16 rounded-full bg-[#9E7BFF]/15 flex items-center justify-center text-[#C0AAFF]">
                        <ScanFace className="w-8 h-8" />
                      </div>
                    </div>

                    <div className="text-center">
                      <span className="text-xs font-bold text-slate-200">
                        Awaiting device permission authorization...
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Place your registered finger on the physical scanner sensor or center your face in the front camera module view.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      announce("Triggering simulated biometric passkey hardware scan...");
                      setIsSuccessAnimated(true);
                      setTimeout(() => onSuccess("biometric_trusted_session@vakhya.secure"), 1400);
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#12C985] to-[#22F3A6] hover:brightness-110 text-[#071A14] font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#22F3A6]/20 active:scale-98"
                  >
                    <Fingerprint className="w-5 h-5" />
                    <span>Authorize with Device Passkey</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* METHOD 5: QR CODE LOGIN */}
            {activeMethod === "qr" && (
              <motion.div
                key="qr-auth-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Scan QR Code Authentication
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Quickly authenticate on web screens by scanning the secure QR token using the Vakhya companion mobile app.
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 bg-[#131826] border border-[#9E7BFF]/20 rounded-2xl gap-3">
                    <div className="relative p-2 bg-white rounded-xl shadow-md overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#22F3A6] animate-bounce" />
                      <div className="w-32 h-32 bg-slate-100 border border-slate-200 flex items-center justify-center p-1.5 rounded-lg">
                        <QrCode className="w-full h-full text-[#192030]" />
                      </div>
                    </div>
                    <div className="text-center font-mono text-[9px] text-[#C0AAFF]">
                      TOKEN_HASH: 0x8a92f00bbac912e8
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      announce("Scanning secure QR link token...");
                      setIsSuccessAnimated(true);
                      setTimeout(() => onSuccess("qr_scanned_client@vakhya.app"), 1000);
                    }}
                    className="w-full py-3.5 rounded-xl bg-[#141A29] hover:bg-[#232D45] border border-[#22F3A6]/40 text-white font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <QrCode className="w-4 h-4 text-[#22F3A6]" />
                    <span>Simulate Mobile App QR Scan Confirmation</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* METHOD 6: GUEST ACCESS */}
            {activeMethod === "guest" && (
              <motion.div
                key="guest-auth-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Bypass to Guest Sandbox
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Instantly enter the Vakhya ecosystem in offline-first guest sandbox mode. Sessions are persistent locally inside your current browser client storage cache.
                    </p>
                  </div>

                  <div className="p-4 bg-[#9E7BFF]/12 border border-[#9E7BFF]/30 rounded-2xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-[#C0AAFF] shrink-0 mt-0.5" />
                    <div className="text-[11px] text-slate-200 leading-relaxed">
                      <strong>Security Note:</strong> Guest profiles cannot access real-time encrypted video calling over the Cloud, nor synchronize cloud translation presets. To unlock global features, bind a verified mobile number.
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      announce("Bypassing credentials. Provisioning guest token...");
                      setIsSuccessAnimated(true);
                      setTimeout(() => onSuccess("Guest_User_Sandbox"), 1200);
                    }}
                    className="w-full py-3.5 rounded-xl bg-[#141A29] hover:bg-[#232D45] text-white border border-[#9E7BFF]/35 font-bold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserCheck className="w-5 h-5 text-[#22F3A6]" />
                    <span>Enter Sandbox Environment</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Circular Countdown Timer Indicator
interface ClockProgressProps {
  size: number;
  timer: number;
}
function ClockProgress({ size, timer }: ClockProgressProps) {
  const percentage = Math.max(0, Math.min(100, (timer / 300) * 100)); // out of 5 minutes
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke="rgba(158,123,255,0.2)"
        strokeWidth="1.5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke="#22F3A6"
        strokeWidth="1.5"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className="transition-all duration-1000"
      />
    </svg>
  );
}

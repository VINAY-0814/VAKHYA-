/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import SplashAndOnboarding from "./components/SplashAndOnboarding";
import PhoneAuth from "./components/PhoneAuth";
import UserSelectionOnboarding from "./components/UserSelectionOnboarding";
import Dashboard from "./components/Dashboard";
import { UserProfile, UserType, SignLanguage } from "./types";

export default function App() {
  const [step, setStep] = useState<"splash" | "auth" | "onboarding" | "dashboard">("splash");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load existing session/profile on startup
  useEffect(() => {
    const savedProfile = localStorage.getItem("vakhya_profile");
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setUserProfile(parsed);
        setStep("dashboard");
      } catch (err) {
        console.error("Failed to parse saved user profile", err);
      }
    }
  }, []);

  const handleSplashFinish = () => {
    setStep("auth");
  };

  const handleAuthSuccess = (phone: string) => {
    setPhoneNumber(phone);
    setStep("onboarding");
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem("vakhya_profile", JSON.stringify(profile));
    setStep("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("vakhya_profile");
    setUserProfile(null);
    setPhoneNumber("");
    setStep("splash");
  };

  const isBrandAuthStage = step === "splash" || step === "auth";

  return (
    <div
      id="vakhya-root-app"
      className={`min-h-screen selection:bg-[#22F3A6]/30 overflow-x-hidden relative transition-colors duration-300 ${
        isBrandAuthStage
          ? "bg-[#151B29] text-slate-100"
          : "bg-[var(--bg-base)] text-[var(--text-primary)]"
      }`}
    >
      {/* Immersive Frosted Glass Ambient Lighting System */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className={`absolute w-[500px] h-[500px] rounded-full blur-[130px] -top-24 -left-20 animate-float-slow transition-colors duration-500 ${
            isBrandAuthStage ? "bg-[#22F3A6]/18" : "bg-[var(--glow-color-1)]"
          }`}
        />
        <div
          className={`absolute w-[450px] h-[450px] rounded-full blur-[120px] -bottom-24 -right-20 animate-float-medium transition-colors duration-500 ${
            isBrandAuthStage ? "bg-[#9E7BFF]/20" : "bg-[var(--glow-color-2)]"
          }`}
        />
        <div
          className={`absolute w-[350px] h-[350px] rounded-full blur-[100px] top-1/2 left-10 -translate-y-1/2 animate-float-slow transition-colors duration-500 ${
            isBrandAuthStage ? "bg-[#2C364E]/45" : "bg-[var(--glow-color-3)]"
          }`}
        />
      </div>

      <div className="relative z-10 min-h-screen">
        <AnimatePresence mode="wait">
          {step === "splash" && (
            <motion.div
              key="splash-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen flex items-center justify-center p-4"
            >
              <SplashAndOnboarding onComplete={handleSplashFinish} />
            </motion.div>
          )}

          {step === "auth" && (
            <motion.div
              key="auth-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen flex items-center justify-center p-4"
            >
              <PhoneAuth onSuccess={handleAuthSuccess} onBack={() => setStep("splash")} />
            </motion.div>
          )}

          {step === "onboarding" && (
            <motion.div
              key="onboarding-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen flex items-center justify-center p-4"
            >
              <UserSelectionOnboarding
                phoneNumber={phoneNumber}
                onComplete={handleOnboardingComplete}
              />
            </motion.div>
          )}

          {step === "dashboard" && userProfile && (
            <motion.div
              key="dashboard-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen"
            >
              <Dashboard profile={userProfile} onLogout={handleLogout} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

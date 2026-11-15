/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Volume2, Hand, MessageSquare, ArrowRight, Accessibility } from "lucide-react";
import { theme } from "../theme";

interface SplashAndOnboardingProps {
  onComplete: () => void;
}

export default function SplashAndOnboarding({ onComplete }: SplashAndOnboardingProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const slides = [
    {
      title: "Break the Silence",
      description: "Experience fully interactive speech-to-sign and sign-to-speech translations in real-time, built for absolute conversational clarity.",
      icon: <Hand className="w-16 h-16 text-[#22F3A6]" />,
      illustration: (
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#22F3A6] to-[#9E7BFF] opacity-25 blur-3xl rounded-full animate-pulse" />
          <div className="relative p-6 bg-[#1B2233]/90 backdrop-blur-md border border-[#22F3A6]/25 rounded-3xl shadow-xl">
            <Hand className="w-24 h-24 text-[#22F3A6] animate-bounce" />
          </div>
        </div>
      ),
    },
    {
      title: "Real-Time 3D Avatar",
      description: "Hearing voices instantly morph into an elegant, expressive, 3D animated character signing with 21-point custom hand skeletal rigs.",
      icon: <Accessibility className="w-16 h-16 text-[#22F3A6]" />,
      illustration: (
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#22F3A6] to-[#9E7BFF] opacity-30 blur-2xl rounded-full" />
          <div className="relative p-5 bg-[#1B2233]/90 backdrop-blur-md border border-[#9E7BFF]/30 rounded-3xl shadow-2xl flex flex-col items-center">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_fr8f8pfr8f8pfr8f_27d4c5ef.png"
              alt="VAKHYA Logo"
              className="w-16 h-16 rounded-2xl object-cover border border-[#22F3A6]/35 mb-3 bg-[#232B3E]"
            />
            <div className="flex gap-1.5 justify-center items-end h-7">
              <span className="w-1.5 h-5 bg-[#9E7BFF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-7 bg-[#22F3A6] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-4 bg-[#9E7BFF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Natural Voice Modulation",
      description: "Customise pitch, speed, and warmth sliders or use voice cloning to synthesize a beautiful spoken voice that feels uniquely yours.",
      icon: <Volume2 className="w-16 h-16 text-[#9E7BFF]" />,
      illustration: (
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#9E7BFF] to-[#22F3A6] opacity-25 blur-3xl rounded-full animate-pulse" />
          <div className="relative p-6 bg-[#1B2233]/90 backdrop-blur-md border border-[#9E7BFF]/30 rounded-3xl shadow-xl">
            <Volume2 className="w-20 h-20 text-[#22F3A6] animate-pulse" />
          </div>
        </div>
      ),
    },
    {
      title: "Interactive Video Calls",
      description: "Conduct seamless 1:1 mobile video calling overlaid with automated gesture translations and speech captions running dual-directionally.",
      icon: <MessageSquare className="w-16 h-16 text-[#22F3A6]" />,
      illustration: (
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#22F3A6] to-[#9E7BFF] opacity-25 blur-2xl rounded-full" />
          <div className="relative p-4 bg-[#1B2233]/90 backdrop-blur-md border border-[#22F3A6]/25 rounded-3xl shadow-xl flex gap-3">
            <div className="w-16 h-24 bg-[#131826] rounded-xl flex items-center justify-center border border-[#22F3A6]/30 shadow-inner">
              <span className="text-[10px] text-[#22F3A6] font-mono font-bold">Signer</span>
            </div>
            <div className="w-16 h-24 bg-[#262F48] rounded-xl flex items-center justify-center border border-[#9E7BFF]/35 shadow-md">
              <span className="text-[10px] text-[#D8CAFF] font-mono font-bold">Avatar</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  if (showSplash) {
    return (
      <div
        id="splash-container"
        className="fixed inset-0 flex flex-col items-center justify-center text-white overflow-hidden"
        style={{ background: "linear-gradient(135deg, #131824 0%, #232B3E 55%, #192033 100%)" }}
      >
        {/* Animated Logo-Matched Aurora Blobs */}
        <div className="absolute w-[350px] h-[350px] bg-[#22F3A6] rounded-full filter blur-[110px] opacity-20 top-1/4 left-1/4 animate-pulse" />
        <div className="absolute w-[320px] h-[320px] bg-[#9E7BFF] rounded-full filter blur-[110px] opacity-20 bottom-1/4 right-1/4 animate-pulse" />

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
          className="text-center z-10 px-6"
        >
          <div className="w-52 h-52 mx-auto mb-5 rounded-3xl overflow-hidden shadow-2xl shadow-[#22F3A6]/15 border border-[#22F3A6]/30 bg-[#2C354A]">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_fr8f8pfr8f8pfr8f_27d4c5ef.png"
              alt="VAKHYA Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs sm:text-sm uppercase tracking-[0.28em] text-[#22F3A6] font-semibold">
            Breaking Silence with AI
          </p>
        </motion.div>
        <div className="absolute bottom-10 text-xs text-[#9E7BFF]/75 font-mono tracking-wider">
          Accessibility Ecosystem
        </div>
      </div>
    );
  }

  return (
    <div
      id="onboarding-container"
      className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-white relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #131824 0%, #232B3E 55%, #192033 100%)" }}
    >
      {/* Ambient Blobs */}
      <div className="absolute w-80 h-80 bg-[#22F3A6] rounded-full filter blur-[110px] opacity-15 top-10 left-10" />
      <div className="absolute w-80 h-80 bg-[#9E7BFF] rounded-full filter blur-[110px] opacity-15 bottom-10 right-10" />

      <div className="w-full max-w-md backdrop-blur-2xl bg-[#1A2133]/85 border border-[#9E7BFF]/25 shadow-[0_24px_70px_rgba(8,12,24,0.65)] rounded-3xl p-8 flex flex-col justify-between min-h-[580px] z-10">
        {/* Header with logo & skip */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_fr8f8pfr8f8pfr8f_27d4c5ef.png"
              alt="VAKHYA Logo"
              className="w-9 h-9 rounded-xl object-cover border border-[#22F3A6]/35 bg-[#2C354A]"
            />
            <span className="font-bold tracking-wider text-sm text-white">VAKHYA</span>
          </div>
          <button
            id="onboarding-skip-btn"
            onClick={onComplete}
            className="text-xs text-[#22F3A6] hover:text-white transition-colors bg-[#22F3A6]/10 px-3 py-1.5 rounded-full border border-[#22F3A6]/25 hover:bg-[#22F3A6]/20 cursor-pointer"
          >
            Skip
          </button>
        </div>

        {/* Carousel Illustration */}
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.4 }}
          className="my-4 text-center"
        >
          {slides[currentSlide].illustration}
          <h2 className="text-2xl font-bold mt-6 mb-3 text-white">
            {slides[currentSlide].title}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            {slides[currentSlide].description}
          </p>
        </motion.div>

        {/* Slide Indicators and CTA */}
        <div>
          <div className="flex justify-center gap-2 mb-8">
            {slides.map((_, index) => (
              <span
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full cursor-pointer transition-all ${
                  index === currentSlide ? "w-6 bg-[#22F3A6]" : "w-2 bg-[#9E7BFF]/30"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-4">
            {currentSlide > 0 && (
              <button
                id="onboarding-prev-btn"
                onClick={() => setCurrentSlide(currentSlide - 1)}
                className="w-1/3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm border border-[#9E7BFF]/25 transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              id="onboarding-next-btn"
              onClick={() => {
                if (currentSlide === slides.length - 1) {
                  onComplete();
                } else {
                  setCurrentSlide(currentSlide + 1);
                }
              }}
              className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-[#12C985] to-[#22F3A6] hover:brightness-110 text-[#071A14] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              {currentSlide === slides.length - 1 ? "Get Started" : "Continue"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

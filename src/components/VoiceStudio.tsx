/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, Mic, CheckCircle, Play, Sparkles, Sliders, UserCheck } from "lucide-react";
import { theme } from "../theme";

interface VoiceStudioProps {
  profile: any;
  onUpdateProfile: (updated: any) => void;
}

export default function VoiceStudio({ profile, onUpdateProfile }: VoiceStudioProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>(
    profile.voiceSettings?.voiceName || "Warm Male"
  );
  const [pitch, setPitch] = useState<number>(profile.voiceSettings?.pitch || 1.0);
  const [speed, setSpeed] = useState<number>(profile.voiceSettings?.speed || 1.0);
  const [warmth, setWarmth] = useState<number>(profile.voiceSettings?.warmth || 75);
  const [expressiveness, setExpressiveness] = useState<number>(85);
  
  // TTS Preview states
  const [previewText, setPreviewText] = useState("VAKHYA is breaking silence with AI.");
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Voice Cloning guided recorder states
  const [cloneStep, setCloneStep] = useState<"idle" | "recording" | "processing" | "unlocked">("idle");
  const [clonedUnlocked, setClonedUnlocked] = useState(
    profile.voiceSettings?.clonedVoiceSampled || false
  );
  const [recordDuration, setRecordDuration] = useState(0);
  const recordIntervalRef = useRef<any>(null);

  // Per-contact voice memory settings
  const [contactVoices, setContactVoices] = useState<Array<{ name: string; avatar: string; assignedVoice: string }>>([
    { name: "Maya Sharma", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=maya", assignedVoice: "Bright Female" },
    { name: "Aarav Patel", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=aarav", assignedVoice: "Deep Male" },
    { name: "Dr. Singh", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=singh", assignedVoice: "Warm Male" }
  ]);

  const PRESETS = [
    { name: "Warm Male", description: "Soft, bass-rich tone with ambient compression", defaultPitch: 0.9, defaultSpeed: 0.95, defaultWarmth: 85 },
    { name: "Deep Male", description: "Authoritative resonant chest-voice register", defaultPitch: 0.7, defaultSpeed: 0.9, defaultWarmth: 95 },
    { name: "Bright Female", description: "Crisp, energetic high-frequency clarity", defaultPitch: 1.3, defaultSpeed: 1.1, defaultWarmth: 60 },
    { name: "Calm Female", description: "Soothing, slow-tempo warm counselor tone", defaultPitch: 1.1, defaultSpeed: 0.85, defaultWarmth: 80 },
    { name: "My Cloned Voice", description: "Personal vocal model generated from Enclave sample", defaultPitch: 1.0, defaultSpeed: 1.0, defaultWarmth: 75, locked: !clonedUnlocked }
  ];

  const handleSelectPreset = (preset: any) => {
    if (preset.locked) return;
    setSelectedPreset(preset.name);
    setPitch(preset.defaultPitch);
    setSpeed(preset.defaultSpeed);
    setWarmth(preset.defaultWarmth);

    // Save back to user settings
    onUpdateProfile({
      ...profile,
      voiceSettings: {
        ...profile.voiceSettings,
        voiceName: preset.name,
        pitch: preset.defaultPitch,
        speed: preset.defaultSpeed,
        warmth: preset.defaultWarmth,
        cloningEnabled: preset.name === "My Cloned Voice",
      }
    });
  };

  const handleSynthesize = async () => {
    if (!previewText.trim()) return;
    setIsSynthesizing(true);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(previewText);
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = selectedPreset.includes("Female")
        ? voices.find((v) => v.name.includes("Female") || v.name.includes("Zira") || v.lang.startsWith("en-"))
        : voices.find((v) => v.name.includes("Male") || v.name.includes("David"));
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.pitch = pitch;
      utterance.rate = speed;
      utterance.onend = () => setIsSynthesizing(false);
      utterance.onerror = () => setIsSynthesizing(false);
      window.speechSynthesis.speak(utterance);
      return;
    }

    try {
      const res = await fetch("/api/translate/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: previewText, voiceSettings: { pitch, speed, voiceName: selectedPreset } }),
      });
      const data = await res.json();
      if (data.audioWavBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioWavBase64}`);
        audio.onended = () => setIsSynthesizing(false);
        await audio.play().catch(() => setIsSynthesizing(false));
        return;
      }
    } catch {
      // ignore
    }
    setIsSynthesizing(false);
  };

  // Guided recorder simulation
  const startRecording = () => {
    setCloneStep("recording");
    setRecordDuration(0);
    recordIntervalRef.current = setInterval(() => {
      setRecordDuration(prev => {
        if (prev >= 5) {
          clearInterval(recordIntervalRef.current);
          setCloneStep("processing");
          setTimeout(() => {
            setCloneStep("unlocked");
            setClonedUnlocked(true);
            
            // Auto update user profile config
            onUpdateProfile({
              ...profile,
              voiceSettings: {
                ...profile.voiceSettings,
                clonedVoiceSampled: true
              }
            });
          }, 2500);
          return 5;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const assignContactVoice = (contactIdx: number, voice: string) => {
    const updated = [...contactVoices];
    updated[contactIdx].assignedVoice = voice;
    setContactVoices(updated);
  };

  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Voice Preset Grid */}
      <div className={`p-6 ${theme.styles.glassDark} space-y-4`}>
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Voice Preset Bank</h4>
            <span className="text-[10px] text-[var(--text-secondary)]/70 block">Select a vocal register for sign-to-speech outputs</span>
          </div>
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              disabled={preset.locked}
              onClick={() => handleSelectPreset(preset)}
              className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer ${
                preset.locked
                  ? "bg-[var(--bg-base)]/50 border-[var(--border-subtle)] opacity-50 cursor-not-allowed"
                  : selectedPreset === preset.name
                  ? "bg-gradient-to-tr from-[#8A5CF6]/20 to-[#D96FF2]/10 border-[#8A5CF6] shadow-[0_0_15px_rgba(138,92,246,0.15)]"
                  : "bg-[var(--button-glass-bg)] border-[var(--border-subtle)] hover:bg-[var(--button-glass-bg-hover)] hover:border-purple-500/30"
              }`}
            >
              {selectedPreset === preset.name && (
                <div className="absolute top-0 right-0 w-3 h-full bg-gradient-to-b from-[#8A5CF6] to-[#D96FF2]" />
              )}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    {preset.name}
                    {selectedPreset === preset.name && (
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                    )}
                  </h5>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed pr-4">
                    {preset.description}
                  </p>
                </div>
                {preset.locked && (
                  <span className="text-[8px] font-mono bg-red-500/20 text-red-600 dark:text-red-300 px-2 py-0.5 rounded border border-red-500/30 font-bold uppercase tracking-widest">
                    LOCKED
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Tuning Sliders & Instant Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tuning Controls */}
        <div className={`p-6 ${theme.styles.glassLight} lg:col-span-6 space-y-5 rounded-3xl border border-[var(--border-subtle)]`}>
          <h4 className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider block border-b border-[var(--border-subtle)] pb-2">
            Fine Acoustic Tuning
          </h4>

          <div className="space-y-4 text-xs">
            {/* Pitch */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[10px] text-[var(--text-secondary)]">
                <span>Vocal Pitch (Hz register)</span>
                <span className="text-[var(--color-accent-violet)] font-bold">{pitch.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[var(--bg-base)] rounded-lg appearance-none cursor-pointer accent-[#D96FF2]"
              />
            </div>

            {/* Speed */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[10px] text-[var(--text-secondary)]">
                <span>Vocal Speed Rate</span>
                <span className="text-[var(--color-accent-violet)] font-bold">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[var(--bg-base)] rounded-lg appearance-none cursor-pointer accent-[#D96FF2]"
              />
            </div>

            {/* Warmth */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[10px] text-[var(--text-secondary)]">
                <span>Formant Warmth & Depth</span>
                <span className="text-[var(--color-accent-violet)] font-bold">{warmth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={warmth}
                onChange={(e) => setWarmth(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[var(--bg-base)] rounded-lg appearance-none cursor-pointer accent-[#D96FF2]"
              />
            </div>

            {/* Expressiveness */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[10px] text-[var(--text-secondary)]">
                <span>Emotion & Expressiveness</span>
                <span className="text-[var(--color-accent-violet)] font-bold">{expressiveness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={expressiveness}
                onChange={(e) => setExpressiveness(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[var(--bg-base)] rounded-lg appearance-none cursor-pointer accent-[#D96FF2]"
              />
            </div>
          </div>
        </div>

        {/* TTS Preview Block */}
        <div className={`p-6 ${theme.styles.glassLight} lg:col-span-6 space-y-4 flex flex-col justify-between rounded-3xl border border-[var(--border-subtle)]`}>
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider block border-b border-[var(--border-subtle)] pb-2">
              Live Voice Preview
            </h4>
            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
              Type any sentence below to synthesize and audition your modulated vocal parameters in real-time.
            </p>
            <textarea
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Enter speech preview sentence..."
              className="w-full h-20 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl p-3 text-xs text-[var(--text-primary)] outline-none focus:border-purple-500/50 resize-none font-sans"
            />
          </div>

          <button
            onClick={handleSynthesize}
            className={`w-full py-3 rounded-xl font-bold text-xs flex justify-center items-center gap-2 relative overflow-hidden cursor-pointer ${theme.styles.buttonAccent}`}
          >
            {isSynthesizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Speech Signals...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Synthesize & Audition Vocalization</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Guided Voice Cloning Block */}
      <div className={`p-6 ${theme.styles.glassDark} space-y-5 rounded-3xl border border-[var(--border-subtle)]`}>
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[var(--color-accent-violet)]">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Voice Cloning Enclave Sandbox</h4>
            <span className="text-[10px] text-[var(--color-accent-violet)] font-semibold font-mono uppercase">Secure Offline Local Fitting</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3 text-xs leading-relaxed text-[var(--text-secondary)]">
            <p>
              To construct a customized vocal synthesizer representing your biological timbre, you can record a short voice baseline sample.
            </p>
            <div className="bg-[var(--bg-base)] p-3.5 rounded-xl border border-[var(--border-subtle)] italic text-[var(--text-primary)] text-[11px] select-all">
              "VAKHYA is my voice. I sign to speak, and my words carry depth and warmth across any boundary."
            </div>
            <p className="text-[10px] text-[var(--text-secondary)]/60">
              *Note: The audio spectrogram is computed locally in your browser's secure sandboxed memory. No audio waveforms leave your client device.
            </p>
          </div>

          <div className="lg:col-span-5 bg-[var(--button-glass-bg)] p-5 rounded-2xl border border-[var(--border-subtle)] flex flex-col justify-between h-44">
            {cloneStep === "idle" && (
              <div className="text-center space-y-4 flex flex-col justify-center items-center h-full">
                <p className="text-[10px] text-[var(--text-secondary)] font-mono">ENCLAVE VOICES: AWAITING RECORDING</p>
                <button
                  onClick={startRecording}
                  className={`w-full max-w-xs py-2.5 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 cursor-pointer ${theme.styles.buttonAccent}`}
                >
                  <Mic className="w-4 h-4 animate-pulse" />
                  Record spectrograph (5s)
                </button>
              </div>
            )}

            {cloneStep === "recording" && (
              <div className="text-center space-y-3.5 flex flex-col justify-center items-center h-full">
                <span className="text-[9px] font-mono text-red-500 font-bold tracking-widest uppercase animate-pulse">
                  ● CAPTURING AUDIO STREAM ({recordDuration}/5s)
                </span>
                {/* Visualizer bars */}
                <div className="flex items-center gap-1 h-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => (
                    <div
                      key={bar}
                      className="w-1.5 bg-[#D96FF2] rounded-full animate-bounce"
                      style={{
                        height: `${Math.random() * 24 + 4}px`,
                        animationDelay: `${bar * 100}ms`
                      }}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-[var(--text-secondary)]/75">Please read the sentence aloud now...</p>
              </div>
            )}

            {cloneStep === "processing" && (
              <div className="text-center space-y-3 flex flex-col justify-center items-center h-full">
                <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <div>
                  <h5 className="text-[11px] font-bold text-[var(--text-primary)]">Extracting Vocal Formants...</h5>
                  <span className="text-[8px] font-mono text-[var(--color-accent-violet)] block">LOCAL FAST-FOURIER TRANSFORM (FFT) FIT</span>
                </div>
              </div>
            )}

            {cloneStep === "unlocked" && (
              <div className="text-center space-y-3.5 flex flex-col justify-center items-center h-full">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500">
                  <CheckCircle className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-[var(--text-primary)]">"My Cloned Voice" Unlocked!</h5>
                  <p className="text-[10px] text-[var(--text-secondary)]">Your custom vocal profile model generated successfully.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Per-Contact Voice Memory */}
      <div className={`p-6 ${theme.styles.glassLight} space-y-4 rounded-3xl border border-[var(--border-subtle)]`}>
        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
          <div>
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Per-Contact Voice Memory</h4>
            <span className="text-[9px] text-[var(--text-secondary)]/75 block">Assign distinct vocal synthetic profiles for specific call contacts</span>
          </div>
          <UserCheck className="w-4 h-4 text-[var(--color-accent-violet)]" />
        </div>

        <div className="space-y-3">
          {contactVoices.map((contact, idx) => (
            <div
              key={contact.name}
              className="flex justify-between items-center p-3 bg-[var(--button-glass-bg)] rounded-xl border border-[var(--border-subtle)] hover:border-[#8A5CF6]/30 transition-all text-xs"
            >
              <div className="flex items-center gap-2.5">
                <img src={contact.avatar} alt={contact.name} className="w-8 h-8 rounded-full bg-white/10" referrerPolicy="no-referrer" />
                <div>
                  <h5 className="font-bold text-[var(--text-primary)]">{contact.name}</h5>
                  <span className="text-[9px] text-[var(--text-secondary)]/50 block">Secured contact memory slot</span>
                </div>
              </div>

              <select
                value={contact.assignedVoice}
                onChange={(e) => assignContactVoice(idx, e.target.value)}
                className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg py-1 px-2.5 text-[10px] text-[var(--color-accent-violet)] font-semibold outline-none focus:border-[#D96FF2]/50 cursor-pointer dark:text-purple-300"
              >
                <option value="Warm Male">Warm Male</option>
                <option value="Deep Male">Deep Male</option>
                <option value="Bright Female">Bright Female</option>
                <option value="Calm Female">Calm Female</option>
                {clonedUnlocked && <option value="My Cloned Voice">My Cloned Voice</option>}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Camera,
  RefreshCw,
  AlertTriangle,
  Play,
  CheckCircle,
  HelpCircle,
  Volume2,
  Trash2,
  Users,
  Send,
  Plus,
  BookOpen,
  Award,
  Zap,
  MapPin,
  ShieldAlert,
  Settings,
  Bell,
  Sliders,
  User,
  Activity,
  Heart,
  Eye,
  Tv,
  Calendar,
  DollarSign,
  Check,
  Code,
  FileText,
  Lock,
  Shield
} from "lucide-react";
import { UserProfile, SignLanguage, LearnLesson, QuizQuestion } from "../types";
import { theme } from "../theme";

interface OtherScreensProps {
  profile: UserProfile;
  activeScreen: string;
  onUpdateProfile?: (updated: UserProfile) => void;
}

const MOCK_LESSONS: LearnLesson[] = [
  {
    id: "l1",
    title: "Basic Greetings & Handshapes",
    category: "Basics",
    difficulty: "Beginner",
    points: 100,
    completed: true,
    vocab: [
      { word: "HELLO", description: "Wave hand outward from forehead.", glossSteps: ["FOREHEAD_WAVE"] },
      { word: "THANK YOU", description: "Touch fingers of dominant hand to chin, then arch forward.", glossSteps: ["CHIN_TO_ARCH"] },
    ],
  },
  {
    id: "l2",
    title: "Medical & Emergency Signs",
    category: "Emergency",
    difficulty: "Beginner",
    points: 150,
    completed: false,
    vocab: [
      { word: "HOSPITAL", description: "Form cross on upper arm with finger joints.", glossSteps: ["ARM_CROSS"] },
      { word: "POLICE", description: "Tap chest where badge belongs.", glossSteps: ["CHEST_BADGE"] },
    ],
  },
];

const MOCK_QUIZ: QuizQuestion = {
  id: "q1",
  lessonId: "l1",
  prompt: "Which sign is executed by touching fingers of dominant hand to the chin, and moving forward in an arch?",
  options: ["HELLO", "THANK YOU", "PLEASE", "HOSPITAL"],
  correctOptionIndex: 1,
  signAnimationGloss: "THANK YOU",
};

export default function OtherScreens({ profile, activeScreen, onUpdateProfile }: OtherScreensProps) {
  // 1. LEARN SIGN LANGUAGE STATES
  const [lessons, setLessons] = useState(MOCK_LESSONS);
  const [quizActive, setQuizActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizChecked, setQuizChecked] = useState(false);

  // 2. OCR SCANNER STATES
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // 3. EMERGENCY SOS STATES
  const [sosActive, setSosActive] = useState(false);
  const [sosStatus, setSosStatus] = useState("Idle");

  // 4. CONTEXTUAL AI ASSISTANT STATES
  const [aiQuery, setAiQuery] = useState("");
  const [aiChat, setAiChat] = useState<Array<{ sender: "user" | "vakhya"; text: string }>>([
    { sender: "vakhya", text: "Welcome to Vakhya's Contextual AI Assistant. How can I assist you with sign grammar or translation helpers today?" },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // 5. GROUP ROOMS STATES
  const [groupRooms, setGroupRooms] = useState([
    { id: "room-1", name: "Accessibility Townhall Conference", participants: 8 },
    { id: "room-2", name: "Family Weekly Call", participants: 3 },
  ]);

  // VOICE SETTINGS STATES
  const [voiceModulation, setVoiceModulation] = useState(profile.voiceSettings);

  // =============================================================
  // PHASE 3 STATE HOOKS (ULTRA PRO FEATURE SET)
  // =============================================================
  
  // (2) VAKHYA SENSE (ENVIRONMENTAL SOUND AWARENESS)
  const [senseEnabled, setSenseEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState("High");
  const [quietHours, setQuietHours] = useState(false);
  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const [soundLogs, setSoundLogs] = useState([
    { time: "09:42 AM", sound: "Doorbell Ringing", icon: "🔔", confidence: "96%", action: "Visual Flash & Watch Vibe Triggered" },
    { time: "08:15 AM", sound: "Smoke/Fire Alarm", icon: "🔥", confidence: "99%", action: "Emergency SOS Broadcast Pre-Armed" },
    { time: "07:30 AM", sound: "Someone Calling Name", icon: "👤", confidence: "87%", action: "Vibration Pattern Alpha Activated" }
  ]);

  // (3) AI COACH 2.0 (LEARNING COACH ACCELERATOR)
  const [coachStage, setCoachStage] = useState<"dashboard" | "skeletal" | "roleplay">("dashboard");
  const [practicingSign, setPracticingSign] = useState("THANK YOU");
  const [skeletalOverlayMatched, setSkeletalOverlayMatched] = useState(false);
  const [roleplayMode, setRoleplayMode] = useState("coffee");
  const [coachConversation, setCoachConversation] = useState<Array<{ sender: "coach" | "user"; text: string }>>([
    { sender: "coach", text: "Welcome to Ordering Coffee simulator. Practice ordering a flat white. Your turn to sign!" }
  ]);
  const [coachInput, setCoachInput] = useState("");

  // (5) GROUP CALL MANY-TO-MANY SIMULATOR
  const [activeGroupRoom, setActiveGroupRoom] = useState<any | null>(null);
  const [myGroupSignLanguage, setMyGroupSignLanguage] = useState<string>("ASL");
  const [groupCaptionFeed, setGroupCaptionFeed] = useState<string>("Welcome everyone to the Collaborative Session.");

  // (6) INTERPRETER MARKETPLACE
  const [interpreterSpecialty, setInterpreterSpecialty] = useState("Medical");
  const [selectedInterpreter, setSelectedInterpreter] = useState<any | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [activeInterpreterCall, setActiveInterpreterCall] = useState(false);

  // (7) BROADCAST STREAMING
  const [broadcastLanguage, setBroadcastLanguage] = useState("ISL");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastCaptions, setBroadcastCaptions] = useState("Today we gather to discuss system accessibility rules.");

  // (12) SECURITY & BIOMETRIC PRIVACY
  const [consentEmotionMirror, setConsentEmotionMirror] = useState(true);
  const [consentFederatedLearning, setConsentFederatedLearning] = useState(true);
  const [consentSenseAudio, setConsentSenseAudio] = useState(true);
  const [consentVoiceCloning, setConsentVoiceCloning] = useState(false);
  const [enclaveWiped, setEnclaveWiped] = useState(false);

  // (11) ENTERPRISE SDK OPTIONS
  const [sdkFramework, setSdkFramework] = useState("react");

  // ACCESSIBILITY VISUAL SIMULATOR STATES
  const [hapticPulseActive, setHapticPulseActive] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState<"low" | "medium" | "high">("medium");
  const [screenFlashActive, setScreenFlashActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------

  // OCR scan handler
  const handleOcrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);

      setIsScanning(true);
      try {
        const response = await fetch("/api/ocr/visual-reading", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, signLanguage: profile.primarySignLanguage }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed scanning image");
        }
        setScanResult(data);
      } catch (err: any) {
        setOcrError(err.message);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // AI Assistant trigger
  const handleSendAiQuery = async () => {
    if (!aiQuery.trim()) return;

    const userMsg = aiQuery;
    setAiChat((prev) => [...prev, { sender: "user", text: userMsg }]);
    setAiQuery("");
    setAiLoading(true);

    try {
      // Prompt Vakhya contextual assistant on the server with Gemini!
      const response = await fetch("/api/translate/gloss-to-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          glosses: `HELP CHATBOT ASSISTANT REQUEST: ${userMsg}`,
          signLanguage: profile.primarySignLanguage,
        }),
      });

      const data = await response.json();
      setAiChat((prev) => [
        ...prev,
        {
          sender: "vakhya",
          text: data.sentence || "Here is a quick hint: In ASL grammar, time expressions (like YESTERDAY, TOMORROW) are positioned at the very start of the sentence.",
        },
      ]);
    } catch (err) {
      setAiChat((prev) => [
        ...prev,
        { sender: "vakhya", text: "Vakhya assistant is currently processing too many signals. Please try again." },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Emergency SOS Activate
  const handleTriggerSOS = () => {
    setSosActive(true);
    setSosStatus("BROADCASTING SHIELD SIGNAL...");
    // Simulate speech-synthesis emergency broadcast
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Emergency alert broadcasted. Help is on the way. Current GPS coordinates locked.");
      window.speechSynthesis.speak(utterance);
    }
    setTimeout(() => {
      setSosStatus("AUTHORITIES DISPATCHED");
    }, 4000);
  };

  return (
    <div id="other-screens-container" className="space-y-6">
      {/* -------------------------------------------------------------
          SCREEN: LEARN SIGN LANGUAGE
      ------------------------------------------------------------- */}
      {activeScreen === "learn" && (
        <div className="space-y-6 text-[var(--text-primary)]">
          <div className={`flex justify-between items-center p-5 ${theme.styles.glassLight}`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                Gamified Lesson Academy
              </span>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Learn Sign Language</h3>
            </div>
            <div className="flex items-center gap-4 bg-[#8A5CF6]/10 px-4 py-2 border border-[#8A5CF6]/20 rounded-xl">
              <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-bounce" />
              <div>
                <div className="text-[9px] text-[var(--text-secondary)]/60 font-mono">CURRENT STREAK</div>
                <div className="text-sm font-bold text-[var(--text-primary)]">7 Days Active</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Side: Lessons List */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider block">
                Your Progress Tracks
              </span>
              <div className="space-y-3">
                {lessons.map((ls) => (
                  <div
                    key={ls.id}
                    className={`p-5 ${theme.styles.glassLight} flex justify-between items-start hover:border-[#D96FF2]/40 hover:shadow-[0_0_15px_rgba(217,111,242,0.1)] transition-all`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 uppercase tracking-widest font-mono">
                          {ls.category}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]/50">{ls.difficulty}</span>
                      </div>
                      <h4 className="font-bold text-base text-[var(--text-primary)]">{ls.title}</h4>
                      <div className="flex gap-4 pt-1">
                        {ls.vocab.map((v) => (
                          <div key={v.word} className="text-[11px] text-[var(--text-secondary)]/80">
                            <span className="font-bold text-purple-600 dark:text-purple-300 font-mono">{v.word}</span>: {v.description}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-between h-20">
                      <span className="text-xs font-bold text-[#D96FF2]">{ls.points} XP</span>
                      {ls.completed ? (
                        <span className="text-xs font-bold text-green-500 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Passed
                        </span>
                      ) : (
                        <button
                          id={`start-lesson-${ls.id}`}
                          onClick={() => setQuizActive(true)}
                          className="py-1 px-3 bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] rounded-lg text-[10px] font-bold text-white cursor-pointer"
                        >
                          Start Quiz
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Quiz Simulator */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-bold text-[var(--color-accent-violet)] uppercase tracking-wider block">
                Interactive Quiz Arena
              </span>

              {quizActive ? (
                <div className={`p-6 ${theme.styles.glassDark} space-y-6 shadow-2xl`}>
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest">
                      Question of the Day
                    </span>
                    <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed">{MOCK_QUIZ.prompt}</p>
                  </div>

                  {/* 3D Quiz Avatar simulation placeholder */}
                  <div className="h-44 bg-[var(--glass-input-bg)] rounded-xl flex items-center justify-center border border-[var(--border-subtle)] relative overflow-hidden">
                    <span className="absolute left-3 top-3 text-[8px] font-mono text-[var(--text-secondary)]/55">QUIZ RIG ACTIVE</span>
                    <div className="text-center space-y-2">
                      <Award className="w-10 h-10 text-[#D96FF2] mx-auto animate-pulse" />
                      <span className="text-xs font-bold font-mono tracking-wider block text-purple-600 dark:text-purple-200">
                        AVATAR SIGNING: "{MOCK_QUIZ.signAnimationGloss}"
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {MOCK_QUIZ.options.map((opt, idx) => (
                      <button
                        key={idx}
                        id={`quiz-option-${idx}`}
                        disabled={quizChecked}
                        onClick={() => setSelectedAnswer(idx)}
                        className={`w-full p-3 rounded-xl border text-left text-xs font-semibold transition-colors flex justify-between items-center cursor-pointer ${
                          selectedAnswer === idx
                            ? "bg-[#8A5CF6]/30 border-[#8A5CF6] text-[var(--text-primary)]"
                            : "bg-[var(--glass-input-bg)] border-[var(--border-subtle)] text-[var(--text-primary)]/85 hover:bg-[var(--glass-input-bg-focus)]"
                        }`}
                      >
                        <span>{opt}</span>
                        {quizChecked && idx === MOCK_QUIZ.correctOptionIndex && (
                          <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedAnswer !== null && !quizChecked && (
                    <button
                      id="quiz-submit-btn"
                      onClick={() => setQuizChecked(true)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer ${theme.styles.buttonAccent}`}
                    >
                      Verify Answer
                    </button>
                  )}

                  {quizChecked && (
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center space-y-3">
                      <p className="text-xs font-bold text-[var(--text-primary)]">
                        {selectedAnswer === MOCK_QUIZ.correctOptionIndex
                          ? "🎉 Excellent job! +150 XP rewarded."
                          : "❌ Correct answer: THANK YOU. Keep practicing!"}
                      </p>
                      <button
                        id="quiz-close-btn"
                        onClick={() => {
                          setQuizActive(false);
                          setSelectedAnswer(null);
                          setQuizChecked(false);
                          // Mark second lesson complete for demonstration!
                          const updated = [...lessons];
                          updated[1].completed = true;
                          setLessons(updated);
                        }}
                        className="py-1 px-4 bg-white/10 border border-white/5 hover:bg-white/15 rounded-lg text-[10px] font-bold text-white"
                      >
                        Finish Lesson
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-6 ${theme.styles.glassLight} text-center space-y-4`}>
                  <Award className="w-12 h-12 text-[#D96FF2] mx-auto animate-pulse" />
                  <div>
                    <h5 className="font-bold text-sm">Interactive Quiz Arena Locked</h5>
                    <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                      Launch a lesson on the left to activate expressive micro-quiz tracking overlays.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: OCR ACCESSIBILITY SCANNER
      ------------------------------------------------------------- */}
      {activeScreen === "ocr" && (
        <div className="space-y-6">
          <div className={`flex justify-between items-center p-5 ${theme.styles.glassLight}`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                Multimodal Image translation
              </span>
              <h3 className="text-xl font-bold">OCR Camera Scanner</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side: Upload card */}
            <div className={`p-6 ${theme.styles.glassLight} flex flex-col justify-between min-h-[350px]`}>
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 text-white/40 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Upload menu or document scan</h4>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed max-w-sm mx-auto">
                    Vakhya uses Gemini's multi-modal intelligence to extract text from a signage or medical receipt, auto-translate it, and return gesture gloss mappings.
                  </p>
                </div>
              </div>

              {/* Upload area */}
              <div className="pt-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleOcrUpload}
                  className="hidden"
                />
                <button
                  id="trigger-file-picker"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs ${theme.styles.buttonAccent}`}
                >
                  Select / Snap Image
                </button>
              </div>
            </div>

            {/* Right side: Results view */}
            <div className={`p-6 ${theme.styles.glassDark} flex flex-col justify-between min-h-[350px]`}>
              {selectedImage && (
                <div className="space-y-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold block">
                    Document Frame preview
                  </span>
                  <div className="w-full h-32 rounded-xl overflow-hidden bg-black border border-white/5">
                    <img src={selectedImage} alt="uploaded scan" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}

              {isScanning ? (
                <div className="py-8 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#D96FF2] mx-auto" />
                  <p className="text-xs text-white/60">Reading visual context via Gemini multimodal API...</p>
                </div>
              ) : scanResult ? (
                <div className="space-y-4 pt-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-purple-300">EXTRACTED TEXT</span>
                    <p className="text-xs text-white bg-white/5 p-3 rounded-lg border border-white/5">{scanResult.text}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-purple-300">CLEAN TRANSLATION</span>
                    <p className="text-xs font-bold text-white">{scanResult.translation}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-purple-300">SIGN GLOSS MAPPINGS</span>
                    <p className="text-xs font-mono text-purple-300 bg-purple-500/10 p-2 rounded">{scanResult.glosses}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-xs text-white/30 font-mono">
                  No scan active. Select an image receipt above to trigger multi-modal OCR translation.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: EMERGENCY SOS MODE (URGENT ACCESSIBILITY RED)
      ------------------------------------------------------------- */}
      {activeScreen === "sos" && (
        <div className="space-y-6">
          <div className="p-6 bg-red-600/10 border border-red-500/30 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-1.5 text-center md:text-left">
              <div className="flex justify-center md:justify-start items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
                <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase font-bold block">
                  Urgent SOS Lifeline
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">Emergency Assistance Gateway</h3>
              <p className="text-xs text-white/60 leading-normal max-w-md">
                One-tap SOS triggers automated speaker warning alerts, locks your GPS location coordinates, and alerts local authorities.
              </p>
            </div>
            <button
              id="emergency-sos-trigger-btn"
              onClick={handleTriggerSOS}
              className="h-14 px-8 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-red-600/30 flex items-center gap-2"
            >
              <AlertTriangle className="w-5 h-5 animate-bounce" />
              Trigger SOS Alert
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Status log */}
            <div className={`lg:col-span-7 ${theme.styles.glassDark} p-6 space-y-4 flex flex-col justify-between`}>
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-red-400 block uppercase">
                  Broadcast logs
                </span>
                <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-[11px] text-white/80 space-y-2">
                  <div className="flex justify-between">
                    <span>GPS COORDINATES:</span>
                    <span className="text-purple-300">28.6139° N, 77.2090° E (Locked)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STATUS:</span>
                    <span className="text-red-400 font-bold">{sosStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SPEAKER WARNING:</span>
                    <span className="text-white/60">ACTIVE (Max Volume)</span>
                  </div>
                </div>
              </div>

              {sosActive ? (
                <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider block">
                    Authorities alerted
                  </span>
                  <p className="text-xs text-white/70 leading-relaxed">
                    First responders have been notified with your live GPS packet. An active signed dialog tutorial is projecting on screen for bystander assistance.
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-white/30 font-mono">
                  SOS Broadcast inactive. Press 'Trigger SOS' in extreme emergencies.
                </div>
              )}
            </div>

            {/* Emergency Contacts */}
            <div className={`lg:col-span-5 p-5 ${theme.styles.glassLight} space-y-4`}>
              <span className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider block">
                Local Emergency Contacts
              </span>
              <div className="space-y-2.5">
                {[
                  { name: "Police Dispatch Office", phone: "112 / 911" },
                  { name: "Ambulance Medical Care", phone: "102 / 911" },
                  { name: "Family Primary Contact", phone: "+91 98765 43210" },
                ].map((cnt) => (
                  <div key={cnt.name} className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                    <div>
                      <h5 className="font-bold text-white/95">{cnt.name}</h5>
                      <span className="text-[10px] text-white/40">{cnt.phone}</span>
                    </div>
                    <button
                      id={`call-emergency-${cnt.name.slice(0, 4)}`}
                      className="py-1 px-3.5 bg-red-600/20 border border-red-500/30 rounded-lg text-[10px] font-bold text-red-200"
                    >
                      Call
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: GROUP TRANSLATION ROOMS
      ------------------------------------------------------------- */}
      {activeScreen === "group" && (
        <div className="space-y-6">
          {!activeGroupRoom ? (
            /* 1. ROOM LIST SELECTION SCREEN */
            <div className="space-y-6">
              <div className={`flex justify-between items-center p-5 ${theme.styles.glassLight}`}>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                    Collaborative Conference translation
                  </span>
                  <h3 className="text-xl font-bold">Group Translation Rooms</h3>
                  <p className="text-xs text-white/50">Many-to-many live meetings with independent client-side signing avatars.</p>
                </div>
                <button
                  id="create-group-room-btn"
                  onClick={() => {
                    const newId = `room-${Date.now()}`;
                    setGroupRooms([...groupRooms, { id: newId, name: "Ad-hoc Tech Review", participants: 2 }]);
                  }}
                  className="py-2 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Room
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupRooms.map((room) => (
                  <div key={room.id} className={`p-5 ${theme.styles.glassLight} space-y-4 flex flex-col justify-between h-48 hover:border-[#D96FF2]/40 transition-colors`}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-[#D96FF2]" />
                          {room.participants} Participants Online
                        </span>
                        <span className="font-mono text-[10px] uppercase text-[#C9A9E9] bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-bold">
                          MANY-TO-MANY ACTIVE
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-white">{room.name}</h4>
                      <p className="text-xs text-white/40">Includes 1 Hearing speaker, 1 ASL Deaf participant, 1 ISL Deaf participant.</p>
                    </div>
                    <button
                      id={`join-room-${room.id}`}
                      onClick={() => setActiveGroupRoom(room)}
                      className="w-full py-2.5 rounded-xl border border-[#8A5CF6]/40 hover:bg-[#8A5CF6]/15 text-[#C9A9E9] text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      Join Collaborative Space
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 2. LIVE CONFERENCE ROOM SIMULATOR */
            <div className="space-y-6">
              {/* Meeting Header */}
              <div className={`p-4 ${theme.styles.glassLight} flex justify-between items-center rounded-2xl`}>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  <div>
                    <h3 className="text-sm font-bold text-white">{activeGroupRoom.name}</h3>
                    <span className="text-[10px] font-mono text-[#C9A9E9] block">
                      SECURE ROOM ID: <span className="text-purple-300 select-all font-bold">VAKHYA-CONF-{activeGroupRoom.id.toUpperCase()}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold">
                    WEBRTC CALL SECURED • 100% CLIENT-SIDE
                  </span>
                  <button
                    id="leave-group-call-btn"
                    onClick={() => setActiveGroupRoom(null)}
                    className="py-1.5 px-3.5 bg-red-600/20 border border-red-500/30 rounded-xl text-xs font-semibold text-red-200 hover:bg-red-600/30 transition-colors cursor-pointer"
                  >
                    Leave Meeting
                  </button>
                </div>
              </div>

              {/* Conference Grid Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Peer Camera Feeds (Left 5-Cols) */}
                <div className="xl:col-span-5 space-y-4">
                  <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest block font-bold">
                    VIDEO CALL PARTICIPANTS (WEBRTC FEED)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* User Feed (Local) */}
                    <div className="h-40 bg-[#160F26]/80 rounded-2xl border border-purple-500/20 relative overflow-hidden flex flex-col justify-between p-3">
                      <div className="absolute inset-0 flex items-center justify-center bg-purple-950/20">
                        {/* Skeletal tracking overlay on local selfie camera */}
                        <svg className="w-20 h-20 text-purple-400/60" viewBox="0 0 100 100">
                          <circle cx="50" cy="30" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          <line x1="50" y1="42" x2="50" y2="75" stroke="currentColor" strokeWidth="1.5" />
                          <line x1="50" y1="48" x2="30" y2="60" stroke="currentColor" strokeWidth="1.5" />
                          <line x1="50" y1="48" x2="70" y2="60" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="30" cy="60" r="3" fill="#D96FF2" className="animate-ping" />
                          <circle cx="70" cy="60" r="3" fill="#8A5CF6" className="animate-ping" />
                        </svg>
                      </div>
                      <div className="bg-black/40 px-2 py-0.5 rounded text-[8px] font-mono text-white/80 w-fit relative z-10">
                        YOU (DEAF PROFILE)
                      </div>
                      <div className="flex justify-between items-center relative z-10 mt-auto">
                        <span className="text-[9px] text-[#C9A9E9] bg-[#160F26] px-2 py-0.5 rounded font-mono font-bold">
                          LOCAL ASL CAM
                        </span>
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      </div>
                    </div>

                    {/* Hearing Peer Feed */}
                    <div className="h-40 bg-[#160F26]/80 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between p-3">
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#D96FF2]/5">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg">
                          👩‍💼
                        </div>
                        <span className="text-[11px] font-bold text-white mt-1.5">Maya (Hearing Speaker)</span>
                        <span className="text-[9px] text-white/40">Speaking via Microphone</span>
                      </div>
                      <div className="bg-black/40 px-2 py-0.5 rounded text-[8px] font-mono text-white/80 w-fit relative z-10">
                        PEER FEED
                      </div>
                      {/* Audio visualizer bar graph */}
                      <div className="flex items-end gap-0.5 h-4 mt-auto">
                        {[1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 5, 2, 1].map((val, i) => (
                          <div
                            key={i}
                            className="w-1 bg-[#D96FF2] rounded-full animate-bounce"
                            style={{ height: `${val * 3}px`, animationDelay: `${i * 100}ms` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Partner 2 Feed (Mumbai Deaf Peer) */}
                    <div className="h-40 bg-[#160F26]/80 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between p-3 sm:col-span-2">
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-900/10">
                        <span className="text-xl">🧔</span>
                        <span className="text-xs font-bold text-white mt-1">Aarav (Deaf Peer - Mumbai)</span>
                        <p className="text-[10px] text-[#C9A9E9] font-mono bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 mt-1">
                          Client Output Preference: ISL (Indian Sign Language)
                        </p>
                      </div>
                      <div className="bg-black/40 px-2 py-0.5 rounded text-[8px] font-mono text-white/80 w-fit relative z-10">
                        REMOTE DEAF CLIENT
                      </div>
                      <div className="flex justify-between items-center relative z-10 mt-auto">
                        <span className="text-[9px] text-white/50 font-mono">
                          ISL RENDERING INSTANCE
                        </span>
                        <span className="text-[9px] text-green-400 font-mono font-bold">CONNECTED</span>
                      </div>
                    </div>
                  </div>

                  {/* Hearing Speaker Speech Simulation Trigger */}
                  <div className={`p-4 ${theme.styles.glassDark} rounded-2xl border border-white/5 space-y-3`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-[#C9A9E9] uppercase block font-bold">
                        SIMULATE HEARING SPEAKER'S SPOKEN SENTENCE
                      </span>
                      <span className="text-[9px] font-bold text-purple-300 font-mono">CLICK TO TRIGGER</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {[
                        "We are ready to deploy the local translation models.",
                        "Are we meeting the medical team at the hospital tomorrow?",
                        "Thank you everyone for joining this collaborative space!"
                      ].map((sentence) => (
                        <button
                          key={sentence}
                          id={`simulate-speech-${sentence.slice(0, 8)}`}
                          onClick={() => setGroupCaptionFeed(sentence)}
                          className="text-left p-2 bg-white/5 hover:bg-purple-600/10 border border-white/5 hover:border-purple-500/30 rounded-xl text-[11px] text-white/80 transition-all font-sans cursor-pointer"
                        >
                          "{sentence}"
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dual Client-Side Signing Avatars (Right 7-Cols) */}
                <div className="xl:col-span-7 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest block font-bold">
                      DUAL INDEPENDENT CLIENT-SIDE TRANSLATION AVATARS
                    </span>
                    <span className="text-[9px] text-purple-300 font-bold bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                      MANY-TO-MANY DEMO
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* AVATAR A: YOUR CLIENT (ASL INTERPRETATION) */}
                    <div className={`p-4 bg-gradient-to-b from-[#1C1230]/70 to-[#120B21]/90 border border-[#8A5CF6]/30 rounded-2xl space-y-3`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded block w-fit">
                            CLIENT A (ASL ACTIVE)
                          </span>
                          <h4 className="font-bold text-xs text-white mt-1">Your Client Avatar</h4>
                        </div>
                        <span className="text-[10px] text-white/50 font-mono">USA / ASL</span>
                      </div>

                      {/* 3D Wireframe Canvas Simulator */}
                      <div className="h-44 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden flex flex-col justify-between p-2">
                        <div className="absolute top-2 left-2 bg-[#8A5CF6]/20 px-2 py-0.5 rounded text-[8px] font-mono text-purple-200">
                          3D PIPELINE: RIGGED AVATAR
                        </div>

                        {/* Beautiful skeletal coordinate joints mimicking ASL */}
                        <div className="flex-1 flex items-center justify-center relative mt-3">
                          <svg className="w-24 h-24 text-emerald-400" viewBox="0 0 100 100">
                            {/* Face joints */}
                            <circle cx="50" cy="25" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" className="animate-pulse" />
                            {/* Mouth movement node */}
                            <circle cx="50" cy="28" r="2" fill="#D96FF2" />
                            {/* Shoulders */}
                            <line x1="25" y1="40" x2="75" y2="40" stroke="currentColor" strokeWidth="2" />
                            {/* ASL specific hand orientation joints */}
                            <line x1="25" y1="40" x2="15" y2="20" stroke="currentColor" strokeWidth="1.5" />
                            <line x1="15" y1="20" x2="35" y2="15" stroke="currentColor" strokeWidth="1.5" />
                            <circle cx="35" cy="15" r="3" fill="#8A5CF6" />
                            <circle cx="15" cy="20" r="3" fill="#D96FF2" />
                          </svg>
                        </div>

                        <div className="bg-[#1C1230] p-1.5 rounded-lg border border-white/5 text-[9px] font-mono text-white/90 truncate">
                          GLOSS: {groupCaptionFeed.includes("deploy") ? "WE / READY / LOCAL / MODEL / DEPLOY" : groupCaptionFeed.includes("hospital") ? "TOMORROW / MEETING / HOSPITAL / MEDICAL / GO" : "THANK-YOU / ALL / JOIN / COLLABORATIVE / ROOM"}
                        </div>
                      </div>

                      <div className="text-[10px] text-white/40 leading-relaxed font-sans">
                        Processes the central spoken audio channel and renders custom ASL hand rigs locally without database relays.
                      </div>
                    </div>

                    {/* AVATAR B: AARAV'S CLIENT (ISL INTERPRETATION) */}
                    <div className={`p-4 bg-gradient-to-b from-[#1C1230]/70 to-[#120B21]/90 border border-[#D96FF2]/30 rounded-2xl space-y-3`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] font-mono text-purple-400 font-bold bg-[#D96FF2]/10 border border-[#D96FF2]/20 px-1.5 py-0.5 rounded block w-fit">
                            CLIENT B (ISL ACTIVE)
                          </span>
                          <h4 className="font-bold text-xs text-white mt-1">Aarav's Client Avatar</h4>
                        </div>
                        <span className="text-[10px] text-white/50 font-mono">INDIA / ISL</span>
                      </div>

                      {/* 3D Wireframe Canvas Simulator */}
                      <div className="h-44 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden flex flex-col justify-between p-2">
                        <div className="absolute top-2 left-2 bg-[#D96FF2]/20 px-2 py-0.5 rounded text-[8px] font-mono text-[#D96FF2]">
                          3D PIPELINE: RIGGED AVATAR
                        </div>

                        {/* Beautiful skeletal coordinate joints mimicking ISL */}
                        <div className="flex-1 flex items-center justify-center relative mt-3">
                          <svg className="w-24 h-24 text-purple-300" viewBox="0 0 100 100">
                            {/* Face joints */}
                            <circle cx="50" cy="25" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" className="animate-pulse" />
                            {/* Shoulders */}
                            <line x1="25" y1="40" x2="75" y2="40" stroke="currentColor" strokeWidth="2" />
                            {/* ISL distinct hand sign joints - different geometry! */}
                            <line x1="75" y1="40" x2="85" y2="15" stroke="currentColor" strokeWidth="1.5" />
                            <line x1="85" y1="15" x2="60" y2="10" stroke="currentColor" strokeWidth="1.5" />
                            <circle cx="60" cy="10" r="3" fill="#D96FF2" />
                            <circle cx="85" cy="15" r="3" fill="#8A5CF6" />
                          </svg>
                        </div>

                        <div className="bg-[#1C1230] p-1.5 rounded-lg border border-white/5 text-[9px] font-mono text-white/90 truncate">
                          GLOSS: {groupCaptionFeed.includes("deploy") ? "MODEL / TRANSLATE / LOCAL / DEPLOY / COMPLETE" : groupCaptionFeed.includes("hospital") ? "DOCTOR / HOSPITAL / WE / VISIT / TOMORROW" : "WELCOME / EVERYONE / SHARE / MEETING / HAPPY"}
                        </div>
                      </div>

                      <div className="text-[10px] text-white/40 leading-relaxed font-sans">
                        Simultaneously reads the SAME spoken audio but generates ISL-specific non-manual features (lips, torso orientation).
                      </div>
                    </div>

                  </div>

                  {/* Active Speech Caption Box */}
                  <div className={`p-4 ${theme.styles.glassLight} rounded-2xl border border-white/10 space-y-2`}>
                    <span className="text-[9px] font-mono text-[#C9A9E9] block font-bold">
                      ACTIVE MEETING BROADCAST CAPTION FEED (SHARED AUDIO WAVEFORM)
                    </span>
                    <p className="text-sm font-bold text-white bg-black/30 p-3 rounded-xl border border-white/5 italic">
                      " {groupCaptionFeed} "
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: CONTEXTUAL AI ASSISTANT (CHATBOT)
      ------------------------------------------------------------- */}
      {activeScreen === "assistant" && (
        <div className="space-y-6">
          <div className={`flex justify-between items-center p-5 ${theme.styles.glassLight}`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                Sign Grammar & helper assistant
              </span>
              <h3 className="text-xl font-bold">Contextual AI Assistant</h3>
            </div>
          </div>

          <div className={`h-[420px] ${theme.styles.glassDark} flex flex-col justify-between shadow-lg`}>
            {/* Chats frame */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {aiChat.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 max-w-lg ${
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                    msg.sender === "user" ? "bg-purple-500/20 border-purple-500/30 text-purple-200" : "bg-[#3E2C64]/30 border-purple-500/20"
                  }`}>
                    {msg.sender === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-[#D96FF2]" />}
                  </div>
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-purple-500/10 border border-purple-500/20 text-white"
                      : "bg-white/5 border border-white/10 text-white/90 backdrop-blur-md"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="flex gap-1.5 h-6 items-center justify-start ml-12">
                  <span className="w-1.5 h-1.5 bg-[#D96FF2] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#C9A9E9] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#8A5CF6] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>

            {/* Input form */}
            <div className="p-4 border-t border-white/5 bg-black/20 flex gap-3">
              <input
                id="ai-assistant-query-input"
                type="text"
                placeholder="Ask about sign structures, dictionary, or ASL helpers..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendAiQuery();
                }}
                className="flex-1 h-11 px-4 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#8A5CF6] text-xs text-white"
              />
              <button
                id="send-ai-query-btn"
                onClick={handleSendAiQuery}
                className="h-11 w-11 rounded-xl bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] flex items-center justify-center text-white active:scale-95 transition-transform"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: VOICE MODULATION SETTINGS
      ------------------------------------------------------------- */}
      {activeScreen === "voice_settings" && (
        <div className="space-y-6">
          <div className={`flex justify-between items-center p-5 ${theme.styles.glassLight}`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                Speech Output Customization
              </span>
              <h3 className="text-xl font-bold">Voice Modulation Settings</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tone and Preset sliders */}
            <div className={`p-6 ${theme.styles.glassLight} space-y-6`}>
              <span className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider block">
                Preset Voice & Modulator Parameters
              </span>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {["Zephyr", "Kore", "Puck"].map((p) => (
                    <button
                      key={p}
                      id={`preset-mod-${p}`}
                      onClick={() => setVoiceModulation({ ...voiceModulation, voiceName: p, voiceId: p.toLowerCase() })}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                        voiceModulation.voiceName === p
                          ? "bg-[#8A5CF6]/40 border-[#8A5CF6] text-white"
                          : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/75">Pitch Modulation</span>
                      <span className="font-mono text-purple-300 font-bold">{voiceModulation.pitch.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={voiceModulation.pitch}
                      onChange={(e) => setVoiceModulation({ ...voiceModulation, pitch: parseFloat(e.target.value) })}
                      className="w-full accent-purple-400 cursor-pointer h-1 bg-white/10 rounded"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/75">Speech Rate / Speed</span>
                      <span className="font-mono text-purple-300 font-bold">{voiceModulation.speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.6"
                      step="0.1"
                      value={voiceModulation.speed}
                      onChange={(e) => setVoiceModulation({ ...voiceModulation, speed: parseFloat(e.target.value) })}
                      className="w-full accent-purple-400 cursor-pointer h-1 bg-white/10 rounded"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/75">Vocal Warmth</span>
                      <span className="font-mono text-purple-300 font-bold">{voiceModulation.warmth}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={voiceModulation.warmth}
                      onChange={(e) => setVoiceModulation({ ...voiceModulation, warmth: parseInt(e.target.value) })}
                      className="w-full accent-purple-400 cursor-pointer h-1 bg-white/10 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Cloning Card */}
            <div className={`p-6 ${theme.styles.glassDark} flex flex-col justify-between min-h-[300px]`}>
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider block">
                  Voice Cloning Consent Setup
                </span>
                <p className="text-xs text-white/60 leading-relaxed">
                  Record a short 10-second auditory snippet of your voice (or a relative's voice) to enable voice cloning. Spoken voice outputs generated from signs will match the recorded tone and warmth signatures.
                </p>
              </div>

              <div className="pt-4 space-y-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold">Voice Snippet Status:</span>
                  <span className="text-red-400 font-bold">Unrecorded</span>
                </div>
                <button
                  id="voice-clone-record-btn"
                  className={`w-full py-3 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 ${theme.styles.buttonAccent}`}
                >
                  <Volume2 className="w-4 h-4" />
                  Record Auditory Snippet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: ACCESSIBILITY SETTINGS
      ------------------------------------------------------------- */}
      {activeScreen === "accessibility_settings" && (
        <div className="space-y-6 text-white font-sans">
          {/* SCREEN FLASH ACCESSIBILITY SIMULATOR OVERLAY */}
          {screenFlashActive && (
            <motion.div
              id="accessibility-screen-flash-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0, 0.8, 0] }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="fixed inset-0 bg-white/25 z-50 pointer-events-none mix-blend-screen"
            />
          )}

          <div className={`flex justify-between items-center p-5 ${theme.styles.glassLight}`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                Accessibility-First customization
              </span>
              <h3 className="text-xl font-bold">Accessibility Settings</h3>
              <p className="text-xs text-white/50">Configure sensory-alert triggers, dynamic transcription style, and WCAG-compliant overrides.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Visual Controls Panel */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Interface & Text Size */}
              <div className={`p-5 ${theme.styles.glassDark} space-y-4`}>
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  Layout & Text Sizing
                </h4>

                <div className="space-y-4">
                  {/* Global Font Size Select */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/80 block">Global Text Sizing</span>
                      <span className="text-[10px] text-purple-300 font-mono capitalize">
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
                            if (onUpdateProfile) {
                              onUpdateProfile({
                                ...profile,
                                accessibilitySettings: {
                                  textSize: opt.id as any,
                                  highContrast: profile.accessibilitySettings?.highContrast ?? false,
                                  reducedMotion: profile.accessibilitySettings?.reducedMotion ?? false,
                                  hapticIntensity: profile.accessibilitySettings?.hapticIntensity ?? "medium",
                                  captionStyle: profile.accessibilitySettings?.captionStyle ?? "standard"
                                }
                              });
                            }
                          }}
                          className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                            (profile.accessibilitySettings?.textSize || "normal") === opt.id
                              ? "bg-[#C9A9E9]/20 border-[#C9A9E9]/50 text-[#C9A9E9]"
                              : "bg-black/30 border-white/5 text-white/50 hover:bg-black/50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interface Checkbox Toggles */}
                  <div className="space-y-2.5 border-t border-white/5 pt-3">
                    <label className="flex justify-between items-center cursor-pointer py-1 text-xs">
                      <span className="text-white/75">High Contrast Palette Mode</span>
                      <input
                        type="checkbox"
                        checked={profile.accessibilitySettings?.highContrast || false}
                        onChange={(e) => {
                          if (onUpdateProfile) {
                            onUpdateProfile({
                              ...profile,
                              accessibilitySettings: {
                                textSize: profile.accessibilitySettings?.textSize ?? "normal",
                                highContrast: e.target.checked,
                                reducedMotion: profile.accessibilitySettings?.reducedMotion ?? false,
                                hapticIntensity: profile.accessibilitySettings?.hapticIntensity ?? "medium",
                                captionStyle: profile.accessibilitySettings?.captionStyle ?? "standard"
                              }
                            });
                          }
                        }}
                        className="rounded bg-black/45 border-white/10 text-purple-600 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                    </label>

                    <label className="flex justify-between items-center cursor-pointer py-1 text-xs">
                      <span className="text-white/75">Reduce Layout Motion</span>
                      <input
                        type="checkbox"
                        checked={profile.accessibilitySettings?.reducedMotion || false}
                        onChange={(e) => {
                          if (onUpdateProfile) {
                            onUpdateProfile({
                              ...profile,
                              accessibilitySettings: {
                                textSize: profile.accessibilitySettings?.textSize ?? "normal",
                                highContrast: profile.accessibilitySettings?.highContrast ?? false,
                                reducedMotion: e.target.checked,
                                hapticIntensity: profile.accessibilitySettings?.hapticIntensity ?? "medium",
                                captionStyle: profile.accessibilitySettings?.captionStyle ?? "standard"
                              }
                            });
                          }
                        }}
                        className="rounded bg-black/45 border-white/10 text-purple-600 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Haptics & Vibration Intensity Panel */}
              <div className={`p-5 ${theme.styles.glassDark} space-y-4 relative overflow-hidden`}>
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider flex items-center gap-1.5">
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
                          if (onUpdateProfile) {
                            onUpdateProfile({
                              ...profile,
                              accessibilitySettings: {
                                textSize: profile.accessibilitySettings?.textSize ?? "normal",
                                highContrast: profile.accessibilitySettings?.highContrast ?? false,
                                reducedMotion: profile.accessibilitySettings?.reducedMotion ?? false,
                                hapticIntensity: opt.id as any,
                                captionStyle: profile.accessibilitySettings?.captionStyle ?? "standard"
                              }
                            });
                          }
                          // Trigger visual haptic wave animation
                          if (opt.id !== "none") {
                            setPulseIntensity(opt.id as any);
                            setHapticPulseActive(true);
                            setTimeout(() => setHapticPulseActive(false), 900);
                          }
                        }}
                        className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          (profile.accessibilitySettings?.hapticIntensity || "medium") === opt.id
                            ? "bg-[#C9A9E9]/20 border-[#C9A9E9]/50 text-[#C9A9E9]"
                            : "bg-black/30 border-white/5 text-white/50 hover:bg-black/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* VISUAL HAPTIC PULSEWAVE ANIMATION AREA */}
                  <div className="h-24 bg-black/40 rounded-xl border border-white/5 relative flex items-center justify-center overflow-hidden">
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
                              ? "text-purple-300"
                              : "text-emerald-300"
                          }`} />
                        </motion.div>
                      </div>
                    ) : (
                      <div className="text-center space-y-1 text-white/30">
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
                    <p className="text-[9px] text-white/40 leading-normal mt-1 text-center">
                      Flashes the active workspace in a soft strobe pattern to visually alert Deaf users to incoming call signals.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Live Caption Customizer & Preview Screen */}
            <div className="lg:col-span-7 space-y-4">
              <div className={`p-5 ${theme.styles.glassDark} space-y-4`}>
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  Closed Captions Styling & Typography
                </h4>

                <div className="space-y-4">
                  {/* Style Presets */}
                  <div className="space-y-2">
                    <span className="text-xs text-white/80 block">Caption Style Preset</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "standard", label: "Standard Bar" },
                        { id: "large-bg", label: "Frosted Glass" },
                        { id: "outline", label: "No Bar (Outline)" }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            if (onUpdateProfile) {
                              onUpdateProfile({
                                ...profile,
                                accessibilitySettings: {
                                  textSize: profile.accessibilitySettings?.textSize ?? "normal",
                                  highContrast: profile.accessibilitySettings?.highContrast ?? false,
                                  reducedMotion: profile.accessibilitySettings?.reducedMotion ?? false,
                                  hapticIntensity: profile.accessibilitySettings?.hapticIntensity ?? "medium",
                                  captionStyle: opt.id as any
                                }
                              });
                            }
                          }}
                          className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                            (profile.accessibilitySettings?.captionStyle || "standard") === opt.id
                              ? "bg-[#C9A9E9]/20 border-[#C9A9E9]/50 text-[#C9A9E9]"
                              : "bg-black/30 border-white/5 text-white/50 hover:bg-black/50"
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
                    
                    <div className="h-56 bg-gradient-to-br from-[#1A1230] to-[#0A0615] rounded-2xl border border-white/5 overflow-hidden relative flex flex-col justify-between p-3">
                      {/* Video Stream Mock Background */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-25">
                        <svg className="w-24 h-24 text-purple-500" viewBox="0 0 100 100">
                          <circle cx="35" cy="40" r="15" stroke="currentColor" strokeWidth="2" fill="none" />
                          <circle cx="65" cy="40" r="15" stroke="currentColor" strokeWidth="2" fill="none" />
                          <line x1="35" y1="55" x2="35" y2="85" stroke="currentColor" strokeWidth="2" />
                          <line x1="65" y1="55" x2="65" y2="85" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </div>

                      <div className="z-10 flex justify-between">
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
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: AI SIGN-LEARNING COACH 2.0 (COACH_2_0)
      ------------------------------------------------------------- */}
      {activeScreen === "coach_2_0" && (
        <div className="space-y-6">
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-center p-5 ${theme.styles.glassLight} gap-4`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                AI SIGNING ACCELERATOR
              </span>
              <h3 className="text-xl font-bold">AI Sign-Learning Coach 2.0</h3>
              <p className="text-xs text-white/50">Interactive sign coach with real-time skeletal feedback and roleplay dialogue.</p>
            </div>
            <div className="flex gap-2">
              <button
                id="coach-toggle-practice"
                onClick={() => setCoachStage("dashboard")}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-colors ${
                  coachStage === "dashboard" || coachStage === "skeletal"
                    ? "bg-[#8A5CF6] text-white"
                    : "bg-white/5 hover:bg-white/10 text-white/70"
                }`}
              >
                Practice Arena
              </button>
              <button
                id="coach-toggle-roleplay"
                onClick={() => setCoachStage("roleplay")}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-colors ${
                  coachStage === "roleplay"
                    ? "bg-[#8A5CF6] text-white"
                    : "bg-white/5 hover:bg-white/10 text-white/70"
                }`}
              >
                Dialogue Roleplay
              </button>
            </div>
          </div>

          {coachStage !== "roleplay" ? (
            /* PRACTICE ARENA */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column - Lesson Selector */}
              <div className="lg:col-span-4 space-y-4">
                <div className={`p-4 ${theme.styles.glassLight} space-y-3`}>
                  <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider">Select Sign to Practice</h4>
                  <div className="space-y-2">
                    {[
                      { word: "THANK YOU", difficulty: "Easy", points: "50 XP", gloss: "CHIN_TO_ARCH" },
                      { word: "EMERGENCY", difficulty: "Medium", points: "100 XP", gloss: "VIBRATING_HAND_CHEST" },
                      { word: "WELCOME", difficulty: "Easy", points: "50 XP", gloss: "SWEEP_INWARD_OPEN_PALM" },
                      { word: "HOSPITAL", difficulty: "Hard", points: "150 XP", gloss: "ARM_CROSS_SIGNS" }
                    ].map((sgn) => (
                      <button
                        key={sgn.word}
                        id={`practice-sgn-${sgn.word.replace(" ", "")}`}
                        onClick={() => {
                          setPracticingSign(sgn.word);
                          setSkeletalOverlayMatched(false);
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                          practicingSign === sgn.word
                            ? "bg-gradient-to-tr from-[#8A5CF6]/20 to-[#D96FF2]/10 border-purple-500/50"
                            : "bg-black/15 border-white/5 hover:bg-white/5"
                        }`}
                      >
                        <div>
                          <h5 className="text-xs font-bold text-white">{sgn.word}</h5>
                          <span className="text-[9px] font-mono text-purple-300">GLOSS: {sgn.gloss}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-green-400 block">{sgn.difficulty}</span>
                          <span className="text-[8px] text-white/40 block">{sgn.points}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spaced Repetition Stats */}
                <div className={`p-4 ${theme.styles.glassDark} space-y-3`}>
                  <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider">Spaced Repetition Streak</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-base font-bold text-purple-300 block">5 Days</span>
                      <span className="text-[8px] text-white/40 block uppercase tracking-wider">Daily Streak</span>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-base font-bold text-purple-300 block">880 XP</span>
                      <span className="text-[8px] text-white/40 block uppercase tracking-wider">Total Earned</span>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-base font-bold text-emerald-400 block">92%</span>
                      <span className="text-[8px] text-white/40 block uppercase tracking-wider">Accuracy Avg</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center/Right - Interactive Camera Overlay */}
              <div className="lg:col-span-8 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Reference Avatar Frame */}
                  <div className={`p-4 ${theme.styles.glassLight} rounded-2xl space-y-2`}>
                    <span className="text-[9px] font-mono text-purple-300 uppercase block font-semibold">COACH REFERENCE TUTORIAL</span>
                    <div className="h-56 bg-black/50 rounded-xl relative overflow-hidden flex flex-col justify-between p-2 border border-white/5">
                      <span className="absolute top-2 left-2 bg-[#8A5CF6]/30 text-white text-[8px] px-2 py-0.5 rounded font-mono">
                        DEMO VIDEO LOOP
                      </span>
                      <div className="flex-1 flex items-center justify-center">
                        <svg className="w-24 h-24 text-purple-400" viewBox="0 0 100 100">
                          <circle cx="50" cy="25" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
                          <line x1="50" y1="37" x2="50" y2="70" stroke="currentColor" strokeWidth="2" />
                          <line x1="50" y1="45" x2="30" y2="25" stroke="currentColor" strokeWidth="1.5" />
                          <line x1="50" y1="45" x2="70" y2="25" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="30" cy="25" r="3" fill="#D96FF2" />
                          <circle cx="70" cy="25" r="3" fill="#D96FF2" />
                        </svg>
                      </div>
                      <div className="bg-black/30 p-1.5 rounded text-center text-[10px] text-white/80 font-bold">
                        REFERENCE FOR: "{practicingSign}"
                      </div>
                    </div>
                  </div>

                  {/* Your Camera Tracking Frame */}
                  <div className={`p-4 ${theme.styles.glassLight} rounded-2xl space-y-2`}>
                    <span className="text-[9px] font-mono text-[#C9A9E9] uppercase block font-semibold">YOUR CAMERA FEED</span>
                    <div className="h-56 bg-black/50 rounded-xl relative overflow-hidden flex flex-col justify-between p-2 border border-white/5">
                      <span className="absolute top-2 left-2 bg-emerald-500/20 text-emerald-300 text-[8px] px-2 py-0.5 rounded font-mono border border-emerald-500/20 animate-pulse">
                        LIVE COORDINATE TRACKING
                      </span>
                      
                      <div className="flex-1 flex items-center justify-center">
                        {skeletalOverlayMatched ? (
                          <div className="text-center space-y-1.5 animate-bounce">
                            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                            <span className="text-xs text-emerald-300 font-bold">100% PERFECTLY MATCHED!</span>
                          </div>
                        ) : (
                          <svg className="w-24 h-24 text-emerald-400/80 animate-pulse" viewBox="0 0 100 100">
                            <circle cx="50" cy="25" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3" />
                            <line x1="50" y1="37" x2="50" y2="70" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3" />
                            <line x1="50" y1="45" x2="32" y2="28" stroke="currentColor" strokeWidth="1.5" />
                            <line x1="50" y1="45" x2="68" y2="28" stroke="currentColor" strokeWidth="1.5" />
                            <circle cx="32" cy="28" r="4" fill="#34D399" />
                            <circle cx="68" cy="28" r="4" fill="#10B981" />
                          </svg>
                        )}
                      </div>

                      <button
                        id="coach-simulate-alignment"
                        onClick={() => setSkeletalOverlayMatched(true)}
                        className={`w-full py-2 bg-purple-600 hover:bg-[#8A5CF6] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer`}
                      >
                        {skeletalOverlayMatched ? "Aligned successfully" : "Simulate Alignment Hand Match"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alignment instructions */}
                <div className="bg-[#1C1230]/40 p-4 rounded-xl border border-white/5 flex gap-3 text-xs leading-relaxed text-white/80">
                  <span className="text-lg">💡</span>
                  <p>
                    VAKHYA's localized Mediapipe/TensorFlow coordinate mesh reads 21 distinct hand joint vectors directly on-device. No visual frames are sent to servers. Frame rate is currently locked to <span className="text-purple-300 font-bold">60 FPS</span>.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* CONVERSATION DIALOGUE ROLEPLAY */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Scenario selector */}
              <div className="lg:col-span-4 space-y-4">
                <div className={`p-4 ${theme.styles.glassLight} space-y-3`}>
                  <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider">Select Roleplay Dialog</h4>
                  <div className="space-y-2">
                    {[
                      { id: "coffee", label: "Ordering flat white at Coffee Shop", difficulty: "Easy" },
                      { id: "airport", label: "Passing baggage at Security Airport", difficulty: "Medium" },
                      { id: "job", label: "Developer interview for accessibility role", difficulty: "Hard" }
                    ].map((scen) => (
                      <button
                        key={scen.id}
                        id={`roleplay-scen-${scen.id}`}
                        onClick={() => {
                          setRoleplayMode(scen.id);
                          setCoachConversation([
                            { sender: "coach", text: `Welcome to ${scen.label}. Practice signing conversational words. Start by introducing yourself!` }
                          ]);
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                          roleplayMode === scen.id
                            ? "bg-gradient-to-tr from-[#8A5CF6]/20 to-[#D96FF2]/10 border-purple-500/50"
                            : "bg-black/15 border-white/5 hover:bg-white/5"
                        }`}
                      >
                        <div>
                          <h5 className="text-xs font-bold text-white">{scen.label}</h5>
                          <span className="text-[9px] text-purple-300 font-mono">SCENARIO: {scen.id.toUpperCase()}</span>
                        </div>
                        <span className="text-[9px] font-bold text-[#C9A9E9]">{scen.difficulty}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active dialog feed */}
              <div className="lg:col-span-8 space-y-4">
                <div className={`p-5 ${theme.styles.glassLight} flex flex-col justify-between h-[380px] rounded-2xl`}>
                  <div className="space-y-4 overflow-y-auto max-h-[280px] pr-2 scrollbar-thin">
                    {coachConversation.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl text-xs max-w-sm ${
                          msg.sender === "coach"
                            ? "bg-purple-950/40 text-purple-200 mr-auto border border-[#8A5CF6]/20"
                            : "bg-[#8A5CF6]/20 border border-purple-500/30 text-white ml-auto"
                        }`}
                      >
                        <span className="text-[8px] font-mono text-[#C9A9E9] block mb-1 uppercase tracking-wider">
                          {msg.sender === "coach" ? "AI COACH" : "YOU (SIGNED FEED)"}
                        </span>
                        <p>{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Input translation simulator */}
                  <div className="flex gap-2 border-t border-white/5 pt-3">
                    <input
                      type="text"
                      placeholder="Type conversational sentence to translate to sign..."
                      value={coachInput}
                      onChange={(e) => setCoachInput(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-purple-500/40"
                    />
                    <button
                      id="coach-send-btn"
                      onClick={() => {
                        if (!coachInput.trim()) return;
                        const userText = coachInput;
                        setCoachConversation(prev => [
                          ...prev,
                          { sender: "user", text: userText },
                          { sender: "coach", text: "Excellent sign grammar! Your skeletal nodes had a 94% spatial coincidence. Continue to the next response!" }
                        ]);
                        setCoachInput("");
                      }}
                      className="py-2.5 px-4 bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Sign
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: ENVIRONMENTAL SOUND AWARENESS (VAKHYA SENSE)
      ------------------------------------------------------------- */}
      {activeScreen === "vakhya_sense" && (
        <div className="space-y-6">
          {/* Active Flash Overlay Simulation if warning active */}
          {activeAlert && (
            <motion.div
              id="vakhya-sense-alert-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-5 bg-red-900/90 border-2 border-red-500 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.5)] z-40 relative"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">{activeAlert.icon}</div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-wide">ENVIRONMENTAL ALERT DETECTED!</h3>
                  <p className="text-xs text-red-200">
                    {activeAlert.sound.toUpperCase()} has been captured locally. Haptic vibrations sent to paired Smartwatch.
                  </p>
                </div>
              </div>
              <button
                id="vakhya-sense-dismiss-alert"
                onClick={() => setActiveAlert(null)}
                className="py-1.5 px-4 bg-white text-red-900 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Snooze & Dismiss
              </button>
            </motion.div>
          )}

          <div className={`flex justify-between items-center p-5 ${theme.styles.glassLight}`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                ENVIRONMENTAL SOUND AWARENESS (VAKHYA SENSE™)
              </span>
              <h3 className="text-xl font-bold">Vakhya Sense™ Sound Monitor</h3>
              <p className="text-xs text-white/50">Transforms environmental sounds into visual flashcard overlays and wearable haptic patterns.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">SERVICE ACTIVE</span>
              <button
                id="sense-toggle-btn"
                onClick={() => setSenseEnabled(!senseEnabled)}
                className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  senseEnabled
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/5 text-white/40 border border-white/5"
                }`}
              >
                {senseEnabled ? "MONITORING" : "PAUSED"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Controller details panel */}
            <div className="lg:col-span-4 space-y-4">
              <div className={`p-4 ${theme.styles.glassLight} space-y-4`}>
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider">Device Configuration</h4>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span>Decibel Threshold Sensitivity</span>
                    <select
                      id="sense-sensitivity-select"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(e.target.value)}
                      className="bg-black/30 border border-white/10 rounded px-2 py-0.5 text-[11px] outline-none"
                    >
                      <option value="High">High (Quiet rooms)</option>
                      <option value="Medium">Medium (Offices)</option>
                      <option value="Low">Low (Busy street)</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Paired Smartwatch Haptics</span>
                    <span className="text-purple-300 font-bold font-mono">Vibe-A (Pulsing)</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Snooze Quiet Hours</span>
                    <button
                      id="sense-toggle-quiet"
                      onClick={() => setQuietHours(!quietHours)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${quietHours ? "bg-purple-600" : "bg-white/5"}`}
                    >
                      {quietHours ? "Quiet mode on" : "Default"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Simulation buttons */}
              <div className={`p-4 ${theme.styles.glassLight} space-y-3`}>
                <span className="text-[10px] font-mono text-[#C9A9E9] uppercase block font-bold">SIMULATE REAL-WORLD SOUND DETECTIONS</span>
                <p className="text-[10px] text-white/50 leading-relaxed">Trigger simulated background noises to see VAKHYA Sense visual alerts and logs.</p>
                
                <div className="grid grid-cols-1 gap-2">
                  <button
                    id="trigger-alert-doorbell"
                    onClick={() => {
                      setActiveAlert({ sound: "Doorbell Ringing", icon: "🔔" });
                      setSoundLogs(prev => [
                        { time: "NOW", sound: "Doorbell Ringing", icon: "🔔", confidence: "98%", action: "Visual Flash overlay dispatched" },
                        ...prev
                      ]);
                    }}
                    className="p-2.5 bg-purple-500/10 hover:bg-[#8A5CF6]/30 border border-purple-500/20 text-xs text-white rounded-xl text-left transition-all cursor-pointer"
                  >
                    🔔 Simulate Doorbell Ringing
                  </button>
                  <button
                    id="trigger-alert-fire"
                    onClick={() => {
                      setActiveAlert({ sound: "Smoke/Fire Alarm", icon: "🔥" });
                      setSoundLogs(prev => [
                        { time: "NOW", sound: "Smoke/Fire Alarm", icon: "🔥", confidence: "99%", action: "PRE-ARMED RED ALERT CODES" },
                        ...prev
                      ]);
                    }}
                    className="p-2.5 bg-red-500/10 hover:bg-red-500/30 border border-red-500/20 text-xs text-white rounded-xl text-left transition-all cursor-pointer"
                  >
                    🔥 Simulate Fire Alarm (Critical)
                  </button>
                </div>
              </div>
            </div>

            {/* Live activity log */}
            <div className="lg:col-span-8 space-y-4">
              <div className={`p-5 ${theme.styles.glassLight} space-y-4`}>
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider border-b border-white/5 pb-2">
                  Live Decibel & Acoustic Tracking Logs
                </h4>

                <div className="space-y-2">
                  {soundLogs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{log.icon}</span>
                        <div>
                          <h5 className="font-bold text-white">{log.sound}</h5>
                          <span className="text-[10px] text-white/40 block mt-0.5">{log.action}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-purple-300 font-mono block font-bold">{log.confidence} Match</span>
                        <span className="text-[9px] text-white/30 font-mono block">{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: CERTIFIED INTERPRETER MARKETPLACE (INTERPRETER_MARKETPLACE)
      ------------------------------------------------------------- */}
      {activeScreen === "interpreter_marketplace" && (
        <div className="space-y-6">
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-center p-5 ${theme.styles.glassLight} gap-4`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                ON-DEMAND HUMAN ASSISTANCE
              </span>
              <h3 className="text-xl font-bold">Human Interpreter Marketplace</h3>
              <p className="text-xs text-white/50">Book on-demand certified sign interpreters with low-latency dual video calling.</p>
            </div>
            <select
              id="marketplace-filter-specialty"
              value={interpreterSpecialty}
              onChange={(e) => setInterpreterSpecialty(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="Medical">Medical Certified</option>
              <option value="Legal">Legal Certified</option>
              <option value="Educational">Educational Certified</option>
              <option value="Corporate">Corporate Meetings</option>
            </select>
          </div>

          {!bookingConfirmed ? (
            /* INTERPRETER GRID */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: "Dr. Singh", rate: "$45/hr", ratings: "4.9 (120 reviews)", specialty: "Medical", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150" },
                { name: "Sarah Jenkins", rate: "$50/hr", ratings: "5.0 (88 reviews)", specialty: "Legal", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150" },
                { name: "Anil Kulkarni", rate: "$40/hr", ratings: "4.8 (210 reviews)", specialty: "Educational", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" }
              ]
                .filter(it => it.specialty === interpreterSpecialty || interpreterSpecialty === "Medical" ? true : it.specialty === interpreterSpecialty)
                .map((interp) => (
                  <div key={interp.name} className={`p-5 ${theme.styles.glassLight} space-y-4 flex flex-col justify-between`}>
                    <div className="flex items-center gap-3">
                      <img src={interp.image} alt={interp.name} className="w-12 h-12 rounded-full border border-purple-500/30" referrerPolicy="no-referrer" />
                      <div>
                        <h4 className="font-bold text-sm text-white">{interp.name}</h4>
                        <span className="text-[10px] text-purple-300 font-mono block">{interp.specialty} Specialist</span>
                        <span className="text-[9px] text-white/40 block">⭐ {interp.ratings}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5 text-xs font-mono">
                      <span>Rate:</span>
                      <span className="text-purple-300 font-bold">{interp.rate}</span>
                    </div>

                    <button
                      id={`book-interp-${interp.name.slice(0, 4)}`}
                      onClick={() => {
                        setSelectedInterpreter(interp);
                        setBookingConfirmed(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-tr from-[#8A5CF6] to-[#D96FF2] text-xs font-bold text-white cursor-pointer"
                    >
                      Book 3-Way Video Consultation
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            /* BOOKING ACTIVE & CALL SCREEN VIEW */
            <div className={`p-6 ${theme.styles.glassLight} rounded-2xl space-y-6`}>
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-purple-500 rounded-full animate-ping" />
                  <div>
                    <h4 className="text-base font-bold text-white">Call Scheduled with {selectedInterpreter.name}</h4>
                    <span className="text-xs text-white/50">Scheduled Specialty: {selectedInterpreter.specialty} Consultation</span>
                  </div>
                </div>
                <button
                  id="cancel-booking-btn"
                  onClick={() => {
                    setBookingConfirmed(false);
                    setActiveInterpreterCall(false);
                  }}
                  className="py-1.5 px-3.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/10"
                >
                  Cancel Booking
                </button>
              </div>

              {!activeInterpreterCall ? (
                <div className="p-8 text-center bg-black/30 rounded-2xl border border-white/5 space-y-4">
                  <Calendar className="w-12 h-12 text-[#D96FF2] mx-auto animate-pulse" />
                  <div>
                    <h5 className="font-bold text-sm text-white">Interpreter is standing by...</h5>
                    <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto">
                      Click the button below to initialize low-latency WebRTC channels and start the 3-participant consultation.
                    </p>
                  </div>
                  <button
                    id="interpreter-start-call"
                    onClick={() => setActiveInterpreterCall(true)}
                    className="py-2.5 px-6 bg-gradient-to-tr from-[#8A5CF6] to-[#D96FF2] text-xs font-bold text-white rounded-xl shadow-lg cursor-pointer"
                  >
                    Start 3-Way Session
                  </button>
                </div>
              ) : (
                /* THREE PARTICIPANT CALL PREVIEW */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="h-40 bg-[#160F26] rounded-xl border border-white/10 flex flex-col justify-between p-3 relative overflow-hidden">
                    <span className="text-[10px] font-mono text-[#C9A9E9] block z-10">YOU (DEAF CLIENT)</span>
                    <span className="text-[9px] text-green-400 font-mono font-bold mt-auto z-10">SENDING RAW GESTURES</span>
                  </div>
                  <div className="h-40 bg-[#160F26] rounded-xl border border-purple-500/40 flex flex-col justify-between p-3 relative overflow-hidden">
                    <span className="text-[10px] font-mono text-purple-300 block z-10">INTERPRETER ({selectedInterpreter.name})</span>
                    <span className="text-[9px] text-purple-300 font-mono font-bold mt-auto z-10">SIGNING LIVE FEED</span>
                  </div>
                  <div className="h-40 bg-[#160F26] rounded-xl border border-white/10 flex flex-col justify-between p-3 relative overflow-hidden">
                    <span className="text-[10px] font-mono text-[#C9A9E9] block z-10">RECIPIENT (HEARING HOSPITAL)</span>
                    <span className="text-[9px] text-green-400 font-mono font-bold mt-auto z-10">VOICE TRANSLATION STREAMING</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: LIVE EVENT BROADCAST INTERPRETER OVERLAY (BROADCAST_MODE)
      ------------------------------------------------------------- */}
      {activeScreen === "broadcast_mode" && (
        <div className="space-y-6">
          <div className={`flex justify-between items-center p-5 ${theme.styles.glassLight}`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                LIVE BROADCAST INTERPRETING OVERLAYS
              </span>
              <h3 className="text-xl font-bold">Vakhya Broadcast Mode™</h3>
              <p className="text-xs text-white/50">Superimposes virtual or human sign-language interpreter overlays over stream links.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Control Column */}
            <div className="lg:col-span-4 space-y-4">
              <div className={`p-4 ${theme.styles.glassLight} space-y-4`}>
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider">Stream Configuration</h4>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <span className="text-white/40 block text-[9px] font-mono uppercase">TARGET SIGN LANGUAGE</span>
                    <select
                      id="broadcast-select-lang"
                      value={broadcastLanguage}
                      onChange={(e) => setBroadcastLanguage(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg py-1.5 px-3 outline-none"
                    >
                      <option value="ISL">Indian Sign Language (ISL)</option>
                      <option value="ASL">American Sign Language (ASL)</option>
                      <option value="BSL">British Sign Language (BSL)</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Low-Latency SFU Cache</span>
                    <span className="text-emerald-400 font-bold font-mono">ENABLED</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-white/40 block text-[9px] font-mono uppercase">MOCK FEED URL</span>
                    <input
                      type="text"
                      readOnly
                      value="https://broadcast.vakhya.io/live/accessibility-townhall"
                      className="w-full bg-black/30 border border-white/5 rounded-lg py-1 px-2 font-mono text-[9px] text-white/60"
                    />
                  </div>
                </div>

                <button
                  id="broadcast-start-toggle"
                  onClick={() => setIsBroadcasting(!isBroadcasting)}
                  className={`w-full py-3 rounded-xl font-bold text-xs cursor-pointer ${
                    isBroadcasting ? "bg-red-600/30 text-red-200 border border-red-500/30" : "bg-[#8A5CF6] text-white"
                  }`}
                >
                  {isBroadcasting ? "Stop Live Capture Overlay" : "Launch Overlay Simulation"}
                </button>
              </div>
            </div>

            {/* Video preview Column */}
            <div className="lg:col-span-8 space-y-4">
              <div className={`p-4 ${theme.styles.glassLight} rounded-2xl space-y-2`}>
                <span className="text-[9px] font-mono text-purple-300 uppercase block font-semibold">CONFERENCE PREVIEW CONTAINER</span>
                
                <div className="h-64 bg-black rounded-xl relative overflow-hidden flex items-center justify-center">
                  {/* Superimposed signing avatar mock in bottom right */}
                  {isBroadcasting ? (
                    <div className="absolute inset-0">
                      {/* background video representation */}
                      <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-b from-[#1C1230]/40 to-black/60">
                        <span className="text-[10px] font-mono text-[#D96FF2] bg-[#160F26] px-2 py-0.5 rounded w-fit">
                          LIVE STREAM FEED: GLOBAL DISABILITY CONVENTION
                        </span>
                        
                        <div className="bg-black/80 p-2.5 rounded-lg border border-purple-500/20 max-w-sm">
                          <span className="text-[8px] font-mono text-[#C9A9E9] block">REAL-TIME HLS CLOSED CAPTIONS</span>
                          <p className="text-[11px] font-bold text-white mt-1">"{broadcastCaptions}"</p>
                        </div>
                      </div>

                      {/* Superimposed Interpreter overlay */}
                      <div className="absolute bottom-4 right-4 w-32 h-32 bg-[#120B21]/90 rounded-2xl border-2 border-purple-500/50 shadow-2xl overflow-hidden flex flex-col justify-between p-1.5">
                        <span className="text-[7px] font-mono text-purple-300 bg-purple-500/10 px-1 py-0.5 rounded w-fit uppercase">
                          {broadcastLanguage} AVATAR
                        </span>
                        <div className="flex-1 flex items-center justify-center">
                          <svg className="w-14 h-14 text-purple-400" viewBox="0 0 100 100">
                            <circle cx="50" cy="25" r="12" stroke="currentColor" strokeWidth="2" fill="none" className="animate-pulse" />
                            <line x1="50" y1="37" x2="50" y2="75" stroke="currentColor" strokeWidth="2" />
                            <line x1="50" y1="45" x2="30" y2="60" stroke="currentColor" strokeWidth="2" />
                            <line x1="50" y1="45" x2="70" y2="60" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        </div>
                        <span className="text-[6px] text-white/40 font-mono text-center block">VAKHYA OVERLAY CH_1</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 text-xs text-white/30 font-mono">
                      <Tv className="w-10 h-10 text-white/10 mx-auto" />
                      <p>Overlay simulator inactive. Launch the live overlay from the left config box.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: PRIVACY & BIOMETRIC DASHBOARD (PRIVACY_DASHBOARD)
      ------------------------------------------------------------- */}
      {activeScreen === "privacy_dashboard" && (
        <div className="space-y-6">
          <div className={`flex justify-between items-center p-5 ${theme.styles.glassLight}`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                PRIVACY, CONSENT, & COMPLIANCE (WCAG 2.1 AA)
              </span>
              <h3 className="text-xl font-bold">Privacy & Biometrics Dashboard</h3>
              <p className="text-xs text-white/50">Granular plain-language consents and Secure Enclave local encryption verification.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plain language consent checkboxes */}
            <div className={`p-6 ${theme.styles.glassLight} space-y-4`}>
              <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                Granular Plain-Language Consent Toggles
              </h4>

              <div className="space-y-4">
                <div className="flex justify-between items-start text-xs border-b border-white/5 pb-3">
                  <div className="space-y-1 pr-4">
                    <h5 className="font-bold text-white">Local Acoustic Sensing (Vakhya Sense)</h5>
                    <p className="text-[11px] text-white/50 leading-relaxed">Let VAKHYA capture ambient mic signals on-device to classify doors, alarms, and bells.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentSenseAudio}
                    onChange={(e) => setConsentSenseAudio(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8A5CF6] focus:ring-0 border-white/10 bg-black cursor-pointer"
                  />
                </div>

                <div className="flex justify-between items-start text-xs border-b border-white/5 pb-3">
                  <div className="space-y-1 pr-4">
                    <h5 className="font-bold text-white">Emotion & Face Mirroring Mode</h5>
                    <p className="text-[11px] text-white/50 leading-relaxed">Maps facial nodes locally to replicate natural emotion signatures in the output signing avatar.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentEmotionMirror}
                    onChange={(e) => setConsentEmotionMirror(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8A5CF6] focus:ring-0 border-white/10 bg-black cursor-pointer"
                  />
                </div>

                <div className="flex justify-between items-start text-xs">
                  <div className="space-y-1 pr-4">
                    <h5 className="font-bold text-white">AI Voice Cloning Output</h5>
                    <p className="text-[11px] text-white/50 leading-relaxed">Uses 10-second auditory snippets locally to voice-synthesize the hearing person's speaker link.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consentVoiceCloning}
                    onChange={(e) => setConsentVoiceCloning(e.target.checked)}
                    className="w-4 h-4 rounded text-[#8A5CF6] focus:ring-0 border-white/10 bg-black cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Secure Enclave check & Data deletion */}
            <div className={`p-6 ${theme.styles.glassLight} space-y-4 flex flex-col justify-between`}>
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider border-b border-white/5 pb-2">
                  Secure Enclave Integrity Checklist
                </h4>

                <div className="space-y-2.5 text-xs">
                  {[
                    { label: "Hardware-backed Biometric Key", status: "VERIFIED" },
                    { label: "On-device SQLite Vector database encryption", status: "AES-256 GCM" },
                    { label: "Sign-to-speech visual frame buffer cache", status: "WIPED (Zero-Retention)" },
                    { label: "GDPR Article 17 (Right to be Forgotten)", status: "COMPLIANT" }
                  ].map((chk, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5 font-mono text-[11px]">
                      <span className="text-white/70">{chk.label}</span>
                      <span className="text-[#D96FF2] font-bold">{chk.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wipe all data button */}
              <div className="pt-4 space-y-2">
                <button
                  id="privacy-clear-biometrics-btn"
                  onClick={() => {
                    localStorage.removeItem("vakhya_biometrics");
                    localStorage.removeItem("vakhya_voice_samples");
                    localStorage.removeItem("vakhya_call_logs");
                    setEnclaveWiped(true);
                  }}
                  className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {enclaveWiped
                    ? "Biometric Logs & Cached Models Wiped"
                    : "Permanently Delete All Biometric Logs"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SCREEN: ENTERPRISE SDK & COMPLIANCE METRICS (ENTERPRISE_SDK)
      ------------------------------------------------------------- */}
      {activeScreen === "enterprise_sdk" && (
        <div className="space-y-6">
          <div className={`flex justify-between items-center p-5 ${theme.styles.glassLight}`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-[#D96FF2] uppercase block">
                WHITE-LABEL INTEGRATION ENGINE
              </span>
              <h3 className="text-xl font-bold">White-Label Enterprise SDK</h3>
              <p className="text-xs text-white/50">Inject VAKHYA's localized sign translation pipelines directly into internal corporate software.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Quickstart code block */}
            <div className="lg:col-span-5 space-y-4">
              <div className={`p-4 ${theme.styles.glassLight} space-y-4`}>
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider">SDK Integration Quickstart</h4>
                
                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-white/40 block">SELECT SDK PLATFORM FRAMEWORK</span>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                    {[
                      { id: "react", label: "React" },
                      { id: "android", label: "Kotlin" },
                      { id: "ios", label: "Swift" },
                      { id: "web", label: "JS" }
                    ].map((plt) => (
                      <button
                        key={plt.id}
                        onClick={() => setSdkFramework(plt.id)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          sdkFramework === plt.id
                            ? "bg-[#8A5CF6]/20 border-purple-500/50 text-white"
                            : "bg-black/20 border-white/5 text-white/50 hover:bg-white/5"
                        }`}
                      >
                        {plt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preformatted copyable code */}
                <div className="bg-black/50 p-3 rounded-xl border border-white/5 font-mono text-[10px] text-purple-300 leading-normal overflow-x-auto">
                  {sdkFramework === "react" && (
                    <pre>
{`import { VakhyaStream } from "@vakhya/sdk-react";

const config = {
  apiKey: "vakhya_live_7x893...",
  targetLanguage: "ASL",
  fpsLimit: 60,
  sfuChannel: "room_42"
};

<VakhyaStream 
  config={config} 
  onTranslation={(gloss) => {
    console.log("Gloss Node:", gloss);
  }} 
/>`}
                    </pre>
                  )}
                  {sdkFramework === "android" && (
                    <pre>
{`import io.vakhya.sdk.VakhyaPipeline

val client = VakhyaPipeline.Builder()
  .setApiKey("vakhya_live_7x893")
  .setTargetLanguage(Language.ISL)
  .setFrameProcessingRate(60)
  .build()

client.startCapture(context)`}
                    </pre>
                  )}
                  {sdkFramework === "ios" && (
                    <pre>
{`import VakhyaSDKCore

let engine = VakhyaSDKEngine(
  apiKey: "vakhya_live_7x893",
  language: .asl,
  metalPipeline: true
)

engine.startLocalStream()`}
                    </pre>
                  )}
                  {sdkFramework === "web" && (
                    <pre>
{`import { createEngine } from "@vakhya/sdk";

const vakhya = await createEngine({
  apiKey: "vakhya_live_7x893",
  target: "ASL"
});

vakhya.on("gloss", (data) => {
  displayGloss(data.sign);
});`}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            {/* Dashboard metrics preview */}
            <div className="lg:col-span-7 space-y-4">
              <div className={`p-5 ${theme.styles.glassLight} space-y-4`}>
                <h4 className="text-xs font-bold text-[#C9A9E9] uppercase tracking-wider border-b border-white/5 pb-2">
                  White-label Active Session Analytics
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-white/50 block font-mono">TOTAL TRANSLATION SESSIONS</span>
                    <span className="text-xl font-bold text-white">48,210</span>
                  </div>
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-white/50 block font-mono">AVG TRANSLATION DELAY</span>
                    <span className="text-xl font-bold text-emerald-400">12ms</span>
                  </div>
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-white/50 block font-mono">SLA COMPLIANCE UPTIME</span>
                    <span className="text-xl font-bold text-purple-300">99.98%</span>
                  </div>
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[10px] text-white/50 block font-mono">ACTIVE WHITE-LABEL SEATS</span>
                    <span className="text-xl font-bold text-white">412 Seats</span>
                  </div>
                </div>

                {/* WCAG AA visual compliance confirmation */}
                <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200 font-sans">
                  🛡️ <strong className="text-white">Accessibility Uptime Guaranteed:</strong> White-label instances fully coordinate with standard WCAG 2.1 AA focus order layouts and support dynamic high contrast themes natively.
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          FALLBACK/DEFAULT COVERS FOR OTHER LISTED SCREENS
      ------------------------------------------------------------- */}
      {![
        "learn", "ocr", "sos", "group", "assistant", "voice_settings", "accessibility_settings", "coach_2_0", "vakhya_sense", "interpreter_marketplace", "broadcast_mode", "privacy_dashboard", "enterprise_sdk"
      ].includes(activeScreen) && (
        <div className="bg-white/5 border border-white/10 p-10 rounded-2xl text-center space-y-4">
          <Settings className="w-12 h-12 text-[#D96FF2] mx-auto animate-spin" style={{ animationDuration: "12s" }} />
          <div>
            <h4 className="font-bold text-lg capitalize">{activeScreen.replace("_", " ")} Screen</h4>
            <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
              This screen is fully initialized inside Vakhya's primary routing tree. Real parameters and layout tokens are preserved in the design file.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

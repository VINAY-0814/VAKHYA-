import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Database,
  Hand,
  Layers,
  Plus,
  Search,
  Sparkles,
  Volume2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { UserProfile } from "../types";
import { theme } from "../theme";
import {
  downsampleFrames,
  drawRealHandSkeleton,
  initHandLandmarker,
  PoseKeyframe,
  WebcamSignTracker,
} from "../services/webcamSignTracker";
import { playWavOrSpeech, unlockAudioPlayback } from "../services/ttsPlayer";

interface IslLexiconItem {
  id: string;
  gloss: string;
  english: string;
  category: string;
  handedness: "one_hand" | "two_hand";
  signType: "static" | "dynamic" | "compound";
  spatialAnchor: string;
  nonManual: { eyebrows: string; mouth: string; headTilt: string };
  islNotes: string;
  verificationStatus: "verified" | "community_review" | "needs_samples";
  sampleCount: number;
  verifiedBy?: string;
  updatedAt: string;
}

interface IslStats {
  targetGoal: number;
  totalCount: number;
  verifiedCount: number;
  reviewCount: number;
  needsSamplesCount: number;
  completionPct: number;
  categoryBreakdown: Array<{ category: string; total: number; verified: number }>;
}

interface IslDatasetStudioProps {
  profile: UserProfile;
}

export default function IslDatasetStudio({ profile }: IslDatasetStudioProps) {
  const [items, setItems] = useState<IslLexiconItem[]>([]);
  const [stats, setStats] = useState<IslStats | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // New / Record ISL sign form
  const [recordGloss, setRecordGloss] = useState("");
  const [recordEnglish, setRecordEnglish] = useState("");
  const [recordCategory, setRecordCategory] = useState("Greetings");
  const [recordHandedness, setRecordHandedness] = useState<"one_hand" | "two_hand">("two_hand");
  const [recordAnchor, setRecordAnchor] = useState("chest");
  const [recordEyebrows, setRecordEyebrows] = useState("neutral");
  const [recordNotes, setRecordNotes] = useState("");
  const [isCapturingSample, setIsCapturingSample] = useState(false);
  const [capturedFramesCount, setCapturedFramesCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live camera & Continuous Signing Testbench
  const [isCamOn, setIsCamOn] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [interimGlossStream, setInterimGlossStream] = useState<string[]>([]);
  const [liveSentence, setLiveSentence] = useState("");
  const [liveGloss, setLiveGloss] = useState("");
  const [liveNonManual, setLiveNonManual] = useState("");
  const [clarifyMsg, setClarifyMsg] = useState<string | null>(null);
  const [isInferring, setIsInferring] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<WebcamSignTracker | null>(null);
  const rafRef = useRef<number | null>(null);
  const isCamOnRef = useRef(false);
  const isCapturingRef = useRef(false);
  const recordedPosesRef = useRef<PoseKeyframe[]>([]);

  const poseBufferRef = useRef<PoseKeyframe[]>([]);
  const frameSnapsRef = useRef<string[]>([]);
  const handSummaryRef = useRef("");
  const pendingGlossRef = useRef<string[]>([]);
  const recentContextRef = useRef<string[]>([]);
  const lastInferTsRef = useRef(0);
  const continuousModeRef = useRef(continuousMode);
  continuousModeRef.current = continuousMode;

  const fetchLexicon = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedCategory !== "All") params.set("category", selectedCategory);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      params.set("limit", "160");
      const res = await fetch(`/api/isl/lexicon?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setStats(data.stats || null);
      }
    } catch {
      setErrorMessage("Could not load ISL lexicon registry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLexicon();
    }, 150);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, selectedStatus]);

  useEffect(() => {
    isCamOnRef.current = isCamOn;
    if (!isCamOn) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      poseBufferRef.current = [];
      frameSnapsRef.current = [];
      return;
    }

    initHandLandmarker().catch(() => null);
    if (!trackerRef.current) trackerRef.current = new WebcamSignTracker();

    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        startTrackingLoop();
      })
      .catch(() => {
        setErrorMessage("Camera access is needed for live ISL sample capture and continuous testing.");
        setIsCamOn(false);
      });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isCamOn]);

  const runContinuousInference = async (
    poses: PoseKeyframe[],
    snaps: string[],
    summary: string,
    phraseBoundary: boolean
  ) => {
    if (poses.length < 4 || snaps.length === 0 || isInferring) return;
    setIsInferring(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/translate/pose-to-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pose_sequence: poses.slice(-20),
          frames_base64: downsampleFrames(snaps, 6),
          hand_summary: summary,
          signLanguage: "ISL",
          continuousMode: continuousModeRef.current,
          phraseBoundary,
          pendingGlossStream: pendingGlossRef.current,
          recentContext: recentContextRef.current.slice(-3),
          voicePreset: profile.voiceSettings.voiceName,
          pitch: profile.voiceSettings.pitch,
          speed: profile.voiceSettings.speed,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;

      if (data.isInterim && Array.isArray(data.pendingGlossStream)) {
        pendingGlossRef.current = data.pendingGlossStream;
        setInterimGlossStream(data.pendingGlossStream);
        setClarifyMsg(null);
        return;
      }

      if (data.needsClarification) {
        pendingGlossRef.current = [];
        setInterimGlossStream([]);
        setClarifyMsg(
          data.clarificationPrompt || "Sign unclear — please keep both hands & face in frame."
        );
        return;
      }

      if (data.recognized && data.sentence) {
        pendingGlossRef.current = [];
        setInterimGlossStream([]);
        setClarifyMsg(null);
        setLiveGloss(data.gloss || "");
        setLiveSentence(data.sentence);
        setLiveNonManual(data.nonManual || "neutral");
        recentContextRef.current = [...recentContextRef.current.slice(-3), String(data.sentence)];
        unlockAudioPlayback();
        void playWavOrSpeech(data.sentence, {
          audioWavBase64: data.audioWavBase64,
          fetchIfMissing: true,
          voiceName: profile.voiceSettings.voiceName,
          pitch: profile.voiceSettings.pitch,
          speed: profile.voiceSettings.speed,
        });
      }
    } catch {
      // ignore transient errors
    } finally {
      setIsInferring(false);
    }
  };

  const startTrackingLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let tick = 0;
    let peakMotion = 0;
    let quietFrames = 0;

    const loop = () => {
      if (!isCamOnRef.current) return;
      tick++;

      const w = canvas.parentElement?.clientWidth || 520;
      const h = canvas.parentElement?.clientHeight || 360;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      if (trackerRef.current && video.readyState >= 2) {
        const detection = trackerRef.current.detectFrame(video);
        drawRealHandSkeleton(ctx, canvas.width, canvas.height, detection, true);

        if (isCapturingRef.current && detection.hasActiveHands && tick % 3 === 0) {
          recordedPosesRef.current.push(detection.poseFrame);
          setCapturedFramesCount(recordedPosesRef.current.length);
        }

        if (!isCapturingRef.current && detection.hasActiveHands && tick % 3 === 0) {
          poseBufferRef.current.push(detection.poseFrame);
          if (poseBufferRef.current.length > 24) poseBufferRef.current.shift();
          handSummaryRef.current = detection.handSummary;
          if (detection.motionEnergy > peakMotion) peakMotion = detection.motionEnergy;

          if (frameSnapsRef.current.length < 12) {
            const snap = trackerRef.current.captureCompactFrame(video, true);
            if (snap) frameSnapsRef.current.push(snap);
          }

          if (detection.motionEnergy < 1.8) {
            quietFrames += 1;
          } else {
            quietFrames = 0;
          }

          const hasSignal =
            detection.engine === "mediapipe-hand-landmarker" || peakMotion > 2.2;
          const phraseDone = poseBufferRef.current.length >= 6 && quietFrames >= 3;
          const chunkFull = poseBufferRef.current.length >= 14;
          const now = Date.now();

          if (hasSignal && (phraseDone || chunkFull) && now - lastInferTsRef.current > 1800) {
            lastInferTsRef.current = now;
            const poses = [...poseBufferRef.current];
            const snaps = [...frameSnapsRef.current];
            const summary = handSummaryRef.current;
            if (!phraseDone) {
              poseBufferRef.current = poseBufferRef.current.slice(-3);
              frameSnapsRef.current = frameSnapsRef.current.slice(-2);
            } else {
              poseBufferRef.current = [];
              frameSnapsRef.current = [];
            }
            peakMotion = 0;
            quietFrames = 0;
            void runContinuousInference(poses, snaps, summary, phraseDone);
          }
        } else if (
          !isCapturingRef.current &&
          !detection.hasActiveHands &&
          poseBufferRef.current.length >= 5 &&
          (handSummaryRef.current.includes("hands=") || peakMotion > 2.2) &&
          Date.now() - lastInferTsRef.current > 1800
        ) {
          lastInferTsRef.current = Date.now();
          const poses = [...poseBufferRef.current];
          const snaps = [...frameSnapsRef.current];
          const summary = handSummaryRef.current;
          poseBufferRef.current = [];
          frameSnapsRef.current = [];
          peakMotion = 0;
          quietFrames = 0;
          void runContinuousInference(poses, snaps, summary, true);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    loop();
  };

  const handleToggleSampleCapture = () => {
    if (!isCamOn) {
      setIsCamOn(true);
    }
    if (!isCapturingSample) {
      recordedPosesRef.current = [];
      setCapturedFramesCount(0);
      isCapturingRef.current = true;
      setIsCapturingSample(true);
      setStatusMessage("Perform the ISL gesture clearly in front of the camera, then stop capture.");
    } else {
      isCapturingRef.current = false;
      setIsCapturingSample(false);
      setStatusMessage(
        `Captured ${recordedPosesRef.current.length} landmark frames. Review details and save to the ISL Lexicon.`
      );
    }
  };

  const handleSaveContribution = async (e: React.FormEvent, markVerified = false) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    if (!recordGloss.trim() || !recordEnglish.trim()) {
      setErrorMessage("Please provide both an ISL Gloss and English meaning.");
      return;
    }

    try {
      const res = await fetch("/api/isl/lexicon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gloss: recordGloss.trim().toUpperCase(),
          english: recordEnglish.trim(),
          category: recordCategory,
          handedness: recordHandedness,
          signType: recordedPosesRef.current.length >= 4 ? "dynamic" : "static",
          spatialAnchor: recordAnchor,
          nonManual: { eyebrows: recordEyebrows, mouth: "neutral", headTilt: "none" },
          islNotes: recordNotes.trim() || undefined,
          keyframes: recordedPosesRef.current.slice(0, 16),
          verified: markVerified,
          verifiedBy: profile.name || "ISL Signer",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save sign");

      setStatusMessage(
        `${data.entry.gloss} saved (${data.entry.verificationStatus.replace("_", " ")} • ${data.entry.sampleCount} samples).`
      );
      recordedPosesRef.current = [];
      setCapturedFramesCount(0);
      setRecordGloss("");
      setRecordEnglish("");
      setRecordNotes("");
      await fetchLexicon();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleVerifySign = async (id: string) => {
    try {
      const res = await fetch(`/api/isl/lexicon/${encodeURIComponent(id)}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifiedBy: profile.name || "ISL Reviewer" }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => prev.map((it) => (it.id === id ? data.entry : it)));
        if (data.stats) setStats(data.stats);
      }
    } catch {
      // ignore
    }
  };

  const categories = [
    "All",
    ...(stats?.categoryBreakdown.map((c) => c.category) || [
      "Greetings",
      "Questions",
      "Health & Emergency",
      "Daily & Food",
      "Family",
      "Travel & Places",
    ]),
  ];

  return (
    <div id="isl-dataset-studio" className="space-y-6">
      {/* Header + 1,000 Verified ISL Progress Bar */}
      <div className={`p-6 ${theme.styles.glassDark} rounded-3xl border border-[var(--border-subtle)] space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#22F3A6] uppercase flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Vakhya ISL Dataset & Continuous Recognition Roadmap
            </span>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
              1,000 Verified ISL Signs & Continuous Stream Lab
            </h3>
            <p className="text-xs text-[var(--text-secondary)]/70 mt-1">
              Expand verified Indian Sign Language entries with live landmark samples and test co-articulated continuous sentence streaming.
            </p>
          </div>
          {stats && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-[#22F3A6]/10 border border-[#22F3A6]/30 text-right">
                <div className="text-lg font-black text-[#22F3A6]">
                  {stats.verifiedCount} / {stats.targetGoal}
                </div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)]/70">
                  VERIFIED ISL SIGNS ({stats.completionPct}%)
                </div>
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl bg-[var(--button-glass-bg)] border border-[var(--border-subtle)] text-right">
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {stats.reviewCount + stats.needsSamplesCount}
                </div>
                <div className="text-[10px] font-mono text-amber-400">IN REVIEW</div>
              </div>
            </div>
          )}
        </div>

        {stats && (
          <div className="space-y-1.5">
            <div className="w-full h-2.5 rounded-full bg-black/30 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-[#8A5CF6] via-[#D96FF2] to-[#22F3A6] transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(3, stats.completionPct))}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {stats.categoryBreakdown.slice(0, 8).map((cat) => (
                <span
                  key={cat.category}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[var(--text-secondary)]"
                >
                  {cat.category}: {cat.verified}/{cat.total}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Split: Continuous Signing Testbench + Contribute / Record Sample */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Continuous ISL Camera & Co-articulation Stream */}
        <div className={`lg:col-span-7 p-5 ${theme.styles.glassDark} rounded-3xl border border-[var(--border-subtle)] space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D96FF2]" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Continuous ISL Signing Testbench
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setContinuousMode((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                  continuousMode
                    ? "bg-[#9E7BFF]/20 border-[#9E7BFF]/50 text-[#E2D6FF]"
                    : "bg-white/5 border-white/10 text-[var(--text-secondary)]"
                }`}
              >
                {continuousMode ? "Continuous Stream: ON" : "Isolated Mode"}
              </button>
              <button
                type="button"
                onClick={() => setIsCamOn((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  isCamOn
                    ? "bg-red-500/20 border border-red-500/40 text-red-200"
                    : "bg-gradient-to-r from-[#8A5CF6] to-[#D96FF2] text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                {isCamOn ? "Stop Camera" : "Start ISL Camera"}
              </button>
            </div>
          </div>

          <div className="relative h-64 rounded-2xl overflow-hidden bg-[#0E131F] border border-white/10 flex items-center justify-center">
            {isCamOn ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              </>
            ) : (
              <div className="text-center space-y-2 p-6">
                <Hand className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-400">
                  Start the camera to test continuous multi-word ISL sentences or record kinematic samples.
                </p>
              </div>
            )}
            {isInferring && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 text-[#22F3A6] text-[11px] font-mono">
                Analyzing continuous window…
              </div>
            )}
          </div>

          {/* Live Continuous Gloss Stream + Final Output */}
          <div className="space-y-2">
            {interimGlossStream.length > 0 && (
              <div className="p-3 rounded-xl bg-[#9E7BFF]/15 border border-[#9E7BFF]/30 text-xs text-[#E2D6FF] font-mono">
                <span className="text-[#C0AAFF] font-bold">LIVE CLAUSE BUFFER: </span>
                {interimGlossStream.join(" → ")} …
              </div>
            )}
            {clarifyMsg && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                <strong>Clarification:</strong> {clarifyMsg}
              </div>
            )}
            {liveSentence && (
              <div className="p-3.5 rounded-xl bg-[#22F3A6]/10 border border-[#22F3A6]/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-[#22F3A6] uppercase">
                    {liveGloss || "ISL TRANSLATED"} {liveNonManual ? `• ${liveNonManual}` : ""}
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">"{liveSentence}"</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void playWavOrSpeech(liveSentence, {
                      voiceName: profile.voiceSettings.voiceName,
                      pitch: profile.voiceSettings.pitch,
                      speed: profile.voiceSettings.speed,
                    })
                  }
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#22F3A6] cursor-pointer shrink-0"
                  title="Replay voice"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Contribute & Verify New ISL Sign */}
        <form
          onSubmit={(e) => void handleSaveContribution(e, true)}
          className={`lg:col-span-5 p-5 ${theme.styles.glassLight} rounded-3xl border border-[var(--border-subtle)] space-y-3`}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#22F3A6]" />
              Contribute / Record ISL Sign
            </h4>
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
              {capturedFramesCount} frames captured
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder="GLOSS (e.g. NAMASTE)"
              value={recordGloss}
              onChange={(e) => setRecordGloss(e.target.value.toUpperCase())}
              className={`h-10 px-3 rounded-xl text-xs font-mono uppercase ${theme.styles.glassInput}`}
            />
            <input
              type="text"
              placeholder="English (e.g. Greetings)"
              value={recordEnglish}
              onChange={(e) => setRecordEnglish(e.target.value)}
              className={`h-10 px-3 rounded-xl text-xs ${theme.styles.glassInput}`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              value={recordCategory}
              onChange={(e) => setRecordCategory(e.target.value)}
              className={`h-9 px-2 rounded-xl text-xs ${theme.styles.glassInput}`}
            >
              {[
                "Greetings",
                "Questions",
                "Health & Emergency",
                "Daily & Food",
                "Family",
                "Travel & Places",
                "Banking & Shopping",
                "Civic & India",
                "Actions & Verbs",
                "Emotions",
                "Community & Custom",
              ].map((c) => (
                <option key={c} value={c} className="bg-[#151B29] text-white">
                  {c}
                </option>
              ))}
            </select>
            <select
              value={recordHandedness}
              onChange={(e) => setRecordHandedness(e.target.value as "one_hand" | "two_hand")}
              className={`h-9 px-2 rounded-xl text-xs ${theme.styles.glassInput}`}
            >
              <option value="two_hand" className="bg-[#151B29] text-white">Two-Hand</option>
              <option value="one_hand" className="bg-[#151B29] text-white">One-Hand</option>
            </select>
            <select
              value={recordAnchor}
              onChange={(e) => setRecordAnchor(e.target.value)}
              className={`h-9 px-2 rounded-xl text-xs ${theme.styles.glassInput}`}
            >
              {["chest", "face", "head", "chin", "neutral", "upper_body"].map((a) => (
                <option key={a} value={a} className="bg-[#151B29] text-white">
                  Anchor: {a}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={recordEyebrows}
              onChange={(e) => setRecordEyebrows(e.target.value)}
              className={`h-9 px-2 rounded-xl text-xs ${theme.styles.glassInput}`}
            >
              <option value="neutral" className="bg-[#151B29] text-white">Brows: Neutral</option>
              <option value="up" className="bg-[#151B29] text-white">Brows: Raised (Y/N Q)</option>
              <option value="down" className="bg-[#151B29] text-white">Brows: Furrowed (WH-Q)</option>
            </select>
            <button
              type="button"
              onClick={handleToggleSampleCapture}
              className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                isCapturingSample
                  ? "bg-amber-500 text-slate-950 animate-pulse"
                  : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              {isCapturingSample ? "Stop Recording Sample" : "Record Camera Sample"}
            </button>
          </div>

          <textarea
            rows={2}
            placeholder="Articulation notes (handshape, movement, facial cue)…"
            value={recordNotes}
            onChange={(e) => setRecordNotes(e.target.value)}
            className={`w-full p-2.5 rounded-xl text-xs ${theme.styles.glassInput}`}
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#8A5CF6] to-[#22F3A6] text-slate-950 font-bold text-xs cursor-pointer hover:opacity-95"
            >
              Save & Verify Sign
            </button>
            <button
              type="button"
              onClick={(e) => void handleSaveContribution(e, false)}
              className="px-3 h-10 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
            >
              Save Draft
            </button>
          </div>
        </form>
      </div>

      {/* Searchable Verified ISL Lexicon Grid */}
      <div className={`p-5 ${theme.styles.glassDark} rounded-3xl border border-[var(--border-subtle)] space-y-4`}>
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search ISL signs, English phrases, or notes (e.g. Namaste, Aadhaar, Water, Fever)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full h-10 pl-9 pr-4 rounded-xl text-xs ${theme.styles.glassInput}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`h-10 px-3 rounded-xl text-xs ${theme.styles.glassInput}`}
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-[#151B29] text-white">
                  {c}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`h-10 px-3 rounded-xl text-xs ${theme.styles.glassInput}`}
            >
              <option value="all" className="bg-[#151B29] text-white">All Statuses</option>
              <option value="verified" className="bg-[#151B29] text-white">Verified Only</option>
              <option value="community_review" className="bg-[#151B29] text-white">Community Review</option>
              <option value="needs_samples" className="bg-[#151B29] text-white">Needs Samples</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-xs text-slate-400">Loading ISL lexicon…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-[#8A5CF6]/40 transition-colors flex flex-col justify-between gap-2.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#D96FF2] truncate">
                      {item.gloss}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md border shrink-0 ${
                        item.verificationStatus === "verified"
                          ? "bg-[#22F3A6]/15 border-[#22F3A6]/35 text-[#22F3A6]"
                          : item.verificationStatus === "community_review"
                            ? "bg-amber-500/15 border-amber-500/35 text-amber-300"
                            : "bg-slate-500/15 border-slate-500/35 text-slate-300"
                      }`}
                    >
                      {item.verificationStatus === "verified" ? "VERIFIED" : item.verificationStatus === "community_review" ? "REVIEW" : "NEEDS SAMPLES"}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white">{item.english}</div>
                  <p className="text-[11px] text-slate-300/80 leading-snug line-clamp-2">
                    {item.islNotes}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-slate-400">
                  <span className="font-mono">
                    {item.handedness === "two_hand" ? "2-Hand" : "1-Hand"} • {item.spatialAnchor} • {item.sampleCount} samples
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRecordGloss(item.gloss);
                        setRecordEnglish(item.english);
                        setRecordCategory(item.category);
                        setRecordHandedness(item.handedness);
                        setRecordAnchor(item.spatialAnchor);
                        setRecordNotes(item.islNotes);
                      }}
                      className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                    >
                      Add Sample
                    </button>
                    {item.verificationStatus !== "verified" && (
                      <button
                        type="button"
                        onClick={() => void handleVerifySign(item.id)}
                        className="px-2 py-1 rounded-md bg-[#22F3A6]/20 hover:bg-[#22F3A6]/30 text-[#22F3A6] font-semibold cursor-pointer"
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

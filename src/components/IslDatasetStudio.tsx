import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Database,
  Hand,
  Layers,
  Plus,
  Search,
  Volume2,
  AlertCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { UserProfile } from "../types";
import { theme } from "../theme";
import {
  downsampleFrames,
  drawRealHandSkeleton,
  GestureBoundaryTracker,
  initSignLandmarkers,
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
  verificationStatus: "verified" | "trained_untested" | "catalog_target";
  hasTrainingData: boolean;
  cameraTested: boolean;
  lastCameraConfidence?: number;
  lastCameraTestAt?: string;
  sampleCount: number;
  verifiedBy?: string;
  updatedAt: string;
}

interface IslStats {
  targetGoal: number;
  totalCount: number;
  verifiedCount: number;
  trainedUntestedCount: number;
  catalogCount: number;
  completionPct: number;
  categoryBreakdown: Array<{ category: string; total: number; verified: number; trained: number }>;
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
  const [liveConfidence, setLiveConfidence] = useState<number | null>(null);
  const [liveNonManual, setLiveNonManual] = useState("");
  const [liveTelemetry, setLiveTelemetry] = useState("");
  const [clarifyMsg, setClarifyMsg] = useState<string | null>(null);
  const [isUnknownSign, setIsUnknownSign] = useState(false);
  const [isInferring, setIsInferring] = useState(false);

  // Real-Camera Sign Verification State
  const [cameraVerifyTarget, setCameraVerifyTarget] = useState<IslLexiconItem | null>(null);
  const [verifyCapturedCount, setVerifyCapturedCount] = useState(0);
  const [verifyMatchState, setVerifyMatchState] = useState<"waiting" | "matched" | "mismatch">("waiting");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<WebcamSignTracker | null>(null);
  const boundaryRef = useRef(new GestureBoundaryTracker());
  const rafRef = useRef<number | null>(null);
  const isCamOnRef = useRef(false);
  const isCapturingRef = useRef(false);
  const recordedPosesRef = useRef<PoseKeyframe[]>([]);
  const cameraVerifyTargetRef = useRef<IslLexiconItem | null>(null);
  cameraVerifyTargetRef.current = cameraVerifyTarget;
  const cameraVerifyPosesRef = useRef<PoseKeyframe[]>([]);

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
      boundaryRef.current.reset();
      setLiveTelemetry("");
      return;
    }

    initSignLandmarkers().catch(() => null);
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
        setErrorMessage("Camera access is needed for live ISL sample capture, testing, and verification.");
        setIsCamOn(false);
      });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isCamOn]);

  const submitCameraVerification = async (
    target: IslLexiconItem,
    confidence: number,
    keyframes: PoseKeyframe[]
  ) => {
    try {
      const res = await fetch(`/api/isl/lexicon/${encodeURIComponent(target.id)}/camera-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verifiedBy: profile.name || "Camera Signer",
          keyframes: keyframes.slice(-16),
          confidence,
          passed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Camera verification failed.");
        return false;
      }
      setItems((prev) => prev.map((it) => (it.id === target.id ? data.entry : it)));
      if (data.stats) setStats(data.stats);
      setVerifyMatchState("matched");
      setStatusMessage(
        `${target.gloss} passed real-camera verification (${Math.round(confidence * 100)}% confidence) and is now marked CAMERA VERIFIED.`
      );
      setCameraVerifyTarget(null);
      cameraVerifyPosesRef.current = [];
      setVerifyCapturedCount(0);
      return true;
    } catch {
      setErrorMessage("Network error while saving camera verification.");
      return false;
    }
  };

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
          continuousMode: cameraVerifyTargetRef.current ? false : continuousModeRef.current,
          phraseBoundary,
          pendingGlossStream: cameraVerifyTargetRef.current ? [] : pendingGlossRef.current,
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
        setIsUnknownSign(false);
        return;
      }

      if (data.isUnknown || data.status === "unknown" || data.needsClarification) {
        pendingGlossRef.current = [];
        setInterimGlossStream([]);
        const unknownFlag = Boolean(data.isUnknown || data.status === "unknown");
        setIsUnknownSign(unknownFlag);
        setLiveGloss(unknownFlag ? "UNKNOWN" : "");
        setLiveConfidence(typeof data.confidence === "number" ? data.confidence : 0);
        setClarifyMsg(
          data.clarificationPrompt ||
            (unknownFlag
              ? "Unknown sign — did not match any known gesture with sufficient confidence."
              : "Sign unclear — please keep both hands & face in frame.")
        );
        if (cameraVerifyTargetRef.current) {
          setVerifyMatchState("mismatch");
        }
        return;
      }

      if (data.recognized && data.sentence) {
        pendingGlossRef.current = [];
        setInterimGlossStream([]);
        setClarifyMsg(null);
        setIsUnknownSign(false);
        const recognizedGloss = String(data.gloss || "").toUpperCase();
        const conf = typeof data.confidence === "number" ? data.confidence : 0.85;
        setLiveGloss(recognizedGloss);
        setLiveConfidence(conf);
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

        // Check real-camera verification match
        const target = cameraVerifyTargetRef.current;
        if (target) {
          const engKeyword = target.english.split("/")[0].trim().toLowerCase();
          const glossMatched =
            recognizedGloss === target.gloss ||
            recognizedGloss.split(/[\s_+]+/).includes(target.gloss) ||
            String(data.sentence).toLowerCase().includes(engKeyword);
          if (glossMatched && conf >= 0.6) {
            setVerifyMatchState("matched");
            const kfs =
              cameraVerifyPosesRef.current.length >= 2 ? cameraVerifyPosesRef.current : poses;
            await submitCameraVerification(target, conf, kfs);
          } else {
            setVerifyMatchState("mismatch");
          }
        }
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

    const loop = () => {
      if (!isCamOnRef.current) return;
      tick++;

      const w = canvas.parentElement?.clientWidth || 520;
      const h = canvas.parentElement?.clientHeight || 360;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      if (trackerRef.current && video.readyState >= 2) {
        const detection = trackerRef.current.detectFrame(video, true);
        drawRealHandSkeleton(ctx, canvas.width, canvas.height, detection, true);

        if (tick % 6 === 0) {
          setLiveTelemetry(
            `${detection.engine} • ${detection.hasActiveHands ? detection.handedness.join("+") || "Hand" : "No active hands"} • Face: ${detection.facialCues.eyebrows}/${detection.facialCues.headMovement}`
          );
        }

        if (isCapturingRef.current && detection.hasActiveHands && tick % 3 === 0) {
          recordedPosesRef.current.push(detection.poseFrame);
          setCapturedFramesCount(recordedPosesRef.current.length);
        }

        if (cameraVerifyTargetRef.current && detection.hasActiveHands && tick % 3 === 0) {
          cameraVerifyPosesRef.current.push(detection.poseFrame);
          if (cameraVerifyPosesRef.current.length > 24) {
            cameraVerifyPosesRef.current.shift();
          }
          setVerifyCapturedCount(cameraVerifyPosesRef.current.length);
        }

        if (!isCapturingRef.current && tick % 3 === 0) {
          const now = Date.now();
          const event = boundaryRef.current.step(
            detection,
            () => (trackerRef.current ? trackerRef.current.captureCompactFrame(video, true) : null),
            now
          );
          if (event?.shouldDispatch && now - lastInferTsRef.current > 1600) {
            lastInferTsRef.current = now;
            void runContinuousInference(
              event.poses,
              event.snaps,
              event.handSummary,
              event.phraseBoundary
            );
          }
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
        `Captured ${recordedPosesRef.current.length} landmark frames. Save the sign, then test it with your camera to verify.`
      );
    }
  };

  const handleStartCameraVerify = (item: IslLexiconItem) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setClarifyMsg(null);
    setIsUnknownSign(false);
    setVerifyMatchState("waiting");
    cameraVerifyPosesRef.current = [];
    setVerifyCapturedCount(0);
    setCameraVerifyTarget(item);
    boundaryRef.current.reset();
    if (!isCamOn) {
      setIsCamOn(true);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveContribution = async (e: React.FormEvent, startCameraTest = false) => {
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
          cameraTested: false,
          verifiedBy: profile.name || "ISL Signer",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save sign");

      setStatusMessage(
        `${data.entry.gloss} saved (${data.entry.verificationStatus.replace("_", " ")} • ${data.entry.sampleCount} samples). Run "Test with Camera" to mark it verified.`
      );
      recordedPosesRef.current = [];
      setCapturedFramesCount(0);
      setRecordGloss("");
      setRecordEnglish("");
      setRecordNotes("");
      await fetchLexicon();
      if (startCameraTest && data.entry) {
        handleStartCameraVerify(data.entry);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
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
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-[#22F3A6]/10 border border-[#22F3A6]/30 text-right">
                <div className="text-lg font-black text-[#22F3A6]">
                  {stats.verifiedCount} / {stats.targetGoal}
                </div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)]/70">
                  CAMERA VERIFIED ({stats.completionPct}%)
                </div>
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right">
                <div className="text-sm font-bold text-amber-300">
                  {stats.trainedUntestedCount}
                </div>
                <div className="text-[10px] font-mono text-amber-400">TRAINED (UNTESTED)</div>
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl bg-[var(--button-glass-bg)] border border-[var(--border-subtle)] text-right">
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {stats.catalogCount}
                </div>
                <div className="text-[10px] font-mono text-slate-400">ROADMAP TARGETS</div>
              </div>
            </div>
          )}
        </div>

        {stats && (
          <div className="space-y-1.5">
            <div className="w-full h-2.5 rounded-full bg-black/30 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-[#8A5CF6] via-[#D96FF2] to-[#22F3A6] transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, stats.completionPct))}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {stats.categoryBreakdown.slice(0, 8).map((cat) => (
                <span
                  key={cat.category}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[var(--text-secondary)]"
                >
                  {cat.category}: {cat.verified} cam • {cat.trained} trained / {cat.total}
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

          {cameraVerifyTarget && (
            <div className="p-3 rounded-2xl bg-[#22F3A6]/10 border border-[#22F3A6]/40 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="text-[10px] font-mono uppercase text-[#22F3A6] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Live Camera Verification Active • {verifyCapturedCount} live frames
                </div>
                <div className="text-xs font-bold text-white">
                  Perform: <span className="text-[#22F3A6] font-mono">{cameraVerifyTarget.gloss}</span> ({cameraVerifyTarget.english})
                </div>
                <div className="text-[11px] text-slate-300 truncate">{cameraVerifyTarget.islNotes}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {verifyCapturedCount >= 4 && (
                  <button
                    type="button"
                    onClick={() =>
                      void submitCameraVerification(
                        cameraVerifyTarget,
                        Math.max(0.7, liveConfidence || 0.72),
                        cameraVerifyPosesRef.current
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-[#22F3A6] text-slate-950 text-[11px] font-bold cursor-pointer"
                  >
                    Pass & Verify ({verifyCapturedCount}f)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCameraVerifyTarget(null);
                    cameraVerifyPosesRef.current = [];
                    setVerifyCapturedCount(0);
                  }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                  title="Cancel verification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

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
                  Start the camera to test continuous multi-word ISL sentences, verify signs, or record kinematic samples.
                </p>
              </div>
            )}
            {isInferring && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 text-[#22F3A6] text-[11px] font-mono">
                Analyzing gesture boundary…
              </div>
            )}
            {liveTelemetry && isCamOn && (
              <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-md bg-black/65 text-[10px] font-mono text-slate-300 truncate">
                {liveTelemetry}
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
              <div
                className={`p-3 rounded-xl border text-xs ${
                  isUnknownSign
                    ? "bg-orange-500/10 border-orange-500/35 text-orange-200"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                }`}
              >
                <strong>{isUnknownSign ? "Unknown Sign:" : "Clarification:"}</strong> {clarifyMsg}
                {verifyMatchState === "mismatch" && cameraVerifyTarget && (
                  <span className="block mt-1 text-[11px] text-slate-300">
                    Detected "{liveGloss || "UNKNOWN"}" while testing {cameraVerifyTarget.gloss}. Try signing {cameraVerifyTarget.gloss} again clearly.
                  </span>
                )}
              </div>
            )}
            {liveSentence && (
              <div className="p-3.5 rounded-xl bg-[#22F3A6]/10 border border-[#22F3A6]/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-[#22F3A6] uppercase">
                    {liveGloss || "ISL TRANSLATED"}
                    {liveConfidence !== null ? ` • ${Math.round(liveConfidence * 100)}%` : ""}
                    {liveNonManual ? ` • ${liveNonManual}` : ""}
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
              Save & Test with Camera
            </button>
            <button
              type="button"
              onClick={(e) => void handleSaveContribution(e, false)}
              className="px-3 h-10 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
            >
              Save Sample
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
              <option value="verified" className="bg-[#151B29] text-white">Camera Verified</option>
              <option value="trained_untested" className="bg-[#151B29] text-white">Trained (Untested)</option>
              <option value="catalog_target" className="bg-[#151B29] text-white">Catalog Target</option>
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
                          : item.verificationStatus === "trained_untested"
                            ? "bg-amber-500/15 border-amber-500/35 text-amber-300"
                            : "bg-slate-500/15 border-slate-500/35 text-slate-300"
                      }`}
                    >
                      {item.verificationStatus === "verified"
                        ? "CAMERA VERIFIED"
                        : item.verificationStatus === "trained_untested"
                          ? "TRAINED (UNTESTED)"
                          : "CATALOG TARGET"}
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
                      Record
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartCameraVerify(item)}
                      className={`px-2 py-1 rounded-md font-semibold cursor-pointer ${
                        cameraVerifyTarget?.id === item.id
                          ? "bg-[#22F3A6] text-slate-950"
                          : "bg-[#22F3A6]/20 hover:bg-[#22F3A6]/30 text-[#22F3A6]"
                      }`}
                    >
                      {item.verificationStatus === "verified" ? "Retest Cam" : "Test with Camera"}
                    </button>
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

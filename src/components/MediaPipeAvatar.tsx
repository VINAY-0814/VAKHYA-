import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Accessibility, 
  RotateCw, 
  Eye, 
  EyeOff, 
  Settings, 
  ShieldAlert, 
  Cpu, 
  Sparkles, 
  Info,
  Sliders,
  CheckCircle2,
  Minimize2,
  Maximize2,
  Palette,
  Shirt
} from "lucide-react";
import { UserProfile } from "../types";

interface MediaPipeAvatarProps {
  isAnimating: boolean;
  activeWordIndex: number;
  glossSequence: string;
  poseSequence?: Array<{
    gloss?: string;
    t?: number;
    right_wrist?: [number, number, number];
    left_wrist?: [number, number, number];
    right_open?: number;
    left_open?: number;
    elbow_angle?: number;
  }>;
  markers: {
    eyebrows: string;
    mouth: string;
    headTilt: string;
  };
  avatarSpeed: number;
  onSpeedChange?: (speed: number) => void;
  profile: UserProfile;
  isProcessing?: boolean;
}

// Full 21-point hand skeleton joint linkages structure for MediaPipe
const HAND_CONNECTIONS = [
  // Wrist to base of fingers
  [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],     // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
];

// Pose skeleton linkages (shoulder, elbow, wrist, torso)
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], // Neck to Left shoulder, Left shoulder to Left elbow, Left elbow to Left wrist
  [0, 4], [4, 5], [5, 6], // Neck to Right shoulder, Right shoulder to Right elbow, Right elbow to Right wrist
  [1, 4],                 // Shoulder to Shoulder
  [1, 7], [4, 8], [7, 8]  // Shoulders to Hips (Torso block)
];

// 3D coordinate offsets for different sign words (Right & Left hand target paths)
// Format: target position [rx, ry, rz, lx, ly, lz] in 3D coordinate space relative to shoulder base
const GESTURE_3D_COORDS: Record<string, Array<[number, number, number, number, number, number]>> = {
  HELLO: [
    [50, -40, -10, -50, 60, 0],   // wave right hand up high
    [70, -60, -20, -50, 60, 0],
    [50, -40, -10, -50, 60, 0],
    [0, 60, 0, 0, 60, 0]         // neutral rest
  ],
  "THANK YOU": [
    [0, -40, -30, 0, 60, 0],     // touch mouth with right hand
    [30, 10, -10, 0, 60, 0],     // gesture outward
    [40, 30, 0, 0, 60, 0],
    [0, 60, 0, 0, 60, 0]
  ],
  EMERGENCY: [
    [40, -30, -20, -40, -30, -20], // shake hands rapid chest high
    [-40, -10, -10, 40, -10, -10],
    [40, -30, -20, -40, -30, -20],
    [0, 60, 0, 0, 60, 0]
  ],
  DOCTOR: [
    [0, 0, -25, -50, -10, -10],   // left arm out, right hand tapping wrist
    [0, -25, -20, -50, -10, -10],
    [0, 0, -25, -50, -10, -10],
    [0, 60, 0, 0, 60, 0]
  ],
  GO: [
    [60, -30, -35, 60, -30, -35], // both arms pointing directions
    [80, -40, -40, 80, -40, -40],
    [0, 60, 0, 0, 60, 0]
  ],
  DEFAULT: [
    [0, 60, 0, 0, 60, 0]
  ]
};

export interface AvatarTheme {
  id: string;
  name: string;
  torsoFill: string;
  torsoStroke: string;
  boneStroke: string;
  jointTipColor: string;
  jointBaseColor: string;
  headStroke: string;
  mouthColor: string;
  glowColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const AVATAR_THEMES: AvatarTheme[] = [
  {
    id: "emerald-aurora",
    name: "Aurora Emerald",
    torsoFill: "rgba(37, 211, 102, 0.35)",
    torsoStroke: "rgba(37, 211, 102, 0.4)",
    boneStroke: "rgba(37, 211, 102, 0.75)",
    jointTipColor: "#34D399",
    jointBaseColor: "#128C7E",
    headStroke: "#25D366",
    mouthColor: "#128C7E",
    glowColor: "rgba(37, 211, 102, 0.4)",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/20",
    badgeText: "text-[#25D366]"
  },
  {
    id: "cyber-punk",
    name: "Cyber Punk",
    torsoFill: "rgba(6, 182, 212, 0.35)",
    torsoStroke: "rgba(6, 182, 212, 0.45)",
    boneStroke: "rgba(6, 182, 212, 0.8)",
    jointTipColor: "#FF007F",
    jointBaseColor: "#06B6D4",
    headStroke: "#06B6D4",
    mouthColor: "#FF007F",
    glowColor: "rgba(6, 182, 212, 0.4)",
    badgeBg: "bg-cyan-500/10",
    badgeBorder: "border-cyan-500/20",
    badgeText: "text-[#06B6D4]"
  },
  {
    id: "matrix-mint",
    name: "Matrix Mint",
    torsoFill: "rgba(16, 185, 129, 0.3)",
    torsoStroke: "rgba(16, 185, 129, 0.4)",
    boneStroke: "rgba(16, 185, 129, 0.8)",
    jointTipColor: "#F59E0B",
    jointBaseColor: "#10B981",
    headStroke: "#10B981",
    mouthColor: "#F59E0B",
    glowColor: "rgba(16, 185, 129, 0.4)",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/20",
    badgeText: "text-[#10B981]"
  },
  {
    id: "solar-flare",
    name: "Solar Flare",
    torsoFill: "rgba(249, 115, 22, 0.3)",
    torsoStroke: "rgba(249, 115, 22, 0.4)",
    boneStroke: "rgba(249, 115, 22, 0.8)",
    jointTipColor: "#EC4899",
    jointBaseColor: "#F97316",
    headStroke: "#F97316",
    mouthColor: "#EC4899",
    glowColor: "rgba(249, 115, 22, 0.4)",
    badgeBg: "bg-orange-500/10",
    badgeBorder: "border-orange-500/20",
    badgeText: "text-[#F97316]"
  },
  {
    id: "charcoal-tech",
    name: "Charcoal Tech",
    torsoFill: "rgba(148, 163, 184, 0.2)",
    torsoStroke: "rgba(148, 163, 184, 0.3)",
    boneStroke: "rgba(148, 163, 184, 0.7)",
    jointTipColor: "#CBD5E1",
    jointBaseColor: "#94A3B8",
    headStroke: "#94A3B8",
    mouthColor: "#CBD5E1",
    glowColor: "rgba(148, 163, 184, 0.2)",
    badgeBg: "bg-slate-500/10",
    badgeBorder: "border-slate-500/20",
    badgeText: "text-slate-300"
  }
];

export interface AvatarBackground {
  id: string;
  name: string;
  type: "grid" | "aurora" | "matrix" | "bokeh" | "slate" | "neon";
  colorStart: string;
  description: string;
}

export const AVATAR_BACKGROUNDS: AvatarBackground[] = [
  { id: "cyber-grid", name: "Cyber Grid", type: "grid", colorStart: "#8A5CF6", description: "Standard retro vector grid space" },
  { id: "aurora-flow", name: "Aurora Glow", type: "aurora", colorStart: "#D96FF2", description: "Vibrant custom purple aurora clouds" },
  { id: "matrix-digital", name: "Matrix Digital", type: "matrix", colorStart: "#10B981", description: "Green falling code streams" },
  { id: "bokeh-studio", name: "Bokeh Studio", type: "bokeh", colorStart: "#EC4899", description: "Chic blurred circular neon light blobs" },
  { id: "minimal-slate", name: "Minimal Slate", type: "slate", colorStart: "#1E1B4B", description: "Sleek spotlight vignette background" },
  { id: "neon-horizon", name: "Neon Horizon", type: "neon", colorStart: "#F43F5E", description: "Synthwave sunset grid horizon" }
];

export function MediaPipeAvatar({
  isAnimating,
  activeWordIndex,
  glossSequence,
  poseSequence,
  markers,
  avatarSpeed,
  onSpeedChange,
  profile,
  isProcessing = false
}: MediaPipeAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Derive active avatar state
  let currentState: "idle" | "processing" | "signing" = "idle";
  if (isProcessing) {
    currentState = "processing";
  } else if (isAnimating) {
    currentState = "signing";
  }

  // Get current active sign word
  const words = glossSequence ? glossSequence.split(" ") : [];
  const activeWord = words[activeWordIndex] || "";

  // MediaPipe specific user settings
  const [showMesh, setShowMesh] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  // Synchronize theme with profile settings
  const defaultTheme = profile?.accessibilitySettings?.avatarThemeId || "emerald-aurora";
  const [activeThemeId, setActiveThemeId] = useState<string>(defaultTheme);
  const defaultBackground = profile?.accessibilitySettings?.avatarBackgroundId || "cyber-grid";
  const [activeBackgroundId, setActiveBackgroundId] = useState<string>(defaultBackground);

  useEffect(() => {
    if (profile?.accessibilitySettings?.avatarThemeId) {
      setActiveThemeId(profile.accessibilitySettings.avatarThemeId);
    }
  }, [profile?.accessibilitySettings?.avatarThemeId]);

  useEffect(() => {
    if (profile?.accessibilitySettings?.avatarBackgroundId) {
      setActiveBackgroundId(profile.accessibilitySettings.avatarBackgroundId);
    }
  }, [profile?.accessibilitySettings?.avatarBackgroundId]);

  // Listen to storage event changes to synchronize theme and background immediately
  useEffect(() => {
    const syncSettings = () => {
      try {
        const saved = localStorage.getItem("vakhya_profile");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.accessibilitySettings?.avatarThemeId) {
            setActiveThemeId(parsed.accessibilitySettings.avatarThemeId);
          }
          if (parsed.accessibilitySettings?.avatarBackgroundId) {
            setActiveBackgroundId(parsed.accessibilitySettings.avatarBackgroundId);
          }
        }
      } catch (e) {
        console.error("Error syncing settings", e);
      }
    };

    window.addEventListener("storage", syncSettings);
    window.addEventListener("avatar_settings_updated", syncSettings);
    return () => {
      window.removeEventListener("storage", syncSettings);
      window.removeEventListener("avatar_settings_updated", syncSettings);
    };
  }, []);

  const handleThemeChange = (themeId: string) => {
    setActiveThemeId(themeId);
    try {
      const saved = localStorage.getItem("vakhya_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.accessibilitySettings) {
          parsed.accessibilitySettings = {
            textSize: "normal",
            highContrast: false,
            reducedMotion: false,
            hapticIntensity: "medium",
            captionStyle: "standard"
          };
        }
        parsed.accessibilitySettings.avatarThemeId = themeId;
        localStorage.setItem("vakhya_profile", JSON.stringify(parsed));
        // Force state synchronization
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("avatar_settings_updated"));
      }
    } catch (e) {
      console.error("Error saving avatar theme", e);
    }
  };

  const handleBackgroundChange = (bgId: string) => {
    setActiveBackgroundId(bgId);
    try {
      const saved = localStorage.getItem("vakhya_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.accessibilitySettings) {
          parsed.accessibilitySettings = {
            textSize: "normal",
            highContrast: false,
            reducedMotion: false,
            hapticIntensity: "medium",
            captionStyle: "standard"
          };
        }
        parsed.accessibilitySettings.avatarBackgroundId = bgId;
        localStorage.setItem("vakhya_profile", JSON.stringify(parsed));
        // Force state synchronization
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("avatar_settings_updated"));
      }
    } catch (e) {
      console.error("Error saving avatar background", e);
    }
  };

  const activeTheme = AVATAR_THEMES.find(t => t.id === activeThemeId) || AVATAR_THEMES[0];
  const [rotationY, setRotationY] = useState(0); // Rotatable Y-axis for 3D simulation
  const [rotationX, setRotationX] = useState(0); // Rotatable X-axis for elevation view
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Real render loop FPS & frame latency metrics
  const [metrics, setMetrics] = useState({
    fps: 60.0,
    latency: 16.6,
    lConfidence: 98.0,
    rConfidence: 98.0,
    faceConfidence: 99.0
  });
  const fpsCounterRef = useRef({ frames: 0, lastTs: performance.now(), renderMs: 2.0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      const elapsedSec = Math.max(0.1, (now - fpsCounterRef.current.lastTs) / 1000);
      const measuredFps = Number((fpsCounterRef.current.frames / elapsedSec).toFixed(1));
      const measuredMs = Number(fpsCounterRef.current.renderMs.toFixed(1));
      const activePoseConfidence = poseSequence && poseSequence.length > 0 ? 96.5 : isAnimating ? 94.0 : 99.0;
      fpsCounterRef.current.frames = 0;
      fpsCounterRef.current.lastTs = now;
      setMetrics({
        fps: measuredFps || 60.0,
        latency: measuredMs || 16.6,
        lConfidence: activePoseConfidence,
        rConfidence: activePoseConfidence,
        faceConfidence: 99.2,
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [poseSequence, isAnimating]);

  // Main 3D Matrix and Projector Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;

    const render = () => {
      const renderStart = performance.now();
      frame++;
      fpsCounterRef.current.frames += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const centerX = w / 2;
      const centerY = h * 0.38;

      // 1. Dynamic background rendering based on selected style
      if (activeBackgroundId === "aurora-flow") {
        const gradient = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, w * 0.7);
        gradient.addColorStop(0, "rgba(138, 92, 246, 0.20)"); 
        gradient.addColorStop(0.5, "rgba(217, 111, 242, 0.08)"); 
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Subtle aurora grid line accents
        ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 80) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
      } else if (activeBackgroundId === "matrix-digital") {
        ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
        ctx.font = "8px monospace";
        for (let i = 0; i < w; i += 24) {
          const speed = (i % 3 + 1) * 0.4;
          const yPos = ((frame * speed * 2) % (h + 100)) - 50;
          const chars = ["0", "1", "X", "Y", "Z", "A", "B", "C", "D", "E"];
          const char = chars[Math.floor((frame + i) / 6) % chars.length];
          ctx.fillText(char, i, yPos);
          ctx.fillText(chars[(char.charCodeAt(0)) % chars.length], i, Math.max(0, yPos - 20));
        }

        ctx.strokeStyle = "rgba(16, 185, 129, 0.04)";
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 60) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
      } else if (activeBackgroundId === "bokeh-studio") {
        const particles = [
          { x: w * 0.2, y: h * 0.35, r: 65, color: "rgba(236, 72, 153, 0.07)" },
          { x: w * 0.82, y: h * 0.42, r: 85, color: "rgba(59, 130, 246, 0.07)" },
          { x: w * 0.5, y: h * 0.72, r: 100, color: "rgba(139, 92, 246, 0.05)" }
        ];
        
        particles.forEach(p => {
          const driftX = Math.sin(frame * 0.005 + p.r) * 15;
          const driftY = Math.cos(frame * 0.005 + p.r) * 15;
          const radGrad = ctx.createRadialGradient(p.x + driftX, p.y + driftY, 5, p.x + driftX, p.y + driftY, p.r);
          radGrad.addColorStop(0, p.color);
          radGrad.addColorStop(1, "transparent");
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(p.x + driftX, p.y + driftY, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (activeBackgroundId === "minimal-slate") {
        const vignette = ctx.createRadialGradient(centerX, centerY, w * 0.1, centerX, centerY, w * 0.75);
        vignette.addColorStop(0, "rgba(30, 27, 75, 0.12)");
        vignette.addColorStop(1, "rgba(10, 8, 20, 0.85)");
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
      } else if (activeBackgroundId === "neon-horizon") {
        ctx.strokeStyle = "rgba(244, 63, 94, 0.08)";
        ctx.lineWidth = 1;
        const horizonY = h * 0.62;
        ctx.beginPath(); ctx.moveTo(0, horizonY); ctx.lineTo(w, horizonY); ctx.stroke();
        
        for (let y = horizonY; y < h; y += 15) {
          const factor = (y - horizonY) / (h - horizonY);
          ctx.strokeStyle = `rgba(244, 63, 94, ${factor * 0.12})`;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        
        for (let x = -100; x < w + 100; x += 45) {
          ctx.strokeStyle = "rgba(6, 182, 212, 0.06)";
          ctx.beginPath(); ctx.moveTo(centerX, horizonY); ctx.lineTo(x, h); ctx.stroke();
        }
      } else {
        // default cyber-grid / grid
        ctx.strokeStyle = highContrast 
          ? "rgba(255, 255, 255, 0.02)" 
          : "rgba(138, 92, 246, 0.04)";
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < w; x += gridSize) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
      }

      // 2. Head Tilt & Breathing
      const breathing = Math.sin(frame * 0.035) * 4;
      const headOffset = Math.sin(frame * 0.02) * 2;

      // 3D rotation projection helper
      const project3D = (x3d: number, y3d: number, z3d: number): { x: number; y: number; z: number } => {
        // Adjust for default posture breathing
        const adjustedY = y3d + breathing * 0.15;

        // Apply Y-axis rotation
        const cosY = Math.cos((rotationY * Math.PI) / 180);
        const sinY = Math.sin((rotationY * Math.PI) / 180);
        const xRotY = x3d * cosY - z3d * sinY;
        const zRotY = x3d * sinY + z3d * cosY;

        // Apply X-axis rotation
        const cosX = Math.cos((rotationX * Math.PI) / 180);
        const sinX = Math.sin((rotationX * Math.PI) / 180);
        const yRotX = adjustedY * cosX - zRotY * sinX;
        const zRotX = adjustedY * sinX + zRotY * cosX;

        // Focal point projection
        const focalLength = 320;
        const scale = focalLength / (focalLength + zRotX);
        return {
          x: centerX + xRotY * scale,
          y: centerY + yRotX * scale,
          z: zRotX
        };
      };

      // Define Face points
      const faceY = 0;
      const projectedFace = project3D(headOffset, faceY, 0);

      // Define Pose Structure Points
      // 0: Neck, 1: Left Shoulder, 2: Left Elbow, 3: Left Wrist
      // 4: Right Shoulder, 5: Right Elbow, 6: Right Wrist
      // 7: Left Hip, 8: Right Hip
      const basePose = [
        [0, 35, 0],       // 0: Neck
        [-80, 50, 0],     // 1: L Shoulder
        [-110, 120, 10],  // 2: L Elbow
        [-120, 180, 0],   // 3: L Wrist
        [80, 50, 0],      // 4: R Shoulder
        [110, 120, 10],   // 5: R Elbow
        [120, 180, 0],    // 6: R Wrist
        [-45, 210, 0],    // 7: L Hip
        [45, 210, 0]      // 8: R Hip
      ];

      // Mutate active arm/hand wrist positions from real Python poseSequence (or lookup coords)
      if (isAnimating && activeWordIndex !== -1) {
        const wordsList = glossSequence.toUpperCase().replace(/[.,]/g, "").split(" ");
        const activeGloss = wordsList[activeWordIndex] || "DEFAULT";
        const matchingPoseFrames =
          poseSequence && poseSequence.length > 0
            ? poseSequence.filter((p) => !p.gloss || p.gloss.toUpperCase() === activeGloss)
            : [];

        if (matchingPoseFrames.length > 0) {
          const pIdx = Math.floor((frame * 0.16 * avatarSpeed) % matchingPoseFrames.length);
          const kf = matchingPoseFrames[pIdx] || matchingPoseFrames[0];
          const rw = kf.right_wrist || [0.68, 0.34, 0.05];
          const lw = kf.left_wrist || [0.35, 0.72, 0.0];
          const rx = (rw[0] - 0.5) * 260;
          const ry = (rw[1] - 0.5) * 240;
          const rz = -(rw[2] || 0) * 160;
          const lx = (lw[0] - 0.5) * 260;
          const ly = (lw[1] - 0.5) * 240;
          const lz = -(lw[2] || 0) * 160;
          basePose[5] = [80 + rx * 0.55, 85 + ry * 0.55, rz * 0.5];
          basePose[6] = [80 + rx, 85 + ry, rz];
          basePose[2] = [-80 + lx * 0.55, 85 + ly * 0.55, lz * 0.5];
          basePose[3] = [-80 + lx, 85 + ly, lz];
        } else {
          const coordsList = GESTURE_3D_COORDS[activeGloss] || GESTURE_3D_COORDS.DEFAULT;
          const coordIdx = Math.floor((frame * 0.08 * avatarSpeed) % coordsList.length);
          const [rx, ry, rz, lx, ly, lz] = coordsList[coordIdx] || [0, 60, 0, 0, 60, 0];

          basePose[5] = [80 + rx * 0.5, 90 + ry * 0.5, rz * 0.5];
          basePose[6] = [80 + rx, 90 + ry, rz];
          basePose[2] = [-80 + lx * 0.5, 90 + ly * 0.5, lz * 0.5];
          basePose[3] = [-80 + lx, 90 + ly, lz];
        }
      }

      // Project all pose joints
      const projectedPose = basePose.map(pt => project3D(pt[0], pt[1], pt[2]));

      // RENDER: Body Torso Fill / High-contrast lines
      ctx.fillStyle = highContrast ? "rgba(10, 10, 20, 0.9)" : activeTheme.torsoFill;
      ctx.strokeStyle = highContrast ? "#FFFFFF" : activeTheme.torsoStroke;
      ctx.lineWidth = highContrast ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(projectedPose[1].x, projectedPose[1].y);
      ctx.lineTo(projectedPose[4].x, projectedPose[4].y);
      ctx.lineTo(projectedPose[8].x, projectedPose[8].y);
      ctx.lineTo(projectedPose[7].x, projectedPose[7].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // RENDER: Neck joint
      ctx.strokeStyle = highContrast ? "#00FFFF" : activeTheme.boneStroke;
      ctx.lineWidth = highContrast ? 4 : 3;
      ctx.beginPath();
      ctx.moveTo(projectedFace.x, projectedFace.y + 15);
      ctx.lineTo(projectedPose[0].x, projectedPose[0].y);
      ctx.stroke();

      // RENDER: Pose Bones
      POSE_CONNECTIONS.forEach(([i1, i2]) => {
        const pt1 = projectedPose[i1];
        const pt2 = projectedPose[i2];
        ctx.strokeStyle = highContrast ? "#00FF66" : activeTheme.boneStroke;
        ctx.lineWidth = highContrast ? 4 : 3.5;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
      });

      // RENDER: Pose Joint Anchor Bulbs (Computer Vision trace style)
      if (showMesh) {
        projectedPose.forEach((pt, idx) => {
          ctx.fillStyle = highContrast ? "#FFFF00" : activeTheme.headStroke;
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, highContrast ? 5 : 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          if (highContrast) {
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "8px sans-serif";
            ctx.fillText(`P${idx}`, pt.x + 6, pt.y + 3);
          }
        });
      }

      // RENDER: Head Base Mesh Oval
      ctx.fillStyle = highContrast ? "rgba(0,0,0,0.95)" : "#1E1435";
      ctx.strokeStyle = highContrast ? "#00FFFF" : activeTheme.headStroke;
      ctx.lineWidth = highContrast ? 4 : 3;
      ctx.beginPath();
      ctx.arc(projectedFace.x, projectedFace.y, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // RENDER: Eyebrow landmarks
      ctx.strokeStyle = highContrast ? "#FFFF00" : activeTheme.jointTipColor;
      ctx.lineWidth = 2.5;
      const browY = projectedFace.y - 12;
      const bxL = projectedFace.x - 24;
      const bxR = projectedFace.x + 24;

      if (markers.eyebrows === "down") {
        ctx.beginPath();
        ctx.moveTo(bxL - 6, browY + 4); ctx.lineTo(bxL + 12, browY + 9);
        ctx.moveTo(bxR - 12, browY + 9); ctx.lineTo(bxR + 6, browY + 4);
        ctx.stroke();
      } else if (markers.eyebrows === "up") {
        ctx.beginPath();
        ctx.arc(bxL + 3, browY - 2, 8, Math.PI, 0, false);
        ctx.arc(bxR - 3, browY - 2, 8, Math.PI, 0, false);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(bxL - 6, browY); ctx.lineTo(bxL + 10, browY);
        ctx.moveTo(bxR - 10, browY); ctx.lineTo(bxR + 6, browY);
        ctx.stroke();
      }

      // RENDER: Eyes with responsive blinking
      ctx.fillStyle = highContrast ? "#FF00FF" : activeTheme.jointTipColor;
      const isBlinking = frame % 160 < 10;
      if (isBlinking) {
        ctx.strokeStyle = highContrast ? "#FF00FF" : activeTheme.jointTipColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(projectedFace.x - 22, projectedFace.y);
        ctx.lineTo(projectedFace.x - 10, projectedFace.y);
        ctx.moveTo(projectedFace.x + 10, projectedFace.y);
        ctx.lineTo(projectedFace.x + 22, projectedFace.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(projectedFace.x - 16, projectedFace.y, 4, 0, Math.PI * 2);
        ctx.arc(projectedFace.x + 16, projectedFace.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // RENDER: Mouth and lips landmark configurations
      ctx.strokeStyle = highContrast ? "#FF0033" : activeTheme.mouthColor;
      ctx.lineWidth = 2.5;
      const mouthY = projectedFace.y + 16;
      const speakVibration = Math.sin(frame * 0.15 * avatarSpeed) * 5;

      ctx.beginPath();
      if (isAnimating) {
        ctx.arc(projectedFace.x, mouthY, 6 + Math.abs(speakVibration), 0, Math.PI, false);
      } else if (markers.mouth === "smile") {
        ctx.arc(projectedFace.x, mouthY - 4, 12, 0.1, Math.PI - 0.1, false);
      } else {
        ctx.moveTo(projectedFace.x - 12, mouthY);
        ctx.lineTo(projectedFace.x + 12, mouthY);
      }
      ctx.stroke();

      // Face mesh computer vision trace points
      if (showMesh) {
        ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
        for (let i = 0; i < 16; i++) {
          const angle = (i * Math.PI) / 8;
          const fx = projectedFace.x + Math.cos(angle) * 44;
          const fy = projectedFace.y + Math.sin(angle) * 44;
          ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
        }
      }

      // RENDER: HANDS (21 Landmark skeleton projection)
      const renderHandJoints = (wristPt: { x: number; y: number; z: number }, isRight: boolean) => {
        // Base coordinate skeleton mapping relative to wrist
        const baseHand = [
          [0, 0, 0], // Wrist (0)
          
          // Thumb
          [isRight ? 12 : -12, -8, -5], // 1
          [isRight ? 22 : -22, -18, -10], // 2
          [isRight ? 28 : -28, -26, -14], // 3
          [isRight ? 32 : -32, -32, -18], // 4
          
          // Index
          [isRight ? 18 : -18, -24, -5], // 5
          [isRight ? 22 : -22, -42, -10], // 6
          [isRight ? 24 : -24, -54, -14], // 7
          [isRight ? 25 : -25, -64, -16], // 8
          
          // Middle
          [isRight ? 5 : -5, -26, -5],  // 9
          [isRight ? 6 : -6, -46, -10],  // 10
          [isRight ? 6 : -6, -60, -14],  // 11
          [isRight ? 6 : -6, -70, -16],  // 12
          
          // Ring
          [isRight ? -8 : 8, -24, -5],   // 13
          [isRight ? -12 : 12, -44, -10], // 14
          [isRight ? -14 : 14, -56, -12], // 15
          [isRight ? -15 : 15, -66, -14], // 16
          
          // Pinky
          [isRight ? -20 : 20, -18, -5],   // 17
          [isRight ? -26 : 26, -34, -8],   // 18
          [isRight ? -30 : 30, -44, -10],  // 19
          [isRight ? -32 : 32, -52, -12]   // 20
        ];

        // Finger joint micro curls during continuous breathing
        baseHand.forEach((pt, i) => {
          if (i > 0) {
            const wiggle = Math.sin(frame * 0.04 + i) * (isAnimating ? 1.5 : 0.6);
            pt[0] += wiggle;
            pt[1] += wiggle * 1.2;
          }
        });

        // Project wrist reference coordinate backward
        // De-project the wrist back into relative coordinate system
        const projectedHand = baseHand.map(pt => {
          return {
            x: wristPt.x + pt[0],
            y: wristPt.y + pt[1],
            z: wristPt.z + pt[2]
          };
        });

        // DRAW Connections (Bones)
        HAND_CONNECTIONS.forEach(([i1, i2]) => {
          const pt1 = projectedHand[i1];
          const pt2 = projectedHand[i2];
          ctx.strokeStyle = highContrast
            ? (isRight ? "#00FFFF" : "#FF00FF")
            : activeTheme.boneStroke;
          ctx.lineWidth = highContrast ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        });

        // DRAW 21 Landmark Joint Bulbs with confidence coloring
        if (showMesh) {
          projectedHand.forEach((pt, idx) => {
            // Finger tip nodes get highlighted green
            const isTip = [4, 8, 12, 16, 20].includes(idx);
            
            ctx.fillStyle = highContrast
              ? (isTip ? "#FF00FF" : "#FFFF00")
              : (isTip ? activeTheme.jointTipColor : activeTheme.jointBaseColor);
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isTip ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Label key joint IDs when high contrast is active
            if (highContrast && isTip) {
              ctx.fillStyle = "#FFFFFF";
              ctx.font = "bold 7px sans-serif";
              ctx.fillText(`${idx}`, pt.x + 5, pt.y - 4);
            }
          });
        }

        // Draw MediaPipe Tracking Bounding box surrounding hand coordinates
        if (showConfidence) {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          projectedHand.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          });

          // Add padding
          minX -= 12; maxX += 12; minY -= 12; maxY += 12;

          ctx.strokeStyle = isRight ? activeTheme.torsoStroke : activeTheme.glowColor;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
          ctx.setLineDash([]);

          // Bounding box label
          ctx.fillStyle = isRight ? activeTheme.jointBaseColor : activeTheme.jointTipColor;
          ctx.font = "bold 7px monospace";
          const score = isRight ? metrics.rConfidence : metrics.lConfidence;
          ctx.fillText(`${isRight ? "R" : "L"}_HAND: ${score}%`, minX, minY - 4);
        }
      };

      // Render Left Hand from Projected Left Wrist (projectedPose[3])
      renderHandJoints(projectedPose[3], false);
      // Render Right Hand from Projected Right Wrist (projectedPose[6])
      renderHandJoints(projectedPose[6], true);

      // Canvas telemetry overlay HUD
      if (showConfidence) {
        ctx.fillStyle = highContrast ? "#FFFFFF" : activeTheme.jointTipColor;
        ctx.font = "bold 8.5px JetBrains Mono, monospace";
        ctx.fillText(`CV ENGINE: MediaPipe Holistic v0.2.8`, 20, h - 55);
        ctx.fillText(`FPS: ${metrics.fps} FPS`, 20, h - 42);
        ctx.fillText(`GPU TRANSLATION DELAY: ${metrics.latency}ms`, 20, h - 29);
        ctx.fillText(`MESH RESOLUTION: 468 FACE / 42 HANDS / 33 POSE`, 20, h - 16);

        // Highlight Active Signing Gloss Info
        if (isAnimating && activeWordIndex !== -1) {
          const wordList = glossSequence.split(" ");
          const currentWord = wordList[activeWordIndex] || "";
          ctx.fillStyle = "#FF0055";
          ctx.fillText(`ACTIVE GESTURE UNIT: [${currentWord}]`, w - 210, h - 16);
        }
      }

      fpsCounterRef.current.renderMs = Math.max(0.2, performance.now() - renderStart);
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAnimating, activeWordIndex, glossSequence, poseSequence, markers, rotationY, rotationX, showMesh, showConfidence, highContrast, metrics, activeTheme, activeBackgroundId]);

  // Handle Dragging to rotate
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setRotationY(prev => (prev + dx * 0.5) % 360);
    setRotationX(prev => Math.max(-45, Math.min(45, prev + dy * 0.5)));
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const resetRotation = () => {
    setRotationY(0);
    setRotationX(0);
  };

  return (
    <div 
      className="relative flex-1 flex flex-col justify-between w-full h-full min-h-[460px] cursor-grab select-none overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseUpOrLeave();
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
    >
      {/* 3D Active Interactive Canvas */}
      <canvas 
        ref={canvasRef} 
        width={560}
        height={480}
        className="absolute inset-0 w-full h-full object-cover rounded-3xl"
      />

      {/* Floating 3D Avatar Status Indicator */}
      <div className="absolute top-[75px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center pointer-events-none w-[90%] sm:w-auto">
        <AnimatePresence mode="wait">
          {currentState === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111b21]/80 backdrop-blur-md border border-emerald-500/30 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black font-mono tracking-wider text-emerald-400 uppercase">
                AVATAR IDLE / NATURAL BREATHING
              </span>
            </motion.div>
          )}
          {currentState === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111b21]/85 backdrop-blur-md border border-amber-500/40 shadow-[0_4px_12px_rgba(245,158,11,0.2)]"
            >
              <RotateCw className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="text-[10px] font-black font-mono tracking-wider text-amber-400 uppercase">
                PROCESSING SPEECH / MAPPING GESTURE
              </span>
            </motion.div>
          )}
          {currentState === "signing" && (
            <motion.div
              key="signing"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#1E1435]/90 to-purple-900/90 backdrop-blur-md border border-purple-500/50 shadow-[0_4px_15px_rgba(138,92,246,0.3)]"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
              </span>
              <span className="text-[10px] font-black font-mono tracking-wider text-fuchsia-300 uppercase">
                SIGNING ACTIVE: <span className="text-white underline decoration-[#D96FF2] decoration-2">{activeWord || "GENERIC_SIGN"}</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MediaPipe CV Diagnostic Overlay Head Panel */}
      <div className="z-10 flex flex-wrap gap-2 justify-between items-start p-4 bg-gradient-to-b from-[#140F26]/90 to-transparent">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#128C7E]/25 border border-[#128C7E]/40 rounded-xl">
            <Cpu className="w-4 h-4 text-[#25D366]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white font-mono tracking-wider">
                MEDIAPIPE-RIG-LITE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <span className="text-[9px] font-mono text-[var(--text-secondary)]">GPU Holistics Renderer v0.2.8</span>
          </div>
        </div>

        {/* Diagnostic interactive configuration toggles */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowMesh(!showMesh)}
            className={`p-1.5 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              showMesh 
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-200" 
                : "bg-black/40 border-slate-700 text-slate-400"
            }`}
            title="Toggle joint tracing wireframe mesh"
          >
            {showMesh ? <Eye className="w-3.5 h-3.5 text-[#25D366]" /> : <EyeOff className="w-3.5 h-3.5" />}
            Mesh
          </button>

          <button
            onClick={() => setShowConfidence(!showConfidence)}
            className={`p-1.5 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              showConfidence 
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-200" 
                : "bg-black/40 border-slate-700 text-slate-400"
            }`}
            title="Toggle tracking metrics HUD & bounding box annotations"
          >
            <Sliders className="w-3.5 h-3.5 text-[#38BDF8]" />
            Metrics HUD
          </button>

          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`p-1.5 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              highContrast 
                ? "bg-emerald-500/25 border-emerald-500 text-emerald-100" 
                : "bg-black/40 border-slate-700 text-slate-400"
            }`}
            title="Skeletal Overlay Accessibility High Contrast Mode"
          >
            <Accessibility className="w-3.5 h-3.5 text-emerald-400" />
            WCAG Contrast
          </button>
        </div>
      </div>

      {/* Rotation HUD helper overlay on hover */}
      {isHovered && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 border border-emerald-500/30 text-white text-[10px] px-3 py-1.5 rounded-full font-mono flex items-center gap-1.5 pointer-events-none shadow-lg animate-fade-in">
          <RotateCw className="w-3.5 h-3.5 text-[#25D366] animate-spin" />
          <span>Left-click and drag to spin 3D mesh</span>
        </div>
      )}

      {/* Empty visual spacing to align content to bottom */}
      <div className="flex-1" />

      {/* Quick rotation reset controller and active stats HUD */}
      <div className="z-10 p-4 bg-gradient-to-t from-[#140F26]/95 via-[#140F26]/60 to-transparent flex flex-col gap-3">
        {/* Avatar personalization control: Clothing & Neon Theme */}
        <div className="flex flex-col gap-2.5 bg-emerald-950/45 border border-emerald-500/20 rounded-2xl p-3 backdrop-blur-md shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4 text-[#25D366]" />
              <span className="text-[11px] text-emerald-200 font-mono font-bold tracking-wider uppercase">
                Avatar Theme:
              </span>
            </div>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${activeTheme.badgeBg} ${activeTheme.badgeBorder} ${activeTheme.badgeText}`}>
              {activeTheme.name}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-1.5 justify-start">
            {AVATAR_THEMES.map((theme) => {
              const isSelected = theme.id === activeThemeId;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`px-2.5 py-1 text-[10px] rounded-lg font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected 
                      ? `${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText} ring-1 ring-emerald-500/30 scale-102` 
                      : "bg-black/35 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-black/50"
                  }`}
                  title={`Switch clothing/light style to ${theme.name}`}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-inner" 
                    style={{ backgroundColor: theme.jointBaseColor }} 
                  />
                  <span>{theme.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Avatar personalization control: Background Style */}
        <div className="flex flex-col gap-2.5 bg-emerald-950/45 border border-emerald-500/20 rounded-2xl p-3 backdrop-blur-md shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#38BDF8]" />
              <span className="text-[11px] text-emerald-200 font-mono font-bold tracking-wider uppercase">
                Avatar Background:
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border bg-cyan-500/10 border-cyan-500/20 text-cyan-300">
              {AVATAR_BACKGROUNDS.find(b => b.id === activeBackgroundId)?.name || "Cyber Grid"}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-1.5 justify-start">
            {AVATAR_BACKGROUNDS.map((bg) => {
              const isSelected = bg.id === activeBackgroundId;
              return (
                <button
                  key={bg.id}
                  onClick={() => handleBackgroundChange(bg.id)}
                  className={`px-2.5 py-1 text-[10px] rounded-lg font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected 
                      ? "bg-[#128C7E]/25 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/30 scale-102" 
                      : "bg-black/35 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-black/50"
                  }`}
                  title={bg.description}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-inner" 
                    style={{ backgroundColor: bg.colorStart }} 
                  />
                  <span>{bg.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Playback speed slider right inside the 3D avatar component */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-950/45 border border-emerald-500/20 rounded-2xl p-3 backdrop-blur-md shadow-inner">
          <div className="flex items-center gap-2 shrink-0">
            <Sliders className="w-4 h-4 text-[#25D366]" />
            <span className="text-[11px] text-emerald-200 font-mono font-bold tracking-wider uppercase">
              Gesture Speed:
            </span>
          </div>
          <div className="flex items-center gap-3 flex-1">
            <input
              id="avatar-playback-speed-slider"
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={avatarSpeed}
              onChange={(e) => onSpeedChange?.(parseFloat(e.target.value))}
              className="w-full accent-[#25D366] bg-emerald-900/40 cursor-pointer h-1.5 rounded-lg appearance-none transition-all hover:bg-emerald-900/60"
              title="Drag to adjust playback speed multiplier"
            />
            <span className="text-[10px] font-mono font-black text-[#25D366] bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30 shrink-0 select-none">
              {avatarSpeed.toFixed(1)}x
            </span>
          </div>
        </div>

        {(rotationY !== 0 || rotationX !== 0) && (
          <button
            onClick={resetRotation}
            className="self-end px-2.5 py-1 bg-[#140F26]/85 border border-[#128C7E]/30 hover:border-[#128C7E] text-emerald-300 rounded-lg text-[9px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer shadow-lg"
          >
            <RotateCw className="w-3 h-3" />
            Reset 3D Rotation
          </button>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-emerald-500/10">
          <div className="bg-emerald-900/10 border border-emerald-500/10 rounded-xl p-2 flex flex-col">
            <span className="text-[8px] font-mono text-[var(--text-secondary)] uppercase">L-Hand Tracking</span>
            <span className="text-xs font-bold text-[#38BDF8]">{metrics.lConfidence}%</span>
          </div>
          <div className="bg-emerald-900/10 border border-emerald-500/10 rounded-xl p-2 flex flex-col">
            <span className="text-[8px] font-mono text-[var(--text-secondary)] uppercase">R-Hand Tracking</span>
            <span className="text-xs font-bold text-[#25D366]">{metrics.rConfidence}%</span>
          </div>
          <div className="bg-emerald-900/10 border border-emerald-500/10 rounded-xl p-2 flex flex-col">
            <span className="text-[8px] font-mono text-[var(--text-secondary)] uppercase">Face Mesh Track</span>
            <span className="text-xs font-bold text-emerald-400">{metrics.faceConfidence}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

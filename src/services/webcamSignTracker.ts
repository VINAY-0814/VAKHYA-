import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export interface PoseKeyframe {
  t: number;
  right_wrist: [number, number, number];
  left_wrist: [number, number, number];
  right_open: number;
  left_open: number;
  elbow_angle: number;
}

export interface HandDetectionResult {
  engine: "mediapipe-hand-landmarker" | "cv-motion-kinematic";
  landmarksList: Array<Array<{ x: number; y: number; z: number }>>;
  handedness: string[];
  poseFrame: PoseKeyframe;
  motionEnergy: number;
  hasActiveHands: boolean;
  handSummary: string;
  detectedLocalSign?: {
    gloss: string;
    sentence: string;
    confidence: number;
  } | null;
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
];

let sharedLandmarker: HandLandmarker | null = null;
let initPromise: Promise<HandLandmarker | null> | null = null;

export async function initHandLandmarker(): Promise<HandLandmarker | null> {
  if (sharedLandmarker) return sharedLandmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks("/mediapipe-wasm");
      const modelAssetPath =
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
      let landmarker: HandLandmarker;
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      } catch {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      }
      sharedLandmarker = landmarker;
      return landmarker;
    } catch {
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

function getFingerStates(lm: Array<{ x: number; y: number; z: number }>) {
  if (!lm || lm.length < 21) {
    return { thumb: false, index: false, middle: false, ring: false, pinky: false, openScore: 0.5 };
  }
  const wrist = lm[0];
  // Thumb: tip (4) vs IP (3) distance from pinky MCP (17)
  const thumbTipDist = Math.hypot(lm[4].x - lm[17].x, lm[4].y - lm[17].y);
  const thumbIpDist = Math.hypot(lm[3].x - lm[17].x, lm[3].y - lm[17].y);
  const thumb = thumbTipDist > thumbIpDist * 1.15;

  const checkFinger = (tipIdx: number, pipIdx: number, mcpIdx: number) => {
    const tipDist = Math.hypot(lm[tipIdx].x - wrist.x, lm[tipIdx].y - wrist.y);
    const pipDist = Math.hypot(lm[pipIdx].x - wrist.x, lm[pipIdx].y - wrist.y);
    const mcpDist = Math.hypot(lm[mcpIdx].x - wrist.x, lm[mcpIdx].y - wrist.y);
    return tipDist > pipDist * 1.05 && tipDist > mcpDist * 1.25;
  };

  const index = checkFinger(8, 6, 5);
  const middle = checkFinger(12, 10, 9);
  const ring = checkFinger(16, 14, 13);
  const pinky = checkFinger(20, 18, 17);

  const openCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;
  return {
    thumb,
    index,
    middle,
    ring,
    pinky,
    openScore: Number((openCount / 5).toFixed(2)),
  };
}

function classifyStaticSign(
  hands: Array<{
    label: string;
    wrist: { x: number; y: number; z: number };
    thumbTip: { x: number; y: number };
    fingers: ReturnType<typeof getFingerStates>;
  }>,
  motionEnergy: number
): { gloss: string; sentence: string; confidence: number } | null {
  if (!hands.length) return null;

  if (hands.length >= 2) {
    const bothOpen = hands.every((h) => h.fingers.openScore >= 0.6);
    const closeTogether = Math.hypot(hands[0].wrist.x - hands[1].wrist.x, hands[0].wrist.y - hands[1].wrist.y) < 0.32;
    if (bothOpen && closeTogether) {
      return { gloss: "HELP", sentence: "Please help.", confidence: 0.78 };
    }
    if (hands.every((h) => h.fingers.openScore >= 0.8)) {
      return { gloss: "HELLO", sentence: "Hello!", confidence: 0.76 };
    }
  }

  const h = hands[0];
  const { thumb, index, middle, ring, pinky } = h.fingers;
  const wy = h.wrist.y;

  // ILY handshape: thumb + index + pinky extended
  if (thumb && index && !middle && !ring && pinky) {
    return { gloss: "I_LOVE_YOU", sentence: "I love you.", confidence: 0.88 };
  }
  // Call me / Y handshape: thumb + pinky
  if (thumb && !index && !middle && !ring && pinky) {
    return { gloss: "CALL_ME", sentence: "Call me.", confidence: 0.84 };
  }
  // Thumbs up / Good
  if (thumb && !index && !middle && !ring && !pinky && h.thumbTip.y < h.wrist.y - 0.04) {
    return { gloss: "GOOD", sentence: "Good, yes.", confidence: 0.84 };
  }
  // Peace / Two / Victory
  if (!thumb && index && middle && !ring && !pinky) {
    return { gloss: "TWO", sentence: "Two / Peace.", confidence: 0.82 };
  }
  // Pointing / You
  if (!thumb && index && !middle && !ring && !pinky) {
    return { gloss: "YOU", sentence: "You.", confidence: 0.78 };
  }
  // Open palm high / waving -> Hello or Thank You near chin
  if (index && middle && ring && pinky) {
    if (wy < 0.45 && motionEnergy > 1.0) {
      return { gloss: "HELLO", sentence: "Hello!", confidence: 0.8 };
    }
    if (wy >= 0.35 && wy <= 0.62 && motionEnergy < 1.2) {
      return { gloss: "STOP", sentence: "Wait / Stop.", confidence: 0.76 };
    }
    return { gloss: "HELLO", sentence: "Hello!", confidence: 0.74 };
  }
  // Closed fist -> Yes / Understand
  if (!thumb && !index && !middle && !ring && !pinky && motionEnergy > 0.8) {
    return { gloss: "YES", sentence: "Yes.", confidence: 0.75 };
  }

  return null;
}

export class WebcamSignTracker {
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D | null;
  private snapCanvas: HTMLCanvasElement;
  private snapCtx: CanvasRenderingContext2D | null;
  private prevFrame: Uint8ClampedArray | null = null;
  private startTs = performance.now();
  private lastVideoTime = -1;
  private lastDetectTs = 0;

  constructor() {
    this.offscreen = document.createElement("canvas");
    this.offscreen.width = 96;
    this.offscreen.height = 72;
    this.offCtx = this.offscreen.getContext("2d", { willReadFrequently: true });

    this.snapCanvas = document.createElement("canvas");
    this.snapCanvas.width = 320;
    this.snapCanvas.height = 240;
    this.snapCtx = this.snapCanvas.getContext("2d");
  }

  captureCompactFrame(video: HTMLVideoElement, mirrorX = true): string | null {
    if (!this.snapCtx || video.readyState < 2 || video.videoWidth === 0) return null;
    const w = this.snapCanvas.width;
    const h = this.snapCanvas.height;
    this.snapCtx.save();
    if (mirrorX) {
      this.snapCtx.translate(w, 0);
      this.snapCtx.scale(-1, 1);
    }
    this.snapCtx.drawImage(video, 0, 0, w, h);
    this.snapCtx.restore();
    return this.snapCanvas.toDataURL("image/jpeg", 0.75);
  }

  detectFrame(video: HTMLVideoElement): HandDetectionResult {
    const now = performance.now();
    const relT = Number((((now - this.startTs) % 2000) / 2000).toFixed(3));

    // 1. Real pixel-difference motion energy for gesture boundary detection
    let motionEnergy = 0;
    let rightCentroid: [number, number] | null = null;
    let leftCentroid: [number, number] | null = null;

    if (this.offCtx && video.readyState >= 2 && video.videoWidth > 0) {
      const w = this.offscreen.width;
      const h = this.offscreen.height;
      this.offCtx.drawImage(video, 0, 0, w, h);
      const data = this.offCtx.getImageData(0, 0, w, h).data;

      let rx = 0, ry = 0, rc = 0;
      let lx = 0, ly = 0, lc = 0;
      let diffSum = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          let diff = 0;
          if (this.prevFrame) {
            diff =
              (Math.abs(r - this.prevFrame[idx]) +
                Math.abs(g - this.prevFrame[idx + 1]) +
                Math.abs(b - this.prevFrame[idx + 2])) /
              3;
            diffSum += diff;
          }

          // Active motion mask for CV fallback tracking
          if (diff > 18) {
            const nx = x / w;
            const ny = y / h;
            if (nx >= 0.5) {
              rx += nx;
              ry += ny;
              rc++;
            } else {
              lx += nx;
              ly += ny;
              lc++;
            }
          }
        }
      }

      this.prevFrame = new Uint8ClampedArray(data);
      motionEnergy = diffSum / (w * h);
      if (rc > 22) rightCentroid = [Number((rx / rc).toFixed(3)), Number((ry / rc).toFixed(3))];
      if (lc > 22) leftCentroid = [Number((lx / lc).toFixed(3)), Number((ly / lc).toFixed(3))];
    }

    // 2. Primary: MediaPipe HandLandmarker real 21-point detection
    if (
      sharedLandmarker &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.currentTime !== this.lastVideoTime
    ) {
      this.lastVideoTime = video.currentTime;
      const ts = Math.max(this.lastDetectTs + 1, Math.round(now));
      this.lastDetectTs = ts;
      try {
        const res = sharedLandmarker.detectForVideo(video, ts);
        if (res.landmarks && res.landmarks.length > 0) {
          let rw: [number, number, number] = [0.68, 0.45, 0.1];
          let lw: [number, number, number] = [0.32, 0.65, 0.05];
          let rightOpen = 0.4;
          let leftOpen = 0.3;

          const labels = res.handednesses?.map((h) => h[0]?.categoryName || "Right") || [];
          const summaryParts: string[] = [];
          const analyzedHands: Array<{
            label: string;
            wrist: { x: number; y: number; z: number };
            thumbTip: { x: number; y: number };
            fingers: ReturnType<typeof getFingerStates>;
          }> = [];

          res.landmarks.forEach((lm, i) => {
            const label = labels[i] || (lm[0].x >= 0.5 ? "Right" : "Left");
            const wrist = lm[0];
            const fingers = getFingerStates(lm);
            const fingerBits = `${Number(fingers.thumb)},${Number(fingers.index)},${Number(fingers.middle)},${Number(fingers.ring)},${Number(fingers.pinky)}`;
            summaryParts.push(
              `${label}:wrist(${wrist.x.toFixed(2)},${wrist.y.toFixed(2)}),fingers=[${fingerBits}],open=${fingers.openScore}`
            );
            analyzedHands.push({ label, wrist, thumbTip: lm[4], fingers });
            if (label === "Right") {
              rw = [Number(wrist.x.toFixed(3)), Number(wrist.y.toFixed(3)), Number((wrist.z || 0).toFixed(3))];
              rightOpen = fingers.openScore;
            } else {
              lw = [Number(wrist.x.toFixed(3)), Number(wrist.y.toFixed(3)), Number((wrist.z || 0).toFixed(3))];
              leftOpen = fingers.openScore;
            }
          });

          const localSign = classifyStaticSign(analyzedHands, motionEnergy);
          if (localSign) {
            summaryParts.push(`localHint=${localSign.gloss}`);
          }

          const elbowAngle = Math.round(Math.max(25, Math.min(130, 120 - rw[1] * 85)));
          return {
            engine: "mediapipe-hand-landmarker",
            landmarksList: res.landmarks,
            handedness: labels,
            poseFrame: {
              t: relT,
              right_wrist: rw,
              left_wrist: lw,
              right_open: rightOpen,
              left_open: leftOpen,
              elbow_angle: elbowAngle,
            },
            motionEnergy,
            hasActiveHands: true,
            handSummary: summaryParts.join("; "),
            detectedLocalSign: localSign,
          };
        }
      } catch {
        // fall through to pixel motion tracker
      }
    }

    // 3. Fallback motion tracker (only when MediaPipe hasn't detected hands)
    const rwPos: [number, number, number] = rightCentroid
      ? [rightCentroid[0], rightCentroid[1], 0.12]
      : [0.68, 0.6, 0.05];
    const lwPos: [number, number, number] = leftCentroid
      ? [leftCentroid[0], leftCentroid[1], 0.08]
      : [0.32, 0.68, 0.02];

    const syntheticHands: Array<Array<{ x: number; y: number; z: number }>> = [];
    const handedness: string[] = [];
    if (rightCentroid) {
      syntheticHands.push(buildHandFromCentroid(rightCentroid[0], rightCentroid[1]));
      handedness.push("Right");
    }
    if (leftCentroid) {
      syntheticHands.push(buildHandFromCentroid(leftCentroid[0], leftCentroid[1]));
      handedness.push("Left");
    }

    return {
      engine: "cv-motion-kinematic",
      landmarksList: syntheticHands,
      handedness,
      poseFrame: {
        t: relT,
        right_wrist: rwPos,
        left_wrist: lwPos,
        right_open: rightCentroid ? Math.min(1, 0.4 + motionEnergy / 25) : 0.3,
        left_open: leftCentroid ? Math.min(1, 0.4 + motionEnergy / 25) : 0.25,
        elbow_angle: Math.round(Math.max(30, Math.min(125, 115 - rwPos[1] * 80))),
      },
      motionEnergy,
      hasActiveHands: Boolean(rightCentroid || leftCentroid),
      handSummary: handedness.length > 0 ? `MotionHands:${handedness.join(",")}` : "NoActiveHands",
      detectedLocalSign: null,
    };
  }
}

function buildHandFromCentroid(cx: number, cy: number): Array<{ x: number; y: number; z: number }> {
  const pts: Array<{ x: number; y: number; z: number }> = [];
  pts.push({ x: cx, y: cy + 0.08, z: 0 });
  const fingerOffsets = [
    [-0.05, 0.04],
    [-0.025, -0.02],
    [0, -0.04],
    [0.025, -0.02],
    [0.05, 0.01],
  ];
  for (let f = 0; f < 5; f++) {
    const [dx, dy] = fingerOffsets[f];
    for (let j = 1; j <= 4; j++) {
      pts.push({
        x: cx + dx * (j * 0.45),
        y: cy + 0.06 + (dy - 0.03) * (j * 0.55),
        z: 0,
      });
    }
  }
  return pts;
}

export function drawRealHandSkeleton(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  detection: HandDetectionResult,
  mirrorX = true
) {
  ctx.clearRect(0, 0, width, height);

  detection.landmarksList.forEach((landmarks, idx) => {
    const isRight = (detection.handedness[idx] || "Right") === "Right";
    ctx.strokeStyle = isRight ? "#22F3A6" : "#9E7BFF";
    ctx.lineWidth = 2;

    HAND_CONNECTIONS.forEach(([a, b]) => {
      const p1 = landmarks[a];
      const p2 = landmarks[b];
      if (!p1 || !p2) return;
      const x1 = (mirrorX ? 1 - p1.x : p1.x) * width;
      const y1 = p1.y * height;
      const x2 = (mirrorX ? 1 - p2.x : p2.x) * width;
      const y2 = p2.y * height;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    ctx.fillStyle = isRight ? "#22F3A6" : "#C0AAFF";
    landmarks.forEach((pt) => {
      const x = (mirrorX ? 1 - pt.x : pt.x) * width;
      const y = pt.y * height;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

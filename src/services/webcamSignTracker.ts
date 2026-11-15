import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";

export interface FacialExpressionCues {
  eyebrows: "up" | "down" | "neutral";
  mouth: "smile" | "open" | "neutral";
  headMovement: "nod" | "shake" | "steady";
}

export interface UpperBodyPoseCues {
  leftShoulder?: [number, number];
  rightShoulder?: [number, number];
  leftElbow?: [number, number];
  rightElbow?: [number, number];
  nose?: [number, number];
  rightElbowAngle: number;
  leftElbowAngle: number;
}

export interface PoseKeyframe {
  t: number;
  right_wrist: [number, number, number];
  left_wrist: [number, number, number];
  right_open: number;
  left_open: number;
  elbow_angle: number;
  left_elbow_angle?: number;
  right_fingers?: number[];
  left_fingers?: number[];
  right_active?: boolean;
  left_active?: boolean;
  facial_cues?: FacialExpressionCues;
}

export interface HandDetectionResult {
  engine: "mediapipe-multimodal" | "mediapipe-hand-landmarker" | "cv-motion-kinematic";
  landmarksList: Array<Array<{ x: number; y: number; z: number }>>;
  handedness: string[];
  poseFrame: PoseKeyframe;
  bodyPose: UpperBodyPoseCues;
  facialCues: FacialExpressionCues;
  motionEnergy: number;
  hasActiveHands: boolean;
  handSummary: string;
  fingerSignature: string;
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

let sharedHandLandmarker: HandLandmarker | null = null;
let sharedFaceLandmarker: FaceLandmarker | null = null;
let sharedPoseLandmarker: PoseLandmarker | null = null;
let initPromise: Promise<HandLandmarker | null> | null = null;

async function createWithDelegateFallback<T>(
  factory: (delegate: "GPU" | "CPU") => Promise<T>
): Promise<T | null> {
  try {
    return await factory("GPU");
  } catch {
    try {
      return await factory("CPU");
    } catch {
      return null;
    }
  }
}

export async function initSignLandmarkers(): Promise<HandLandmarker | null> {
  if (sharedHandLandmarker) return sharedHandLandmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks("/mediapipe-wasm");

      const handTask = createWithDelegateFallback((delegate) =>
        HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "/mediapipe-models/hand_landmarker.task", delegate },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.42,
          minHandPresenceConfidence: 0.42,
          minTrackingConfidence: 0.42,
        })
      );

      const faceTask = createWithDelegateFallback((delegate) =>
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "/mediapipe-models/face_landmarker.task", delegate },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
          minFaceDetectionConfidence: 0.45,
          minFacePresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        })
      );

      const poseTask = createWithDelegateFallback((delegate) =>
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "/mediapipe-models/pose_landmarker_lite.task", delegate },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.45,
          minPosePresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        })
      );

      const [handRes, faceRes, poseRes] = await Promise.all([handTask, faceTask, poseTask]);
      sharedHandLandmarker = handRes;
      sharedFaceLandmarker = faceRes;
      sharedPoseLandmarker = poseRes;

      if (!sharedHandLandmarker) {
        initPromise = null;
      }
      return sharedHandLandmarker;
    } catch (err) {
      console.warn("[VAKHYA Sign] Multimodal landmarker init failed, using fallback:", err);
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

// Keep backward-compatible export alias
export const initHandLandmarker = initSignLandmarkers;

function computeElbowAngle(
  shoulder?: [number, number],
  elbow?: [number, number],
  wrist?: [number, number]
): number | null {
  if (!shoulder || !elbow || !wrist) return null;
  const v1x = shoulder[0] - elbow[0];
  const v1y = shoulder[1] - elbow[1];
  const v2x = wrist[0] - elbow[0];
  const v2y = wrist[1] - elbow[1];
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 < 0.01 || mag2 < 0.01) return null;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (mag1 * mag2)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

function getFingerStates(lm: Array<{ x: number; y: number; z: number }>) {
  if (!lm || lm.length < 21) {
    return {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
      vector: [0, 0, 0, 0, 0],
      openScore: 0.5,
      palmSize: 0.15,
      thumbIndexPinch: false,
    };
  }
  const wrist = lm[0];
  const palmSize = Math.max(0.04, Math.hypot(lm[9].x - wrist.x, lm[9].y - wrist.y));

  const thumbTipPinky = Math.hypot(lm[4].x - lm[17].x, lm[4].y - lm[17].y);
  const thumbIpPinky = Math.hypot(lm[3].x - lm[17].x, lm[3].y - lm[17].y);
  const thumbTipIndexMcp = Math.hypot(lm[4].x - lm[5].x, lm[4].y - lm[5].y);
  const thumb = thumbTipPinky > thumbIpPinky * 1.07 && thumbTipIndexMcp > palmSize * 0.42;

  const thumbIndexDist = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
  const thumbIndexPinch = thumbIndexDist < palmSize * 0.45;

  const checkFinger = (tipIdx: number, pipIdx: number, mcpIdx: number) => {
    const tipDist = Math.hypot(lm[tipIdx].x - wrist.x, lm[tipIdx].y - wrist.y);
    const pipDist = Math.hypot(lm[pipIdx].x - wrist.x, lm[pipIdx].y - wrist.y);
    const mcpDist = Math.hypot(lm[mcpIdx].x - wrist.x, lm[mcpIdx].y - wrist.y);
    return tipDist > pipDist * 1.03 && tipDist > mcpDist * 1.18;
  };

  const index = checkFinger(8, 6, 5);
  const middle = checkFinger(12, 10, 9);
  const ring = checkFinger(16, 14, 13);
  const pinky = checkFinger(20, 18, 17);

  const vector = [Number(thumb), Number(index), Number(middle), Number(ring), Number(pinky)];
  const openCount = vector.reduce((a, b) => a + b, 0);
  return {
    thumb,
    index,
    middle,
    ring,
    pinky,
    vector,
    openScore: Number((openCount / 5).toFixed(2)),
    palmSize,
    thumbIndexPinch,
  };
}

function classifyLocalSign(
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
    const dist = Math.hypot(
      hands[0].wrist.x - hands[1].wrist.x,
      hands[0].wrist.y - hands[1].wrist.y
    );
    const bothOpen = hands.every((h) => h.fingers.openScore >= 0.8);
    if (bothOpen && dist < 0.24 && motionEnergy < 1.8) {
      return { gloss: "NAMASTE", sentence: "Namaste, greetings!", confidence: 0.85 };
    }
    const oneOpenOneThumb =
      (hands[0].fingers.openScore >= 0.8 && hands[1].fingers.thumb && !hands[1].fingers.middle) ||
      (hands[1].fingers.openScore >= 0.8 && hands[0].fingers.thumb && !hands[0].fingers.middle);
    if (oneOpenOneThumb && dist < 0.34) {
      return { gloss: "HELP", sentence: "Please help me.", confidence: 0.82 };
    }
    if (bothOpen && motionEnergy > 2.6 && dist > 0.35) {
      return { gloss: "EMERGENCY", sentence: "Emergency!", confidence: 0.8 };
    }
    return null;
  }

  // Works identically whether signer uses Left or Right hand!
  const h = hands[0];
  const { thumb, index, middle, ring, pinky, thumbIndexPinch } = h.fingers;
  const wy = h.wrist.y;

  if (thumb && index && !middle && !ring && pinky) {
    return { gloss: "I_LOVE_YOU", sentence: "I love you.", confidence: 0.9 };
  }
  if (thumb && !index && !middle && !ring && pinky) {
    return { gloss: "CALL", sentence: "Call me.", confidence: 0.85 };
  }
  if (thumbIndexPinch && middle && ring && pinky) {
    return { gloss: "OK", sentence: "Okay, I understand.", confidence: 0.85 };
  }
  if (thumb && !index && !middle && !ring && !pinky && h.thumbTip.y < h.wrist.y - 0.025) {
    return { gloss: "GOOD", sentence: "Good.", confidence: 0.84 };
  }
  if (!thumb && index && middle && ring && !pinky) {
    return { gloss: wy < 0.38 ? "WATER" : "THREE", sentence: wy < 0.38 ? "I need water." : "Three.", confidence: 0.8 };
  }
  if (!thumb && index && middle && !ring && !pinky) {
    return { gloss: "TWO", sentence: "Two.", confidence: 0.82 };
  }
  if (!thumb && index && !middle && !ring && !pinky) {
    return { gloss: "YOU", sentence: "You.", confidence: 0.76 };
  }
  if (index && middle && ring && pinky && wy < 0.45 && motionEnergy > 1.2) {
    return { gloss: "HELLO", sentence: "Hello!", confidence: 0.82 };
  }

  return null;
}

function getBodyAnchorZone(
  wy: number,
  bodyPose: UpperBodyPoseCues
): string {
  const shoulderY =
    bodyPose.rightShoulder && bodyPose.leftShoulder
      ? (bodyPose.rightShoulder[1] + bodyPose.leftShoulder[1]) / 2
      : 0.62;
  const noseY = bodyPose.nose?.[1] ?? 0.28;
  const chinY = noseY + (shoulderY - noseY) * 0.45;
  if (wy < noseY + 0.03) return "forehead/head";
  if (wy < chinY + 0.04) return "mouth/chin";
  if (wy < shoulderY + 0.14) return "chest";
  return "neutral";
}

export class WebcamSignTracker {
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D | null;
  private snapCanvas: HTMLCanvasElement;
  private snapCtx: CanvasRenderingContext2D | null;
  private prevFrame: Uint8ClampedArray | null = null;
  private startTs = performance.now();
  private lastDetectTs = 0;
  private frameTick = 0;
  private prevRw: [number, number] | null = null;
  private prevLw: [number, number] | null = null;
  private noseHistory: Array<{ x: number; y: number }> = [];
  private cachedBodyPose: UpperBodyPoseCues = { rightElbowAngle: 75, leftElbowAngle: 85 };
  private cachedFacialCues: FacialExpressionCues = { eyebrows: "neutral", mouth: "neutral", headMovement: "steady" };

  constructor() {
    this.offscreen = document.createElement("canvas");
    this.offscreen.width = 96;
    this.offscreen.height = 72;
    this.offCtx = this.offscreen.getContext("2d", { willReadFrequently: true });

    this.snapCanvas = document.createElement("canvas");
    this.snapCanvas.width = 384;
    this.snapCanvas.height = 288;
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
    return this.snapCanvas.toDataURL("image/jpeg", 0.78);
  }

  private updateFaceAndPoseCues(video: HTMLVideoElement, ts: number, mirrorX: boolean) {
    const mx = (x: number) => (mirrorX ? 1 - x : x);

    if (sharedPoseLandmarker) {
      try {
        const poseRes = sharedPoseLandmarker.detectForVideo(video, ts);
        const lm = poseRes.landmarks?.[0];
        if (lm && lm.length >= 17) {
          // Pose landmarks 11=left_shoulder, 12=right_shoulder, 13=left_elbow, 14=right_elbow, 15=left_wrist, 16=right_wrist (flip left/right when mirrored)
          const rShIdx = mirrorX ? 11 : 12;
          const lShIdx = mirrorX ? 12 : 11;
          const rElIdx = mirrorX ? 13 : 14;
          const lElIdx = mirrorX ? 14 : 13;
          const rWrIdx = mirrorX ? 15 : 16;
          const lWrIdx = mirrorX ? 16 : 15;

          const rShoulder: [number, number] = [mx(lm[rShIdx].x), lm[rShIdx].y];
          const lShoulder: [number, number] = [mx(lm[lShIdx].x), lm[lShIdx].y];
          const rElbow: [number, number] = [mx(lm[rElIdx].x), lm[rElIdx].y];
          const lElbow: [number, number] = [mx(lm[lElIdx].x), lm[lElIdx].y];
          const rWrist: [number, number] = [mx(lm[rWrIdx].x), lm[rWrIdx].y];
          const lWrist: [number, number] = [mx(lm[lWrIdx].x), lm[lWrIdx].y];

          this.cachedBodyPose = {
            rightShoulder: rShoulder,
            leftShoulder: lShoulder,
            rightElbow: rElbow,
            leftElbow: lElbow,
            nose: [mx(lm[0].x), lm[0].y],
            rightElbowAngle: computeElbowAngle(rShoulder, rElbow, rWrist) ?? 75,
            leftElbowAngle: computeElbowAngle(lShoulder, lElbow, lWrist) ?? 85,
          };
        }
      } catch {
        // ignore transient pose detection errors
      }
    }

    if (sharedFaceLandmarker) {
      try {
        const faceRes = sharedFaceLandmarker.detectForVideo(video, ts);
        const cats = faceRes.faceBlendshapes?.[0]?.categories || [];
        const scoreOf = (name: string) => cats.find((c) => c.categoryName === name)?.score ?? 0;

        const browUp = scoreOf("browInnerUp");
        const browDown = Math.max(scoreOf("browDownLeft"), scoreOf("browDownRight"));
        const eyebrows: FacialExpressionCues["eyebrows"] =
          browUp > 0.28 ? "up" : browDown > 0.26 ? "down" : "neutral";

        const jawOpen = scoreOf("jawOpen");
        const smile = (scoreOf("mouthSmileLeft") + scoreOf("mouthSmileRight")) / 2;
        const mouth: FacialExpressionCues["mouth"] =
          jawOpen > 0.24 ? "open" : smile > 0.30 ? "smile" : "neutral";

        const faceLm = faceRes.faceLandmarks?.[0];
        let headMovement: FacialExpressionCues["headMovement"] = "steady";
        if (faceLm && faceLm[1]) {
          this.noseHistory.push({ x: mx(faceLm[1].x), y: faceLm[1].y });
          if (this.noseHistory.length > 10) this.noseHistory.shift();
          if (this.noseHistory.length >= 6) {
            const xs = this.noseHistory.map((p) => p.x);
            const ys = this.noseHistory.map((p) => p.y);
            const spanX = Math.max(...xs) - Math.min(...xs);
            const spanY = Math.max(...ys) - Math.min(...ys);
            if (spanX > 0.025 && spanX > spanY * 1.2) headMovement = "shake";
            else if (spanY > 0.020 && spanY > spanX * 1.2) headMovement = "nod";
          }
        }

        this.cachedFacialCues = { eyebrows, mouth, headMovement };
      } catch {
        // ignore transient face detection errors
      }
    }
  }

  detectFrame(video: HTMLVideoElement, mirrorX = true): HandDetectionResult {
    const now = performance.now();
    this.frameTick += 1;
    const relT = Number((((now - this.startTs) % 2000) / 2000).toFixed(3));
    const mx = (x: number) => (mirrorX ? 1 - x : x);

    // 1. Real pixel-difference motion energy (normalized into mirrored coordinates)
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

          if (diff > 18) {
            const nx = mirrorX ? 1 - x / w : x / w;
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

    // 2. Multimodal MediaPipe Detection (Hands + throttled Pose/Face)
    if (
      sharedHandLandmarker &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      !video.paused &&
      !video.ended
    ) {
      const ts = Math.max(this.lastDetectTs + 1, Math.round(now));
      this.lastDetectTs = ts;

      if (this.frameTick % 2 === 1) {
        this.updateFaceAndPoseCues(video, ts, mirrorX);
      }

      try {
        const res = sharedHandLandmarker.detectForVideo(video, ts);
        if (res.landmarks && res.landmarks.length > 0) {
          let rw: [number, number, number] = [0.68, 0.60, 0.05];
          let lw: [number, number, number] = [0.35, 0.72, 0.0];
          let rightOpen = 0.3;
          let leftOpen = 0.3;
          let rightFingers = [0, 0, 0, 0, 0];
          let leftFingers = [0, 0, 0, 0, 0];
          let rightActive = false;
          let leftActive = false;

          // Normalize landmarks & correct selfie-mirror handedness inversion
          const canonicalLandmarks = res.landmarks.map((handLm) =>
            handLm.map((pt) => ({ x: mx(pt.x), y: pt.y, z: pt.z || 0 }))
          );

          const rawLabels = res.handednesses?.map((h) => h[0]?.categoryName || "Right") || [];
          const resolvedLabels = canonicalLandmarks.map((clm, i) => {
            const raw = rawLabels[i];
            if (!raw) return clm[0].x >= 0.5 ? "Right" : "Left";
            // In selfie camera mode (mirrorX), MediaPipe returns flipped handedness vs signer's true anatomy
            return mirrorX ? (raw === "Left" ? "Right" : "Left") : raw;
          });

          // If two hands got assigned the same label transiently, split by canonical x-position
          if (canonicalLandmarks.length === 2 && resolvedLabels[0] === resolvedLabels[1]) {
            if (canonicalLandmarks[0][0].x >= canonicalLandmarks[1][0].x) {
              resolvedLabels[0] = "Right";
              resolvedLabels[1] = "Left";
            } else {
              resolvedLabels[0] = "Left";
              resolvedLabels[1] = "Right";
            }
          }

          const summaryParts: string[] = [
            `hands=${canonicalLandmarks.length}`,
            `motion=${motionEnergy.toFixed(1)}`,
          ];
          const analyzedHands: Array<{
            label: string;
            wrist: { x: number; y: number; z: number };
            thumbTip: { x: number; y: number };
            fingers: ReturnType<typeof getFingerStates>;
          }> = [];

          canonicalLandmarks.forEach((lm, i) => {
            const label = resolvedLabels[i];
            const wrist = lm[0];
            const fingers = getFingerStates(lm);
            const zone = getBodyAnchorZone(wrist.y, this.cachedBodyPose);
            const fingerBits = fingers.vector.join(",");
            analyzedHands.push({ label, wrist, thumbTip: lm[4], fingers });

            if (label === "Right") {
              rightActive = true;
              rw = [Number(wrist.x.toFixed(3)), Number(wrist.y.toFixed(3)), Number((wrist.z || 0).toFixed(3))];
              rightOpen = fingers.openScore;
              rightFingers = fingers.vector;
              const dvx = this.prevRw ? rw[0] - this.prevRw[0] : 0;
              const dvy = this.prevRw ? rw[1] - this.prevRw[1] : 0;
              this.prevRw = [rw[0], rw[1]];
              summaryParts.push(
                `R:pos(${rw[0].toFixed(2)},${rw[1].toFixed(2)},${zone}),vel(${dvx.toFixed(2)},${dvy.toFixed(2)}),fingers=[${fingerBits}],open=${rightOpen}`
              );
            } else {
              leftActive = true;
              lw = [Number(wrist.x.toFixed(3)), Number(wrist.y.toFixed(3)), Number((wrist.z || 0).toFixed(3))];
              leftOpen = fingers.openScore;
              leftFingers = fingers.vector;
              const dvx = this.prevLw ? lw[0] - this.prevLw[0] : 0;
              const dvy = this.prevLw ? lw[1] - this.prevLw[1] : 0;
              this.prevLw = [lw[0], lw[1]];
              summaryParts.push(
                `L:pos(${lw[0].toFixed(2)},${lw[1].toFixed(2)},${zone}),vel(${dvx.toFixed(2)},${dvy.toFixed(2)}),fingers=[${fingerBits}],open=${leftOpen}`
              );
            }
          });

          if (!rightActive) this.prevRw = null;
          if (!leftActive) this.prevLw = null;

          if (analyzedHands.length >= 2) {
            const dist = Math.hypot(
              analyzedHands[0].wrist.x - analyzedHands[1].wrist.x,
              analyzedHands[0].wrist.y - analyzedHands[1].wrist.y
            );
            summaryParts.push(`twoHandDist=${dist.toFixed(2)}`);
          }

          summaryParts.push(
            `face(brows=${this.cachedFacialCues.eyebrows},mouth=${this.cachedFacialCues.mouth},head=${this.cachedFacialCues.headMovement})`
          );

          const localSign = classifyLocalSign(analyzedHands, motionEnergy);
          const rightElbow =
            this.cachedBodyPose.rightElbowAngle ||
            Math.round(Math.max(25, Math.min(130, 120 - rw[1] * 85)));
          const leftElbow =
            this.cachedBodyPose.leftElbowAngle ||
            Math.round(Math.max(25, Math.min(130, 120 - lw[1] * 85)));

          const engineType =
            sharedFaceLandmarker || sharedPoseLandmarker
              ? "mediapipe-multimodal"
              : "mediapipe-hand-landmarker";

          const fingerSignature = `${rightActive ? rightFingers.join("") : "x"}|${leftActive ? leftFingers.join("") : "x"}`;

          return {
            engine: engineType,
            landmarksList: canonicalLandmarks,
            handedness: resolvedLabels,
            poseFrame: {
              t: relT,
              right_wrist: rw,
              left_wrist: lw,
              right_open: rightOpen,
              left_open: leftOpen,
              elbow_angle: rightElbow,
              left_elbow_angle: leftElbow,
              right_fingers: rightFingers,
              left_fingers: leftFingers,
              right_active: rightActive,
              left_active: leftActive,
              facial_cues: this.cachedFacialCues,
            },
            bodyPose: this.cachedBodyPose,
            facialCues: this.cachedFacialCues,
            motionEnergy,
            hasActiveHands: true,
            handSummary: summaryParts.join("; "),
            fingerSignature,
            detectedLocalSign: localSign,
          };
        }
      } catch {
        // fall through to pixel motion tracker
      }
    }

    // 3. Motion centroid fallback when MediaPipe has no active hand detections
    this.prevRw = null;
    this.prevLw = null;
    const rActive = Boolean(rightCentroid);
    const lActive = Boolean(leftCentroid);
    const rwPos: [number, number, number] = rightCentroid
      ? [rightCentroid[0], rightCentroid[1], 0.12]
      : [0.68, 0.60, 0.05];
    const lwPos: [number, number, number] = leftCentroid
      ? [leftCentroid[0], leftCentroid[1], 0.08]
      : [0.35, 0.72, 0.0];

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
        right_open: rActive ? Math.min(1, 0.4 + motionEnergy / 25) : 0.3,
        left_open: lActive ? Math.min(1, 0.4 + motionEnergy / 25) : 0.3,
        elbow_angle: Math.round(Math.max(30, Math.min(125, 115 - rwPos[1] * 80))),
        left_elbow_angle: Math.round(Math.max(30, Math.min(125, 115 - lwPos[1] * 80))),
        right_active: rActive,
        left_active: lActive,
        facial_cues: this.cachedFacialCues,
      },
      bodyPose: this.cachedBodyPose,
      facialCues: this.cachedFacialCues,
      motionEnergy,
      hasActiveHands: rActive || lActive,
      handSummary: handedness.length > 0 ? `MotionHands:${handedness.join(",")}` : "NoActiveHands",
      fingerSignature: "fallback",
      detectedLocalSign: null,
    };
  }
}

/**
 * 3-state Gesture Boundary State Machine (IDLE -> SIGNING -> SETTLED)
 * Prevents repeated duplicate translations when user holds a stationary pose or isn't signing.
 */
export class GestureBoundaryTracker {
  private state: "IDLE" | "SIGNING" | "SETTLED" = "IDLE";
  public poseBuffer: PoseKeyframe[] = [];
  public frameSnaps: string[] = [];
  public handSummary = "";

  private peakMotion = 0;
  private activeTravel = 0;
  private fingerChanges = 0;
  private quietFrames = 0;
  private lastAnchorPose: PoseKeyframe | null = null;
  private lastFingerSig = "";
  private settledPose: PoseKeyframe | null = null;
  private settledFingerSig = "";
  private settledTs = 0;
  private lastHandsSeenTs = 0;

  reset() {
    this.state = "IDLE";
    this.poseBuffer = [];
    this.frameSnaps = [];
    this.handSummary = "";
    this.peakMotion = 0;
    this.activeTravel = 0;
    this.fingerChanges = 0;
    this.quietFrames = 0;
    this.lastAnchorPose = null;
    this.lastFingerSig = "";
    this.settledPose = null;
    this.settledFingerSig = "";
    this.settledTs = 0;
  }

  private static poseDelta(a: PoseKeyframe | null, b: PoseKeyframe): number {
    if (!a) return 0;
    const dr = b.right_active
      ? Math.hypot(b.right_wrist[0] - a.right_wrist[0], b.right_wrist[1] - a.right_wrist[1])
      : 0;
    const dl = b.left_active
      ? Math.hypot(b.left_wrist[0] - a.left_wrist[0], b.left_wrist[1] - a.left_wrist[1])
      : 0;
    return Math.max(dr, dl);
  }

  step(
    detection: HandDetectionResult,
    captureFrame: () => string | null,
    nowMs: number
  ): {
    shouldDispatch: boolean;
    phraseBoundary: boolean;
    poses: PoseKeyframe[];
    snaps: string[];
    handSummary: string;
  } | null {
    // 1. Hands absent / left frame
    if (!detection.hasActiveHands) {
      if (this.state === "SIGNING" && this.poseBuffer.length >= 5 && this.hasMeaningfulMotion()) {
        const out = {
          shouldDispatch: true,
          phraseBoundary: true,
          poses: [...this.poseBuffer],
          snaps: [...this.frameSnaps],
          handSummary: this.handSummary,
        };
        this.markSettled(this.poseBuffer[this.poseBuffer.length - 1], this.lastFingerSig, nowMs);
        return out;
      }
      if (nowMs - this.lastHandsSeenTs > 500) {
        this.state = "IDLE";
        this.poseBuffer = [];
        this.frameSnaps = [];
        this.peakMotion = 0;
        this.activeTravel = 0;
        this.fingerChanges = 0;
        this.quietFrames = 0;
        this.settledPose = null;
        this.settledFingerSig = "";
      }
      return null;
    }

    const handsReenteredAfterGap = nowMs - this.lastHandsSeenTs > 550;
    this.lastHandsSeenTs = nowMs;

    // 2. If SETTLED after a previous translation, DO NOT re-trigger unless a genuinely new gesture begins
    if (this.state === "SETTLED") {
      if (nowMs - this.settledTs < 1400) {
        return null;
      }
      const deltaFromSettled = GestureBoundaryTracker.poseDelta(this.settledPose, detection.poseFrame);
      const shapeChanged =
        detection.fingerSignature !== "fallback" &&
        this.settledFingerSig !== "" &&
        detection.fingerSignature !== this.settledFingerSig;

      if (!handsReenteredAfterGap && deltaFromSettled < 0.048 && !shapeChanged && detection.motionEnergy < 2.6) {
        // User is holding stationary or resting hand -> stay SETTLED, zero repeat requests!
        return null;
      }

      // New gesture started!
      this.state = "SIGNING";
      this.poseBuffer = [];
      this.frameSnaps = [];
      this.peakMotion = 0;
      this.activeTravel = 0;
      this.fingerChanges = 0;
      this.quietFrames = 0;
      this.lastAnchorPose = detection.poseFrame;
      this.lastFingerSig = detection.fingerSignature;
    }

    // 3. If IDLE, wait until real movement/re-entry starts a gesture (avoid idle holding noise)
    if (this.state === "IDLE") {
      this.state = "SIGNING";
      this.lastAnchorPose = detection.poseFrame;
      this.lastFingerSig = detection.fingerSignature;
    }

    // 4. Accumulate active SIGNING frame
    const stepDelta = GestureBoundaryTracker.poseDelta(this.lastAnchorPose, detection.poseFrame);
    this.activeTravel += stepDelta;
    if (
      detection.fingerSignature !== "fallback" &&
      this.lastFingerSig &&
      detection.fingerSignature !== this.lastFingerSig
    ) {
      this.fingerChanges += 1;
    }
    this.lastAnchorPose = detection.poseFrame;
    this.lastFingerSig = detection.fingerSignature;

    this.poseBuffer.push(detection.poseFrame);
    if (this.poseBuffer.length > 24) this.poseBuffer.shift();
    this.handSummary = detection.handSummary;
    if (detection.motionEnergy > this.peakMotion) this.peakMotion = detection.motionEnergy;

    if (this.frameSnaps.length < 12) {
      const snap = captureFrame();
      if (snap) this.frameSnaps.push(snap);
    }

    if (stepDelta < 0.014 && detection.motionEnergy < 1.8) {
      this.quietFrames += 1;
    } else {
      this.quietFrames = 0;
    }

    const phraseDone = this.poseBuffer.length >= 6 && this.quietFrames >= 3;
    const chunkFull = this.poseBuffer.length >= 14;

    if ((phraseDone || chunkFull) && this.hasMeaningfulMotion()) {
      const snaps = [...this.frameSnaps];
      const finalSnap = captureFrame();
      if (finalSnap) snaps.push(finalSnap);

      const poses = [...this.poseBuffer];
      const summary = this.handSummary;

      if (phraseDone) {
        this.markSettled(detection.poseFrame, detection.fingerSignature, nowMs);
      } else {
        // Mid-stream continuous overlap chunk
        this.poseBuffer = this.poseBuffer.slice(-3);
        this.frameSnaps = this.frameSnaps.slice(-2);
        this.peakMotion = 0;
        this.activeTravel = 0;
        this.fingerChanges = 0;
        this.quietFrames = 0;
      }

      return {
        shouldDispatch: true,
        phraseBoundary: phraseDone,
        poses,
        snaps,
        handSummary: summary,
      };
    }

    return null;
  }

  private hasMeaningfulMotion(): boolean {
    return (
      this.activeTravel >= 0.032 ||
      this.fingerChanges >= 1 ||
      this.peakMotion >= 2.2
    );
  }

  private markSettled(lastPose: PoseKeyframe, lastSig: string, nowMs: number) {
    this.state = "SETTLED";
    this.poseBuffer = [];
    this.frameSnaps = [];
    this.peakMotion = 0;
    this.activeTravel = 0;
    this.fingerChanges = 0;
    this.quietFrames = 0;
    this.settledPose = lastPose;
    this.settledFingerSig = lastSig;
    this.settledTs = nowMs;
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
  _mirrorX = true
) {
  ctx.clearRect(0, 0, width, height);

  // Subtle upper-body shoulder/elbow frame guide when PoseLandmarker is active
  const { leftShoulder, rightShoulder, leftElbow, rightElbow } = detection.bodyPose;
  if (leftShoulder && rightShoulder) {
    ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftShoulder[0] * width, leftShoulder[1] * height);
    ctx.lineTo(rightShoulder[0] * width, rightShoulder[1] * height);
    if (leftElbow) {
      ctx.moveTo(leftShoulder[0] * width, leftShoulder[1] * height);
      ctx.lineTo(leftElbow[0] * width, leftElbow[1] * height);
    }
    if (rightElbow) {
      ctx.moveTo(rightShoulder[0] * width, rightShoulder[1] * height);
      ctx.lineTo(rightElbow[0] * width, rightElbow[1] * height);
    }
    ctx.stroke();
  }

  // Note: detection.landmarksList are already normalized into display coordinates
  detection.landmarksList.forEach((landmarks, idx) => {
    const isRight = (detection.handedness[idx] || "Right") === "Right";
    ctx.strokeStyle = isRight ? "#22F3A6" : "#9E7BFF";
    ctx.lineWidth = 2;

    HAND_CONNECTIONS.forEach(([a, b]) => {
      const p1 = landmarks[a];
      const p2 = landmarks[b];
      if (!p1 || !p2) return;
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    });

    ctx.fillStyle = isRight ? "#22F3A6" : "#C0AAFF";
    landmarks.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

export function downsampleFrames(frames: string[], maxCount = 6): string[] {
  if (frames.length <= maxCount) return frames;
  const result: string[] = [];
  for (let i = 0; i < maxCount; i++) {
    const idx = Math.round((i * (frames.length - 1)) / (maxCount - 1));
    result.push(frames[idx]);
  }
  return result;
}

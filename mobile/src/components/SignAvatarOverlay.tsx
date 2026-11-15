import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { PoseKeyframe } from "../types";

interface SignAvatarOverlayProps {
  visible: boolean;
  poseFrames: PoseKeyframe[];
  glossText: string;
  captionText: string;
  nonManual?: { eyebrows?: string; mouth?: string; headTilt?: string };
}

export function SignAvatarOverlay({
  visible,
  poseFrames,
  glossText,
  captionText,
  nonManual,
}: SignAvatarOverlayProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!visible || poseFrames.length === 0) return;
    setFrameIndex(0);
    const id = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % poseFrames.length);
    }, 90);
    return () => clearInterval(id);
  }, [visible, poseFrames]);

  if (!visible) return null;

  const frame = poseFrames[frameIndex] || {
    gloss: "IDLE",
    t: 0,
    right_wrist: [0.68, 0.44, 0.1] as [number, number, number],
    left_wrist: [0.34, 0.72, 0.0] as [number, number, number],
    right_open: 0.8,
    left_open: 0.3,
    elbow_angle: 70,
  };

  const w = 150;
  const h = 150;
  const head = { x: 0.5 * w, y: 0.22 * h };
  const neck = { x: 0.5 * w, y: 0.34 * h };
  const rShoulder = { x: 0.64 * w, y: 0.38 * h };
  const lShoulder = { x: 0.36 * w, y: 0.38 * h };
  const hip = { x: 0.5 * w, y: 0.72 * h };
  const rWrist = { x: frame.right_wrist[0] * w, y: frame.right_wrist[1] * h };
  const lWrist = { x: frame.left_wrist[0] * w, y: frame.left_wrist[1] * h };
  const rElbow = { x: (rShoulder.x + rWrist.x) / 2 + 8, y: (rShoulder.y + rWrist.y) / 2 + 8 };
  const lElbow = { x: (lShoulder.x + lWrist.x) / 2 - 8, y: (lShoulder.y + lWrist.y) / 2 + 8 };

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Sign language avatar overlay showing ${glossText || "idle"}`}
    >
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>SIGN AVATAR</Text>
        <Text style={styles.glossBadge}>{frame.gloss || glossText || "READY"}</Text>
      </View>

      <Svg width={w} height={h} style={styles.canvas}>
        <Line x1={lShoulder.x} y1={lShoulder.y} x2={rShoulder.x} y2={rShoulder.y} stroke="#14B8A6" strokeWidth={4} />
        <Line x1={neck.x} y1={neck.y} x2={hip.x} y2={hip.y} stroke="#14B8A6" strokeWidth={4} />
        <Line x1={rShoulder.x} y1={rShoulder.y} x2={rElbow.x} y2={rElbow.y} stroke="#34D399" strokeWidth={4} />
        <Line x1={rElbow.x} y1={rElbow.y} x2={rWrist.x} y2={rWrist.y} stroke="#22D3EE" strokeWidth={4} />
        <Line x1={lShoulder.x} y1={lShoulder.y} x2={lElbow.x} y2={lElbow.y} stroke="#34D399" strokeWidth={4} />
        <Line x1={lElbow.x} y1={lElbow.y} x2={lWrist.x} y2={lWrist.y} stroke="#22D3EE" strokeWidth={4} />
        <Circle cx={head.x} cy={head.y} r={14} fill="#2DD4BF" />
        <Circle cx={rWrist.x} cy={rWrist.y} r={7 + frame.right_open * 3} fill="#22D3EE" />
        <Circle cx={lWrist.x} cy={lWrist.y} r={6 + frame.left_open * 3} fill="#34D399" />
      </Svg>

      {nonManual ? (
        <Text style={styles.markers}>
          Brows: {nonManual.eyebrows || "neutral"} • Head: {nonManual.headTilt || "none"}
        </Text>
      ) : null}
      <Text style={styles.caption} numberOfLines={2}>
        {captionText || "Listening for voice-to-sign translation..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(11, 31, 36, 0.92)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#2DD4BF",
    padding: 10,
    width: 196,
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  badge: {
    color: "#5EEAD4",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  glossBadge: {
    color: "#F8FAFC",
    backgroundColor: "#0F766E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: "700",
  },
  canvas: {
    backgroundColor: "#07161A",
    borderRadius: 12,
  },
  markers: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 4,
  },
  caption: {
    color: "#E2E8F0",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    fontWeight: "600",
  },
});

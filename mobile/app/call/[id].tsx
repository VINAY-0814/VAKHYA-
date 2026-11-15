import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Animated,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  RefreshCw,
  PhoneOff,
  Hand,
  Volume2,
} from "lucide-react-native";
import { SignAvatarOverlay } from "../src/components/SignAvatarOverlay";
import { ConsentPermissionModal } from "../src/components/ConsentPermissionModal";
import { apiClient } from "../src/services/api";
import { signalingClient } from "../src/services/signaling";
import { canStartVideoCall, formatCallDuration } from "../src/services/callFilter";
import { PoseKeyframe } from "../src/types";

export default function OngoingCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    remoteName?: string;
    remotePhone?: string;
    remoteUserId?: string;
    consented?: string;
  }>();

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const [consented, setConsented] = useState(params.consented === "true");

  const [isMuted, setIsMuted] = useState(false);
  const [isCamOn, setIsCamOn] = useState(true);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [showAvatarOverlay, setShowAvatarOverlay] = useState(true);
  const [duration, setDuration] = useState(0);

  const [poseFrames, setPoseFrames] = useState<PoseKeyframe[]>([]);
  const [glossText, setGlossText] = useState("HELLO");
  const [captionText, setCaptionText] = useState("Translation pipeline active.");
  const [nonManual, setNonManual] = useState<{ eyebrows?: string; mouth?: string; headTilt?: string }>();

  const pan = useRef(new Animated.ValueXY({ x: 16, y: 90 })).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.extractOffset();
      },
    })
  ).current;

  const callAllowed = canStartVideoCall({
    cameraGranted: Boolean(camPerm?.granted),
    microphoneGranted: Boolean(micPerm?.granted),
    consentAccepted: consented,
  });

  useEffect(() => {
    if (!callAllowed.allowed) return;
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [callAllowed.allowed]);

  useEffect(() => {
    const unsub = signalingClient.subscribe((msg) => {
      if (msg.type === "translation_event") {
        if (msg.poseFrames) setPoseFrames(msg.poseFrames);
        if (msg.glossText) setGlossText(msg.glossText);
        if (msg.captionText) setCaptionText(msg.captionText);
      } else if (msg.type === "call_ended") {
        router.back();
      }
    });
    return () => {
      unsub();
    };
  }, [router]);

  const handleGrantConsent = async () => {
    await requestCamPerm();
    await requestMicPerm();
    setConsented(true);
  };

  const handleTestVoiceToSign = async () => {
    try {
      const res = await apiClient.translateVoiceToSign("Hello doctor please help");
      setPoseFrames(res.pose_frames || []);
      setGlossText(res.gloss_string || "HELLO DOCTOR PLEASE HELP");
      setCaptionText(`Voice → Sign: "${res.recognized_text}"`);
      setNonManual(res.non_manual_markers);
    } catch {
      setGlossText("HELLO DOCTOR PLEASE HELP");
      setCaptionText("Voice → Sign: Hello doctor please help");
    }
  };

  const handleTestSignToVoice = async () => {
    try {
      const samplePose = [
        { t: 0.0, right_wrist: [0.68, 0.34, 0.05], left_wrist: [0.35, 0.72, 0.0], right_open: 1.0, left_open: 0.4, elbow_angle: 45 },
        { t: 0.5, right_wrist: [0.76, 0.24, 0.12], left_wrist: [0.35, 0.72, 0.0], right_open: 1.0, left_open: 0.4, elbow_angle: 75 },
        { t: 1.0, right_wrist: [0.84, 0.28, 0.15], left_wrist: [0.35, 0.72, 0.0], right_open: 1.0, left_open: 0.4, elbow_angle: 90 },
      ];
      const res = await apiClient.translateSignToVoice(samplePose);
      setGlossText(res.recognized_gloss || "HELLO");
      setCaptionText(`Sign → Voice: "${res.text}" (${Math.round((res.confidence || 0.9) * 100)}%)`);
    } catch {
      setCaptionText("Sign → Voice: Hello");
    }
  };

  const handleEndCall = async () => {
    signalingClient.send({
      type: "end_call",
      callId: params.id,
      duration,
      targetUserId: params.remoteUserId ? Number(params.remoteUserId) : undefined,
    });
    await apiClient.updateCall(Number(params.id), { status: "ended", duration }).catch(() => {});
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Remote participant stage */}
      <View style={styles.remoteStage}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.remoteName}>{params.remoteName || "VAKHYA Call"}</Text>
            <Text style={styles.timer}>{formatCallDuration(duration)} • Live Mediasoup SFU</Text>
          </View>
          <View style={styles.visualStatusPill}>
            <Text style={styles.visualStatusText}>{isMuted ? "MIC MUTED" : "AUDIO LIVE"}</Text>
          </View>
        </View>

        <View style={styles.remotePlaceholder}>
          <Text style={styles.remoteInitial}>
            {(params.remoteName || "V")[0].toUpperCase()}
          </Text>
          <Text style={styles.remoteHint}>{params.remotePhone || "1-to-1 Encrypted Video"}</Text>
        </View>

        {/* Sign Avatar Overlay */}
        <View style={styles.avatarAnchor}>
          <SignAvatarOverlay
            visible={showAvatarOverlay}
            poseFrames={poseFrames}
            glossText={glossText}
            captionText={captionText}
            nonManual={nonManual}
          />
        </View>
      </View>

      {/* Draggable local camera preview */}
      <Animated.View
        style={[styles.pipContainer, { transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        {isCamOn && camPerm?.granted ? (
          <CameraView style={styles.pipCamera} facing={facing} />
        ) : (
          <View style={styles.pipOff}>
            <VideoOff color="#94A3B8" size={24} />
            <Text style={styles.pipOffText}>Cam Off</Text>
          </View>
        )}
      </Animated.View>

      {/* Quick Bidirectional Translation Test Triggers */}
      <View style={styles.translateBar}>
        <TouchableOpacity style={styles.txBtn} onPress={handleTestVoiceToSign}>
          <Hand color="#062023" size={16} />
          <Text style={styles.txBtnText}>Voice → Sign</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.txBtn} onPress={handleTestSignToVoice}>
          <Volume2 color="#062023" size={16} />
          <Text style={styles.txBtnText}>Sign → Voice</Text>
        </TouchableOpacity>
      </View>

      {/* Clear Accessible In-Call Controls */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={[styles.ctrlBtn, isMuted && styles.ctrlBtnAlert]}
          onPress={() => setIsMuted((m) => !m)}
          accessibilityLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff color="#FFFFFF" size={22} /> : <Mic color="#F8FAFC" size={22} />}
          <Text style={styles.ctrlLabel}>{isMuted ? "Muted" : "Mic"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, !isCamOn && styles.ctrlBtnAlert]}
          onPress={() => setIsCamOn((c) => !c)}
          accessibilityLabel={isCamOn ? "Turn camera off" : "Turn camera on"}
        >
          {isCamOn ? <Video color="#F8FAFC" size={22} /> : <VideoOff color="#FFFFFF" size={22} />}
          <Text style={styles.ctrlLabel}>{isCamOn ? "Cam On" : "Cam Off"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlBtn}
          onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))}
          accessibilityLabel="Switch front or rear camera"
        >
          <RefreshCw color="#F8FAFC" size={22} />
          <Text style={styles.ctrlLabel}>Flip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, showAvatarOverlay && styles.ctrlBtnActive]}
          onPress={() => setShowAvatarOverlay((v) => !v)}
          accessibilityLabel="Toggle Sign Avatar overlay"
        >
          <Hand color={showAvatarOverlay ? "#062023" : "#F8FAFC"} size={22} />
          <Text style={[styles.ctrlLabel, showAvatarOverlay && { color: "#062023" }]}>Avatar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, styles.endBtn]}
          onPress={handleEndCall}
          accessibilityLabel="End video call"
        >
          <PhoneOff color="#FFFFFF" size={22} />
          <Text style={styles.ctrlLabel}>End</Text>
        </TouchableOpacity>
      </View>

      <ConsentPermissionModal
        visible={!callAllowed.allowed}
        cameraGranted={Boolean(camPerm?.granted)}
        microphoneGranted={Boolean(micPerm?.granted)}
        onRequestPermissionsAndConsent={handleGrantConsent}
        onCancel={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07161A" },
  remoteStage: { flex: 1, justifyContent: "space-between", padding: 16, paddingTop: 42 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(15, 41, 48, 0.9)",
    padding: 12,
    borderRadius: 14,
  },
  remoteName: { color: "#F8FAFC", fontSize: 17, fontWeight: "800" },
  timer: { color: "#5EEAD4", fontSize: 13, fontWeight: "700", marginTop: 2 },
  visualStatusPill: {
    backgroundColor: "#12343D",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  visualStatusText: { color: "#2DD4BF", fontSize: 11, fontWeight: "800" },
  remotePlaceholder: { alignItems: "center", gap: 8 },
  remoteInitial: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#0F2930",
    color: "#2DD4BF",
    fontSize: 42,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 96,
    overflow: "hidden",
  },
  remoteHint: { color: "#94A3B8", fontSize: 14, fontWeight: "600" },
  avatarAnchor: { alignSelf: "flex-end", marginBottom: 8 },
  pipContainer: {
    position: "absolute",
    width: 116,
    height: 158,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#2DD4BF",
    backgroundColor: "#0F2930",
  },
  pipCamera: { flex: 1 },
  pipOff: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  pipOffText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  translateBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
    backgroundColor: "#0B1F24",
  },
  txBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#5EEAD4",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  txBtnText: { color: "#062023", fontWeight: "800", fontSize: 13 },
  controlsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#0F2930",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#1E4E5A",
  },
  ctrlBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#12343D",
    width: 60,
    height: 60,
    borderRadius: 16,
    gap: 4,
  },
  ctrlBtnActive: { backgroundColor: "#2DD4BF" },
  ctrlBtnAlert: { backgroundColor: "#B45309" },
  endBtn: { backgroundColor: "#DC2626" },
  ctrlLabel: { color: "#F8FAFC", fontSize: 10, fontWeight: "700" },
});

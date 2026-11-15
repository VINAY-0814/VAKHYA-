import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Phone, PhoneOff, BellOff } from "lucide-react-native";
import { signalingClient } from "../src/services/signaling";
import { apiClient } from "../src/services/api";

export default function IncomingCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    callId?: string;
    callerId?: string;
    callerName?: string;
    callerPhone?: string;
    callerType?: string;
  }>();

  const [flashOn, setFlashOn] = useState(true);

  // Deaf-accessible visual ring strobe + haptic feedback instead of audio-only ringtone
  useEffect(() => {
    const id = setInterval(() => {
      setFlashOn((prev) => !prev);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }, 650);
    return () => clearInterval(id);
  }, []);

  const handleAccept = () => {
    signalingClient.send({
      type: "answer_call",
      callId: params.callId,
      targetUserId: params.callerId ? Number(params.callerId) : undefined,
    });
    router.replace({
      pathname: "/call/[id]",
      params: {
        id: String(params.callId || Date.now()),
        remoteName: params.callerName || "VAKHYA Caller",
        remotePhone: params.callerPhone || "",
        remoteUserId: params.callerId || "",
        isIncoming: "true",
      },
    });
  };

  const handleReject = async () => {
    signalingClient.send({
      type: "reject_call",
      callId: params.callId,
      targetUserId: params.callerId ? Number(params.callerId) : undefined,
    });
    if (params.callId) {
      await apiClient.updateCall(Number(params.callId), { status: "rejected" }).catch(() => {});
    }
    router.back();
  };

  const handleIgnore = async () => {
    signalingClient.send({
      type: "ignore_call",
      callId: params.callId,
      targetUserId: params.callerId ? Number(params.callerId) : undefined,
    });
    if (params.callId) {
      await apiClient.updateCall(Number(params.callId), { status: "missed" }).catch(() => {});
    }
    router.back();
  };

  return (
    <View style={[styles.container, flashOn && styles.flashBorder]}>
      <View style={styles.topBadge}>
        <Text style={styles.badgeText}>INCOMING ACCESSIBLE VIDEO CALL</Text>
      </View>

      <View style={styles.center}>
        <View style={[styles.pulseRing, flashOn && styles.pulseRingActive]}>
          <Image source={require("../assets/logo.png")} style={styles.avatar} />
        </View>
        <Text style={styles.callerName}>{params.callerName || "VAKHYA Caller"}</Text>
        <Text style={styles.callerMeta}>
          {params.callerPhone || ""} •{" "}
          {params.callerType === "deaf" ? "Sign Language Profile" : "Voice Profile"}
        </Text>
        <Text style={styles.visualCue}>Visual Ring Active • Vibration Enabled</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={handleReject}
          accessibilityRole="button"
          accessibilityLabel="Reject incoming call"
        >
          <PhoneOff color="#FFFFFF" size={26} />
          <Text style={styles.actionLabel}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.ignoreBtn]}
          onPress={handleIgnore}
          accessibilityRole="button"
          accessibilityLabel="Ignore incoming call"
        >
          <BellOff color="#E2E8F0" size={24} />
          <Text style={styles.actionLabel}>Ignore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={handleAccept}
          accessibilityRole="button"
          accessibilityLabel="Accept incoming video call"
        >
          <Phone color="#062023" size={26} />
          <Text style={[styles.actionLabel, { color: "#062023" }]}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1F24",
    justifyContent: "space-between",
    padding: 24,
    borderWidth: 4,
    borderColor: "#0B1F24",
  },
  flashBorder: { borderColor: "#2DD4BF" },
  topBadge: {
    alignSelf: "center",
    marginTop: 32,
    backgroundColor: "rgba(45, 212, 191, 0.16)",
    borderWidth: 1,
    borderColor: "#2DD4BF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  badgeText: { color: "#5EEAD4", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  center: { alignItems: "center", gap: 10 },
  pulseRing: {
    padding: 12,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#1E4E5A",
  },
  pulseRingActive: { borderColor: "#25D366", backgroundColor: "rgba(37, 211, 102, 0.12)" },
  avatar: { width: 96, height: 96, borderRadius: 24 },
  callerName: { color: "#F8FAFC", fontSize: 28, fontWeight: "800", marginTop: 8 },
  callerMeta: { color: "#CBD5E1", fontSize: 15, fontWeight: "600" },
  visualCue: { color: "#5EEAD4", fontSize: 13, fontWeight: "700", marginTop: 4 },
  actionsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 24 },
  actionBtn: {
    width: 92,
    height: 92,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rejectBtn: { backgroundColor: "#DC2626" },
  ignoreBtn: { backgroundColor: "#1E3E47" },
  acceptBtn: { backgroundColor: "#25D366" },
  actionLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});

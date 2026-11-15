import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ShieldCheck, Camera, Mic } from "lucide-react-native";

interface ConsentPermissionModalProps {
  visible: boolean;
  cameraGranted: boolean;
  microphoneGranted: boolean;
  onRequestPermissionsAndConsent: () => void;
  onCancel: () => void;
}

export function ConsentPermissionModal({
  visible,
  cameraGranted,
  microphoneGranted,
  onRequestPermissionsAndConsent,
  onCancel,
}: ConsentPermissionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessible accessibilityLabel="Camera and Microphone Consent">
          <View style={styles.iconBadge}>
            <ShieldCheck color="#2DD4BF" size={30} />
          </View>
          <Text style={styles.title}>Permissions & Call Consent Required</Text>
          <Text style={styles.desc}>
            Before starting a 1-to-1 video call, VAKHYA requires your camera and microphone permissions
            and your consent to route live audio/video streams through the translation pipeline.
          </Text>

          <View style={styles.statusRow}>
            <Camera color={cameraGranted ? "#25D366" : "#F59E0B"} size={20} />
            <Text style={styles.statusText}>
              Camera Access: {cameraGranted ? "Granted" : "Required"}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Mic color={microphoneGranted ? "#25D366" : "#F59E0B"} size={20} />
            <Text style={styles.statusText}>
              Microphone Access: {microphoneGranted ? "Granted" : "Required"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={onRequestPermissionsAndConsent}
            accessibilityRole="button"
            accessibilityLabel="Grant Camera and Microphone Permissions and Consent to Start Call"
          >
            <Text style={styles.acceptText}>Allow & Consent to Start Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel Call"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    backgroundColor: "#0F2930",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E4E5A",
    padding: 22,
    gap: 12,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(45, 212, 191, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  desc: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0B1F24",
    padding: 12,
    borderRadius: 12,
  },
  statusText: {
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "600",
  },
  acceptBtn: {
    backgroundColor: "#14B8A6",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  acceptText: {
    color: "#062023",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "600",
  },
});

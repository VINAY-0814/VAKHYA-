import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Hand, Video, ShieldCheck } from "lucide-react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          accessibilityLabel="VAKHYA logo"
        />
        <Text style={styles.title}>VAKHYA</Text>
        <Text style={styles.tagline}>Breaking Silence with AI</Text>
        <Text style={styles.description}>
          Inclusive 1-to-1 video calling with live bidirectional Voice-to-Sign avatar and Sign-to-Voice speech translation.
        </Text>
      </View>

      <View style={styles.highlights}>
        <View style={styles.highlightRow}>
          <Hand color="#2DD4BF" size={22} />
          <Text style={styles.highlightText}>Sign-to-Voice 3D-CNN & Speech Synthesis</Text>
        </View>
        <View style={styles.highlightRow}>
          <Video color="#38BDF8" size={22} />
          <Text style={styles.highlightText}>Voice-to-Sign Gloss & Avatar Overlay</Text>
        </View>
        <View style={styles.highlightRow}>
          <ShieldCheck color="#34D399" size={22} />
          <Text style={styles.highlightText}>Visual Alerts & Consent-First Calling</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Log in to your VAKHYA account"
        >
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push("/(auth)/register")}
          accessibilityRole="button"
          accessibilityLabel="Create a new VAKHYA account"
        >
          <Text style={styles.secondaryBtnText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1F24",
    padding: 24,
    justifyContent: "space-between",
  },
  hero: {
    alignItems: "center",
    marginTop: 48,
    gap: 10,
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 28,
    marginBottom: 8,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 2,
  },
  tagline: {
    color: "#5EEAD4",
    fontSize: 16,
    fontWeight: "700",
  },
  description: {
    color: "#CBD5E1",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 6,
  },
  highlights: {
    gap: 12,
    backgroundColor: "#0F2930",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1E4E5A",
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  highlightText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  actions: {
    gap: 12,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: "#14B8A6",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#062023",
    fontSize: 17,
    fontWeight: "800",
  },
  secondaryBtn: {
    backgroundColor: "#0F2930",
    borderWidth: 1.5,
    borderColor: "#2DD4BF",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#5EEAD4",
    fontSize: 16,
    fontWeight: "700",
  },
});

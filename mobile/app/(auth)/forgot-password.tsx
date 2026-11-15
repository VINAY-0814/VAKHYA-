import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { apiClient } from "../../src/services/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleRequestOtp = async () => {
    setError("");
    setStatus("");
    try {
      const res = await apiClient.forgotPassword(email.trim());
      setStatus(res.devOtp ? `OTP sent (dev code: ${res.devOtp})` : res.message);
      setStep("verify");
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP.");
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    try {
      await apiClient.verifyOtp(email.trim(), otp.trim());
      setStatus("OTP verified! Set your new password below.");
      setStep("reset");
    } catch (err: any) {
      setError(err?.message || "Invalid OTP.");
    }
  };

  const handleResetPassword = async () => {
    setError("");
    try {
      await apiClient.resetPassword(email.trim(), otp.trim(), newPassword);
      setStatus("Password updated! Returning to login...");
      setTimeout(() => router.replace("/(auth)/login"), 1200);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTP Password Recovery</Text>
      <Text style={styles.subtitle}>
        {step === "request"
          ? "Enter your registered email to receive a 6-digit OTP."
          : step === "verify"
          ? "Enter the 6-digit OTP sent to your email."
          : "Choose a new password (min 6 characters)."}
      </Text>

      {error ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {status ? (
        <View style={styles.infoBanner} accessibilityLiveRegion="polite">
          <Text style={styles.infoText}>{status}</Text>
        </View>
      ) : null}

      {step === "request" && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Registered Email"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRequestOtp}>
            <Text style={styles.primaryBtnText}>Send Recovery OTP</Text>
          </TouchableOpacity>
        </>
      )}

      {step === "verify" && (
        <>
          <TextInput
            style={styles.input}
            placeholder="6-Digit OTP"
            placeholderTextColor="#64748B"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOtp}>
            <Text style={styles.primaryBtnText}>Verify OTP</Text>
          </TouchableOpacity>
        </>
      )}

      {step === "reset" && (
        <>
          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPassword}>
            <Text style={styles.primaryBtnText}>Reset Password</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1F24", padding: 24, justifyContent: "center", gap: 14 },
  title: { color: "#F8FAFC", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#CBD5E1", fontSize: 14 },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    borderWidth: 1,
    borderColor: "#EF4444",
    padding: 12,
    borderRadius: 12,
  },
  errorText: { color: "#FCA5A5", fontWeight: "600" },
  infoBanner: {
    backgroundColor: "rgba(45, 212, 191, 0.14)",
    borderWidth: 1,
    borderColor: "#2DD4BF",
    padding: 12,
    borderRadius: 12,
  },
  infoText: { color: "#5EEAD4", fontWeight: "600" },
  input: {
    backgroundColor: "#0F2930",
    borderWidth: 1,
    borderColor: "#1E4E5A",
    borderRadius: 12,
    padding: 14,
    color: "#F8FAFC",
    fontSize: 16,
  },
  primaryBtn: { backgroundColor: "#14B8A6", paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  primaryBtnText: { color: "#062023", fontSize: 16, fontWeight: "800" },
  backBtn: { alignItems: "center", marginTop: 8 },
  backText: { color: "#94A3B8", fontWeight: "600" },
});

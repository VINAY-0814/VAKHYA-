import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { apiClient } from "../../src/services/api";
import { useAuth } from "../../src/context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter both your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.login(email.trim(), password);
      await setSession(res.user, res.accessToken, res.refreshToken);
      router.replace("/(tabs)/calls");
    } catch (err: any) {
      setError(err?.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require("../../assets/logo.png")} style={styles.logo} />
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to VAKHYA</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="#64748B"
          accessibilityLabel="Email Address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter password"
          placeholderTextColor="#64748B"
          accessibilityLabel="Password"
        />

        <TouchableOpacity
          onPress={() => router.push("/(auth)/forgot-password")}
          accessibilityRole="button"
          accessibilityLabel="Forgot password? Recover with OTP"
        >
          <Text style={styles.forgotLink}>Forgot Password? Recover via OTP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleLogin}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Sign In"
        >
          {submitting ? (
            <ActivityIndicator color="#062023" />
          ) : (
            <Text style={styles.primaryBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerLink}
          onPress={() => router.replace("/(auth)/register")}
        >
          <Text style={styles.footerText}>New to VAKHYA? Create an Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1F24", padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 28, gap: 6 },
  logo: { width: 64, height: 64, borderRadius: 16, marginBottom: 6 },
  title: { color: "#F8FAFC", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#5EEAD4", fontSize: 15, fontWeight: "600" },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    borderWidth: 1,
    borderColor: "#EF4444",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: { color: "#FCA5A5", fontSize: 14, fontWeight: "600" },
  form: { gap: 12 },
  label: { color: "#CBD5E1", fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: "#0F2930",
    borderWidth: 1,
    borderColor: "#1E4E5A",
    borderRadius: 12,
    padding: 14,
    color: "#F8FAFC",
    fontSize: 16,
  },
  forgotLink: { color: "#2DD4BF", fontSize: 14, fontWeight: "600", textAlign: "right", marginTop: 4 },
  primaryBtn: {
    backgroundColor: "#14B8A6",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#062023", fontSize: 16, fontWeight: "800" },
  footerLink: { marginTop: 12, alignItems: "center" },
  footerText: { color: "#94A3B8", fontSize: 14, fontWeight: "600" },
});

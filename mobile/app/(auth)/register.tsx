import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { apiClient } from "../../src/services/api";
import { useAuth } from "../../src/context/AuthContext";

export default function RegisterScreen() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"deaf" | "hearing">("deaf");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    setError("");
    if (!firstName.trim() || !email.trim() || !phone.trim() || password.length < 6) {
      setError("Complete all required fields (password must be at least 6 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        userType,
      });
      await setSession(res.user, res.accessToken, res.refreshToken);
      router.replace("/(tabs)/calls");
    } catch (err: any) {
      setError(err?.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Choose your primary communication profile</Text>

      {error ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeCard, userType === "deaf" && styles.typeCardActive]}
          onPress={() => setUserType("deaf")}
          accessibilityRole="radio"
          accessibilityState={{ selected: userType === "deaf" }}
        >
          <Text style={styles.typeTitle}>Deaf / Sign User</Text>
          <Text style={styles.typeDesc}>Sign-to-Voice & Avatar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeCard, userType === "hearing" && styles.typeCardActive]}
          onPress={() => setUserType("hearing")}
          accessibilityRole="radio"
          accessibilityState={{ selected: userType === "hearing" }}
        >
          <Text style={styles.typeTitle}>Hearing User</Text>
          <Text style={styles.typeDesc}>Voice-to-Sign & Speech</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="First Name *"
        placeholderTextColor="#64748B"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        placeholderTextColor="#64748B"
        value={lastName}
        onChangeText={setLastName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email Address *"
        placeholderTextColor="#64748B"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number (e.g. +919876543210) *"
        placeholderTextColor="#64748B"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 chars) *"
        placeholderTextColor="#64748B"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={handleRegister}
        disabled={submitting}
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator color="#062023" />
        ) : (
          <Text style={styles.primaryBtnText}>Register & Continue</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.footerLink}>
        <Text style={styles.footerText}>Already registered? Sign In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#0B1F24", padding: 24, justifyContent: "center", gap: 12 },
  title: { color: "#F8FAFC", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#5EEAD4", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    borderWidth: 1,
    borderColor: "#EF4444",
    padding: 12,
    borderRadius: 12,
  },
  errorText: { color: "#FCA5A5", fontSize: 14, fontWeight: "600" },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  typeCard: {
    flex: 1,
    backgroundColor: "#0F2930",
    borderWidth: 1.5,
    borderColor: "#1E4E5A",
    borderRadius: 14,
    padding: 12,
  },
  typeCardActive: { borderColor: "#2DD4BF", backgroundColor: "#123840" },
  typeTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "700" },
  typeDesc: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  input: {
    backgroundColor: "#0F2930",
    borderWidth: 1,
    borderColor: "#1E4E5A",
    borderRadius: 12,
    padding: 14,
    color: "#F8FAFC",
    fontSize: 16,
  },
  primaryBtn: {
    backgroundColor: "#14B8A6",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: { color: "#062023", fontSize: 16, fontWeight: "800" },
  footerLink: { marginTop: 8, alignItems: "center" },
  footerText: { color: "#94A3B8", fontSize: 14, fontWeight: "600" },
});

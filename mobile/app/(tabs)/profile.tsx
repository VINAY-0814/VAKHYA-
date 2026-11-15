import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { BrandHeader } from "../../src/components/BrandHeader";
import { useAuth } from "../../src/context/AuthContext";
import { apiClient } from "../../src/services/api";
import { registerFcmDeviceToken } from "../../src/services/notifications";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshUser, signOut } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [statusMsg, setStatusMsg] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!user) return null;

  const handleSaveProfile = async () => {
    setStatusMsg("");
    await apiClient.updateProfile({ firstName, lastName, phone });
    await refreshUser();
    setStatusMsg("Profile saved.");
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    await apiClient.updatePreferences({ notificationsEnabled: enabled });
    if (enabled) {
      await registerFcmDeviceToken();
    }
    await refreshUser();
  };

  const handleToggleTranslation = async (enabled: boolean) => {
    await apiClient.updatePreferences({ translationEnabled: enabled });
    await refreshUser();
  };

  const handleLanguageChange = async (lang: "ASL" | "ISL") => {
    await apiClient.updatePreferences({ preferredSignLanguage: lang });
    await refreshUser();
  };

  const handleChangePassword = async () => {
    if (!currentPw || newPw.length < 6) {
      setStatusMsg("Enter current password and a new password (6+ chars).");
      return;
    }
    await apiClient.changePassword(currentPw, newPw);
    setCurrentPw("");
    setNewPw("");
    setStatusMsg("Password updated successfully.");
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/welcome");
  };

  const handleDeleteAccount = async () => {
    await apiClient.deleteAccount();
    await signOut();
    router.replace("/(auth)/welcome");
  };

  return (
    <View style={styles.container}>
      <BrandHeader
        title="Profile & Settings"
        subtitle={`${user.userType === "deaf" ? "Deaf / Sign User" : "Hearing User"} • ${user.email}`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {statusMsg ? (
          <View style={styles.statusBanner} accessibilityLiveRegion="polite">
            <Text style={styles.statusText}>{statusMsg}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First Name" placeholderTextColor="#64748B" />
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last Name" placeholderTextColor="#64748B" />
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor="#64748B" />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveProfile}>
            <Text style={styles.primaryBtnText}>Save Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility & Notifications</Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>In-Call Sign Translation</Text>
              <Text style={styles.toggleDesc}>Enable live Voice-to-Sign avatar & Sign-to-Voice speech</Text>
            </View>
            <Switch
              value={user.translationEnabled}
              onValueChange={handleToggleTranslation}
              trackColor={{ true: "#14B8A6", false: "#334155" }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Incoming Call Push Alerts (FCM)</Text>
              <Text style={styles.toggleDesc}>Receive full-screen Notifee alerts when backgrounded</Text>
            </View>
            <Switch
              value={user.notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ true: "#14B8A6", false: "#334155" }}
            />
          </View>

          <View style={styles.langRow}>
            {(["ASL", "ISL"] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langBtn, user.preferredSignLanguage === lang && styles.langBtnActive]}
                onPress={() => handleLanguageChange(lang)}
              >
                <Text
                  style={[
                    styles.langText,
                    user.preferredSignLanguage === lang && styles.langTextActive,
                  ]}
                >
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={currentPw}
            onChangeText={setCurrentPw}
            placeholder="Current Password"
            placeholderTextColor="#64748B"
          />
          <TextInput
            style={styles.input}
            secureTextEntry
            value={newPw}
            onChangeText={setNewPw}
            placeholder="New Password (6+ chars)"
            placeholderTextColor="#64748B"
          />
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleChangePassword}>
            <Text style={styles.secondaryBtnText}>Update Password</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {!confirmDelete ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setConfirmDelete(true)}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.deleteConfirmBtn} onPress={handleDeleteAccount}>
            <Text style={styles.deleteConfirmText}>Confirm Permanent Account Deletion</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1F24" },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  statusBanner: {
    backgroundColor: "rgba(45, 212, 191, 0.14)",
    borderColor: "#2DD4BF",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
  statusText: { color: "#5EEAD4", fontWeight: "700" },
  section: {
    backgroundColor: "#0F2930",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E4E5A",
    padding: 16,
    gap: 10,
  },
  sectionTitle: { color: "#F8FAFC", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  input: {
    backgroundColor: "#0B1F24",
    borderWidth: 1,
    borderColor: "#1E4E5A",
    borderRadius: 12,
    padding: 12,
    color: "#F8FAFC",
    fontSize: 15,
  },
  primaryBtn: { backgroundColor: "#14B8A6", paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  primaryBtnText: { color: "#062023", fontWeight: "800", fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#2DD4BF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#5EEAD4", fontWeight: "700", fontSize: 15 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  toggleLabel: { color: "#F8FAFC", fontSize: 14, fontWeight: "700" },
  toggleDesc: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  langRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E4E5A",
    alignItems: "center",
  },
  langBtnActive: { backgroundColor: "#14B8A6", borderColor: "#2DD4BF" },
  langText: { color: "#CBD5E1", fontWeight: "700" },
  langTextActive: { color: "#062023" },
  logoutBtn: {
    backgroundColor: "#12343D",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "#F8FAFC", fontWeight: "700", fontSize: 15 },
  deleteBtn: { alignItems: "center", paddingVertical: 10 },
  deleteText: { color: "#F87171", fontWeight: "700" },
  deleteConfirmBtn: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteConfirmText: { color: "#FFFFFF", fontWeight: "800" },
});

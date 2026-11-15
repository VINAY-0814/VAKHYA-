import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { Search, UserPlus, Edit3, Trash2, Video } from "lucide-react-native";
import { BrandHeader } from "../../src/components/BrandHeader";
import { ConsentPermissionModal } from "../../src/components/ConsentPermissionModal";
import { apiClient } from "../../src/services/api";
import { canStartVideoCall } from "../../src/services/callFilter";
import { Contact } from "../../src/types";

export default function ContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const [consentOpen, setConsentOpen] = useState(false);
  const [callTarget, setCallTarget] = useState<Contact | null>(null);

  const loadContacts = useCallback(async () => {
    try {
      const res = await apiClient.getContacts(search.trim() || undefined);
      setContacts(res.contacts || []);
    } catch (err) {
      console.warn("[VAKHYA Contacts] Load warning:", err);
    }
  }, [search]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const openCreate = () => {
    setEditing(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setModalOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setFirstName(contact.firstName);
    setLastName(contact.lastName);
    setPhone(contact.phone);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!firstName.trim() || phone.trim().length < 7) return;
    if (editing) {
      await apiClient.updateContact(editing.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
    } else {
      await apiClient.createContact({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
    }
    setModalOpen(false);
    loadContacts();
  };

  const handleDelete = async (id: number) => {
    await apiClient.deleteContact(id);
    loadContacts();
  };

  const handleStartCall = async () => {
    const cam = camPerm?.granted ? camPerm : await requestCamPerm();
    const mic = micPerm?.granted ? micPerm : await requestMicPerm();
    const check = canStartVideoCall({
      cameraGranted: Boolean(cam?.granted),
      microphoneGranted: Boolean(mic?.granted),
      consentAccepted: true,
    });
    if (!check.allowed || !callTarget) return;

    setConsentOpen(false);
    const created = await apiClient.initiateCall({
      phone: callTarget.phone,
      contactId: callTarget.id,
    });
    router.push({
      pathname: "/call/[id]",
      params: {
        id: String(created.call.id),
        remoteName: `${callTarget.firstName} ${callTarget.lastName}`.trim(),
        remotePhone: callTarget.phone,
        remoteUserId: String(created.calleeUserId || ""),
        consented: "true",
      },
    });
  };

  return (
    <View style={styles.container}>
      <BrandHeader
        title="Contacts"
        subtitle="Manage & Call Contacts"
        rightSlot={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={openCreate}
            accessibilityLabel="Add new contact"
            accessibilityRole="button"
          >
            <UserPlus color="#062023" size={18} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.searchBar}>
        <Search color="#94A3B8" size={18} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No contacts yet. Tap Add to create one.</Text>
        }
        renderItem={({ item }) => {
          const fullName = `${item.firstName} ${item.lastName}`.trim();
          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{fullName}</Text>
                <Text style={styles.phone}>{item.phone}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => {
                    setCallTarget(item);
                    setConsentOpen(true);
                  }}
                  accessibilityLabel={`Call ${fullName}`}
                >
                  <Video color="#062023" size={18} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconAction}
                  onPress={() => openEdit(item)}
                  accessibilityLabel={`Edit ${fullName}`}
                >
                  <Edit3 color="#CBD5E1" size={18} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconAction}
                  onPress={() => handleDelete(item.id)}
                  accessibilityLabel={`Delete ${fullName}`}
                >
                  <Trash2 color="#F87171" size={18} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? "Edit Contact" : "New Contact"}</Text>
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
              placeholder="Phone Number *"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConsentPermissionModal
        visible={consentOpen}
        cameraGranted={Boolean(camPerm?.granted)}
        microphoneGranted={Boolean(micPerm?.granted)}
        onRequestPermissionsAndConsent={handleStartCall}
        onCancel={() => {
          setConsentOpen(false);
          setCallTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1F24" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2DD4BF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: "#062023", fontWeight: "800", fontSize: 13 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F2930",
    margin: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E4E5A",
  },
  searchInput: { flex: 1, color: "#F8FAFC", paddingVertical: 11, fontSize: 15 },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 32 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F2930",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E4E5A",
  },
  name: { color: "#F8FAFC", fontSize: 16, fontWeight: "700" },
  phone: { color: "#94A3B8", fontSize: 13, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  callBtn: { backgroundColor: "#14B8A6", padding: 10, borderRadius: 10 },
  iconAction: { backgroundColor: "#07161A", padding: 10, borderRadius: 10 },
  emptyText: { color: "#94A3B8", textAlign: "center", marginTop: 40, fontSize: 15 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#0F2930", borderRadius: 18, padding: 20, gap: 12 },
  modalTitle: { color: "#F8FAFC", fontSize: 19, fontWeight: "800" },
  input: {
    backgroundColor: "#0B1F24",
    borderWidth: 1,
    borderColor: "#1E4E5A",
    borderRadius: 12,
    padding: 13,
    color: "#F8FAFC",
    fontSize: 15,
  },
  saveBtn: { backgroundColor: "#14B8A6", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#062023", fontWeight: "800", fontSize: 15 },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelText: { color: "#94A3B8", fontWeight: "600" },
});

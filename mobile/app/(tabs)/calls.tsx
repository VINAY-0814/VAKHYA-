import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import {
  Video,
  Search,
  Trash2,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
  CheckSquare,
  Square,
  MoreVertical,
} from "lucide-react-native";
import { BrandHeader } from "../../src/components/BrandHeader";
import { ConsentPermissionModal } from "../../src/components/ConsentPermissionModal";
import { apiClient } from "../../src/services/api";
import {
  CallFilterCategory,
  canStartVideoCall,
  filterAndSearchCalls,
  formatCallDuration,
} from "../../src/services/callFilter";
import { CallRecord, Contact } from "../../src/types";

const CATEGORIES: Array<{ id: CallFilterCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Outgoing" },
  { id: "missed", label: "Missed" },
];

export default function CallsScreen() {
  const router = useRouter();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [category, setCategory] = useState<CallFilterCategory>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Options menu & selective delete state
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // New call contact picker bottom sheet
  const [pickerOpen, setPickerOpen] = useState(false);

  // Camera/Microphone permission & consent state
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<{
    phone: string;
    name: string;
    contactId?: number | null;
  } | null>(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [callsRes, contactsRes] = await Promise.all([
        apiClient.getCalls("all"),
        apiClient.getContacts(),
      ]);
      setCalls(callsRes.calls || []);
      setContacts(contactsRes.contacts || []);
    } catch (err) {
      console.warn("[VAKHYA Calls] Load warning:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startCallWithConsentCheck = async (target: {
    phone: string;
    name: string;
    contactId?: number | null;
  }) => {
    const check = canStartVideoCall({
      cameraGranted: Boolean(camPerm?.granted),
      microphoneGranted: Boolean(micPerm?.granted),
      consentAccepted: false,
    });
    if (!check.allowed) {
      setPendingTarget(target);
      setConsentModalOpen(true);
    }
  };

  const handleGrantAndCall = async () => {
    const cam = camPerm?.granted ? camPerm : await requestCamPerm();
    const mic = micPerm?.granted ? micPerm : await requestMicPerm();
    const check = canStartVideoCall({
      cameraGranted: Boolean(cam?.granted),
      microphoneGranted: Boolean(mic?.granted),
      consentAccepted: true,
    });
    if (!check.allowed || !pendingTarget) return;

    setConsentModalOpen(false);
    setPickerOpen(false);
    try {
      const created = await apiClient.initiateCall({
        phone: pendingTarget.phone,
        contactId: pendingTarget.contactId ?? null,
      });
      router.push({
        pathname: "/call/[id]",
        params: {
          id: String(created.call.id),
          remoteName: pendingTarget.name,
          remotePhone: pendingTarget.phone,
          remoteUserId: String(created.calleeUserId || ""),
          consented: "true",
        },
      });
    } catch (err) {
      console.warn("[VAKHYA Calls] Failed to initiate call:", err);
    }
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    await apiClient.deleteCalls(selectedIds);
    setSelectMode(false);
    setSelectedIds([]);
    loadData();
  };

  const handleClearAll = async () => {
    setMenuOpen(false);
    await apiClient.deleteCalls();
    loadData();
  };

  const visibleCalls = filterAndSearchCalls(calls, category, search);

  const renderCallIcon = (item: CallRecord) => {
    if (item.status === "missed") return <PhoneMissed color="#F87171" size={20} />;
    if (item.type === "incoming") return <PhoneIncoming color="#38BDF8" size={20} />;
    return <PhoneOutgoing color="#34D399" size={20} />;
  };

  return (
    <View style={styles.container}>
      <BrandHeader
        title="Calls"
        subtitle="1-to-1 Sign & Voice Video Calls"
        rightSlot={
          <TouchableOpacity
            onPress={() => setMenuOpen((v) => !v)}
            accessibilityLabel="Call history options menu"
            accessibilityRole="button"
            style={styles.iconBtn}
          >
            <MoreVertical color="#F8FAFC" size={22} />
          </TouchableOpacity>
        }
      />

      {menuOpen ? (
        <View style={styles.optionsMenu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              setSelectMode((v) => !v);
              setSelectedIds([]);
            }}
          >
            <Text style={styles.menuText}>
              {selectMode ? "Cancel Multi-Select" : "Select Entries to Delete"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleClearAll}>
            <Text style={[styles.menuText, { color: "#F87171" }]}>Clear All Call History</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.searchBar}>
        <Search color="#94A3B8" size={18} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search calls by contact or number..."
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search call history"
        />
      </View>

      <View style={styles.filterRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.filterBtn, category === cat.id && styles.filterBtnActive]}
            onPress={() => setCategory(cat.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: category === cat.id }}
          >
            <Text style={[styles.filterText, category === cat.id && styles.filterTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectMode && selectedIds.length > 0 ? (
        <TouchableOpacity style={styles.bulkDeleteBar} onPress={handleDeleteSelected}>
          <Trash2 color="#FCA5A5" size={18} />
          <Text style={styles.bulkDeleteText}>Delete Selected ({selectedIds.length})</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={visibleCalls}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#2DD4BF" />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No Call Records</Text>
            <Text style={styles.emptySubtitle}>
              Tap the Start Video Call button below to call a contact with live AI translation.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const displayName = item.contactName || item.phone;
          const isSelected = selectedIds.includes(item.id);
          return (
            <View style={styles.callRow}>
              {selectMode ? (
                <TouchableOpacity onPress={() => toggleSelectId(item.id)} style={{ marginRight: 10 }}>
                  {isSelected ? <CheckSquare color="#2DD4BF" size={22} /> : <Square color="#64748B" size={22} />}
                </TouchableOpacity>
              ) : null}

              <View style={styles.callIconWrap}>{renderCallIcon(item)}</View>

              <View style={styles.callInfo}>
                <Text style={styles.callerName}>{displayName}</Text>
                <Text style={styles.callMeta}>
                  {item.type.toUpperCase()} • {item.status.toUpperCase()} •{" "}
                  {item.duration > 0 ? formatCallDuration(item.duration) : "--"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.callActionBtn}
                onPress={() =>
                  startCallWithConsentCheck({
                    phone: item.phone,
                    name: displayName,
                    contactId: item.contactId,
                  })
                }
                accessibilityLabel={`Start video call with ${displayName}`}
                accessibilityRole="button"
              >
                <Video color="#062023" size={18} />
                <Text style={styles.callActionLabel}>Call</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Floating Action Button for New Call */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setPickerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Start a new video call"
      >
        <Plus color="#062023" size={24} />
        <Text style={styles.fabText}>New Call</Text>
      </TouchableOpacity>

      {/* Contact Picker Bottom Sheet */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Contact to Call</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={contacts}
              keyExtractor={(c) => String(c.id)}
              ListEmptyComponent={
                <Text style={styles.emptySubtitle}>Add contacts in the Contacts tab first.</Text>
              }
              renderItem={({ item }) => {
                const name = `${item.firstName} ${item.lastName}`.trim();
                return (
                  <TouchableOpacity
                    style={styles.pickerRow}
                    onPress={() =>
                      startCallWithConsentCheck({
                        phone: item.phone,
                        name,
                        contactId: item.id,
                      })
                    }
                  >
                    <View>
                      <Text style={styles.callerName}>{name}</Text>
                      <Text style={styles.callMeta}>{item.phone}</Text>
                    </View>
                    <Video color="#2DD4BF" size={22} />
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <ConsentPermissionModal
        visible={consentModalOpen}
        cameraGranted={Boolean(camPerm?.granted)}
        microphoneGranted={Boolean(micPerm?.granted)}
        onRequestPermissionsAndConsent={handleGrantAndCall}
        onCancel={() => {
          setConsentModalOpen(false);
          setPendingTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1F24" },
  iconBtn: { padding: 6 },
  optionsMenu: {
    position: "absolute",
    top: 64,
    right: 16,
    zIndex: 30,
    backgroundColor: "#12343D",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E4E5A",
    paddingVertical: 6,
    width: 220,
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 10 },
  menuText: { color: "#F8FAFC", fontSize: 14, fontWeight: "600" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F2930",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E4E5A",
  },
  searchInput: { flex: 1, color: "#F8FAFC", paddingVertical: 11, fontSize: 15 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 6 },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#0F2930",
    borderWidth: 1,
    borderColor: "#1E4E5A",
  },
  filterBtnActive: { backgroundColor: "#14B8A6", borderColor: "#2DD4BF" },
  filterText: { color: "#CBD5E1", fontSize: 13, fontWeight: "700" },
  filterTextActive: { color: "#062023" },
  bulkDeleteBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    marginHorizontal: 16,
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
  },
  bulkDeleteText: { color: "#FCA5A5", fontWeight: "700" },
  listContent: { padding: 16, paddingBottom: 100, gap: 10 },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F2930",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E4E5A",
  },
  callIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#07161A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  callInfo: { flex: 1 },
  callerName: { color: "#F8FAFC", fontSize: 16, fontWeight: "700" },
  callMeta: { color: "#94A3B8", fontSize: 12, marginTop: 2, fontWeight: "600" },
  callActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2DD4BF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  callActionLabel: { color: "#062023", fontWeight: "800", fontSize: 13 },
  emptyBox: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyTitle: { color: "#F8FAFC", fontSize: 18, fontWeight: "700" },
  emptySubtitle: { color: "#94A3B8", fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#14B8A6",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 6,
  },
  fabText: { color: "#062023", fontSize: 15, fontWeight: "800" },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  bottomSheet: {
    backgroundColor: "#0F2930",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: "70%",
    gap: 12,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { color: "#F8FAFC", fontSize: 18, fontWeight: "800" },
  closeText: { color: "#2DD4BF", fontSize: 15, fontWeight: "700" },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E4E5A",
  },
});

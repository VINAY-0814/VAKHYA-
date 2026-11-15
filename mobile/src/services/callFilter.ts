import { CallRecord } from "../types";

export type CallFilterCategory = "all" | "incoming" | "outgoing" | "missed";

export function filterAndSearchCalls(
  calls: CallRecord[],
  category: CallFilterCategory,
  searchQuery: string
): CallRecord[] {
  let filtered = calls;
  if (category === "incoming") {
    filtered = filtered.filter((c) => c.type === "incoming");
  } else if (category === "outgoing") {
    filtered = filtered.filter((c) => c.type === "outgoing");
  } else if (category === "missed") {
    filtered = filtered.filter((c) => c.status === "missed");
  }

  const q = searchQuery.trim().toLowerCase();
  if (!q) return filtered;

  return filtered.filter(
    (c) =>
      c.phone.toLowerCase().includes(q) ||
      (c.contactName || "").toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q)
  );
}

export function formatCallDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

export function canStartVideoCall(permissions: {
  cameraGranted: boolean;
  microphoneGranted: boolean;
  consentAccepted: boolean;
}): { allowed: boolean; reason?: string } {
  if (!permissions.cameraGranted) {
    return { allowed: false, reason: "Camera permission is required for video and sign translation." };
  }
  if (!permissions.microphoneGranted) {
    return { allowed: false, reason: "Microphone permission is required for voice-to-sign translation." };
  }
  if (!permissions.consentAccepted) {
    return { allowed: false, reason: "Explicit user consent for live media capture is required before starting a call." };
  }
  return { allowed: true };
}

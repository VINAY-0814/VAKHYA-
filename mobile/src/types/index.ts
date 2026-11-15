export type UserType = "deaf" | "hearing";
export type SignLanguage = "ASL" | "ISL";

export interface UserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  imageProfile: string | null;
  userType: UserType;
  notificationsEnabled: boolean;
  translationEnabled: boolean;
  preferredSignLanguage: SignLanguage;
}

export interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  ownerId: number;
  userId: number | null;
}

export interface CallRecord {
  id: number;
  ownerId: number;
  phone: string;
  type: "incoming" | "outgoing";
  status: "initiated" | "ringing" | "connected" | "missed" | "rejected" | "ended";
  date: string;
  duration: number;
  contactId: number | null;
  userId: number | null;
  translationUsed: boolean;
  contactName?: string;
}

export interface PoseKeyframe {
  gloss: string;
  t: number;
  right_wrist: [number, number, number];
  left_wrist: [number, number, number];
  right_open: number;
  left_open: number;
  elbow_angle: number;
  non_manual?: {
    eyebrows?: string;
    mouth?: string;
    headTilt?: string;
  };
}

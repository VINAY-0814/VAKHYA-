import { CallRecord, Contact, UserProfile } from "../types";

const DEFAULT_API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:4000/api/v1";

export class VakhyaApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onTokenRefreshed?: (access: string, refresh: string) => void;

  constructor(baseUrl: string = DEFAULT_API_BASE) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  setTokens(accessToken: string | null, refreshToken: string | null) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  setTokenRefreshListener(cb: (access: string, refresh: string) => void) {
    this.onTokenRefreshed = cb;
  }

  getAccessToken() {
    return this.accessToken;
  }

  private async request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });

    if (res.status === 401 && retry && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        return this.request<T>(path, options, false);
      }
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data as T;
  }

  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      this.onTokenRefreshed?.(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    phone: string;
    userType: "deaf" | "hearing";
  }) {
    return this.request<{ user: UserProfile; accessToken: string; refreshToken: string }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify(payload) }
    );
  }

  login(email: string, password: string) {
    return this.request<{ user: UserProfile; accessToken: string; refreshToken: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
  }

  logout() {
    return this.request<{ success: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
  }

  forgotPassword(email: string) {
    return this.request<{ success: boolean; message: string; devOtp?: string }>(
      "/auth/forgot-password",
      { method: "POST", body: JSON.stringify({ email }) }
    );
  }

  verifyOtp(email: string, otp: string) {
    return this.request<{ success: boolean; verified: boolean }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  }

  resetPassword(email: string, otp: string, newPassword: string) {
    return this.request<{ success: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, newPassword }),
    });
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  deleteAccount() {
    return this.request<{ success: boolean }>("/auth/account", { method: "DELETE" });
  }

  getProfile() {
    return this.request<{ user: UserProfile }>("/profile");
  }

  updateProfile(patch: Partial<UserProfile>) {
    return this.request<{ user: UserProfile }>("/profile", {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  }

  updatePreferences(patch: {
    notificationsEnabled?: boolean;
    translationEnabled?: boolean;
    preferredSignLanguage?: "ASL" | "ISL";
  }) {
    return this.request<{ user: UserProfile }>("/profile/preferences", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  getContacts(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return this.request<{ contacts: Contact[] }>(`/contacts${qs}`);
  }

  createContact(payload: { firstName: string; lastName?: string; phone: string }) {
    return this.request<{ contact: Contact }>("/contacts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  updateContact(id: number, patch: { firstName?: string; lastName?: string; phone?: string }) {
    return this.request<{ contact: Contact }>(`/contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  }

  deleteContact(id: number) {
    return this.request<{ success: boolean }>(`/contacts/${id}`, { method: "DELETE" });
  }

  getCalls(type: "all" | "incoming" | "outgoing" | "missed" = "all", search?: string) {
    const params = new URLSearchParams({ type });
    if (search) params.set("search", search);
    return this.request<{ calls: CallRecord[] }>(`/calls?${params.toString()}`);
  }

  initiateCall(payload: { phone: string; contactId?: number | null; translationUsed?: boolean }) {
    return this.request<{ call: CallRecord; calleeOnline: boolean; calleeUserId: number | null }>(
      "/calls",
      { method: "POST", body: JSON.stringify(payload) }
    );
  }

  updateCall(id: number, patch: { status?: CallRecord["status"]; duration?: number }) {
    return this.request<{ call: CallRecord }>(`/calls/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  deleteCall(id: number) {
    return this.request<{ success: boolean }>(`/calls/${id}`, { method: "DELETE" });
  }

  deleteCalls(ids?: number[]) {
    return this.request<{ success: boolean; deletedCount: number }>("/calls", {
      method: "DELETE",
      body: JSON.stringify(ids ? { ids } : {}),
    });
  }

  registerDeviceToken(deviceId: string, fcmToken: string) {
    return this.request("/tokens", {
      method: "POST",
      body: JSON.stringify({ deviceId, fcmToken }),
    });
  }

  translateVoiceToSign(text: string, signLanguage: "ASL" | "ISL" = "ASL") {
    return this.request<any>("/translation/voice-to-sign", {
      method: "POST",
      body: JSON.stringify({ text, sign_language: signLanguage, fps: 12, encode_video: false }),
    });
  }

  translateSignToVoice(poseSequence: any[], glossHint?: string) {
    return this.request<any>("/translation/sign-to-voice", {
      method: "POST",
      body: JSON.stringify({ pose_sequence: poseSequence, gloss_hint: glossHint }),
    });
  }
}

export const apiClient = new VakhyaApiClient();

import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "../services/api";
import { signalingClient } from "../services/signaling";
import { registerFcmDeviceToken } from "../services/notifications";
import { UserProfile } from "../types";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  setSession: (user: UserProfile, accessToken: string, refreshToken: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_KEY = "vakhya_access_token";
const REFRESH_KEY = "vakhya_refresh_token";
const USER_KEY = "vakhya_user_profile";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.setTokenRefreshListener(async (access, refresh) => {
      await SecureStore.setItemAsync(ACCESS_KEY, access);
      await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    });

    (async () => {
      try {
        const [access, refresh, savedUser] = await Promise.all([
          SecureStore.getItemAsync(ACCESS_KEY),
          SecureStore.getItemAsync(REFRESH_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (access && refresh && savedUser) {
          apiClient.setTokens(access, refresh);
          setUser(JSON.parse(savedUser));
          signalingClient.connect(access);
          registerFcmDeviceToken();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setSession = async (nextUser: UserProfile, accessToken: string, refreshToken: string) => {
    apiClient.setTokens(accessToken, refreshToken);
    setUser(nextUser);
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser)),
    ]);
    signalingClient.connect(accessToken);
    if (nextUser.notificationsEnabled) {
      registerFcmDeviceToken();
    }
  };

  const refreshUser = async () => {
    const res = await apiClient.getProfile();
    setUser(res.user);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.user));
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } catch {}
    signalingClient.disconnect();
    apiClient.setTokens(null, null);
    setUser(null);
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setSession, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

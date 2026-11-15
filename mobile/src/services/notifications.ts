import { Platform } from "react-native";
import notifee, { AndroidImportance, AndroidCategory, AndroidVisibility } from "@notifee/react-native";
import messaging from "@react-native-firebase/messaging";
import * as Haptics from "expo-haptics";
import { apiClient } from "./api";

export const CALL_CHANNEL_ID = "vakhya_incoming_calls";

export async function ensureNotificationChannel() {
  if (Platform.OS !== "android") return;
  await notifee.createChannel({
    id: CALL_CHANNEL_ID,
    name: "Incoming Video Calls",
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    lights: true,
    lightColor: "#25D366",
  });
}

export async function registerFcmDeviceToken(): Promise<string | null> {
  try {
    await notifee.requestPermission();
    await messaging().registerDeviceForRemoteMessages();
    const fcmToken = await messaging().getToken();
    const deviceId = `android-${Platform.Version}`;
    if (fcmToken) {
      await apiClient.registerDeviceToken(deviceId, fcmToken);
    }
    return fcmToken;
  } catch (err) {
    console.warn("[VAKHYA FCM] Registration skipped in dev/simulator:", err);
    return null;
  }
}

export async function displayIncomingCallNotification(payload: {
  callId: string;
  callerName: string;
  callerPhone: string;
  callerType: "deaf" | "hearing";
  translationEnabled: boolean;
}) {
  await ensureNotificationChannel();
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

  await notifee.displayNotification({
    id: `call_${payload.callId}`,
    title: `Incoming VAKHYA Video Call`,
    body: `${payload.callerName} (${payload.callerPhone}) • ${
      payload.callerType === "deaf" ? "Sign Language User" : "Voice User"
    }`,
    data: {
      type: "INCOMING_CALL",
      callId: payload.callId,
      callerName: payload.callerName,
      callerPhone: payload.callerPhone,
      callerType: payload.callerType,
      translationEnabled: String(payload.translationEnabled),
    },
    android: {
      channelId: CALL_CHANNEL_ID,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      fullScreenAction: {
        id: "default",
        launchActivity: "default",
      },
      pressAction: {
        id: "default",
        launchActivity: "default",
      },
      actions: [
        {
          title: "Accept Call",
          pressAction: { id: "accept_call", launchActivity: "default" },
        },
        {
          title: "Reject",
          pressAction: { id: "reject_call" },
        },
      ],
      ongoing: true,
      autoCancel: false,
    },
  });
}

import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import notifee, { EventType } from "@notifee/react-native";
import messaging from "@react-native-firebase/messaging";
import { AuthProvider } from "../src/context/AuthContext";
import { signalingClient } from "../src/services/signaling";
import { displayIncomingCallNotification, ensureNotificationChannel } from "../src/services/notifications";

function NotificationAndSignalingRouter() {
  const router = useRouter();

  useEffect(() => {
    ensureNotificationChannel();

    const unsubWs = signalingClient.subscribe((msg) => {
      if (msg.type === "incoming_call") {
        router.push({
          pathname: "/incoming-call",
          params: {
            callId: String(msg.callId || ""),
            callerId: String(msg.callerId || ""),
            callerName: String(msg.callerName || "VAKHYA User"),
            callerPhone: String(msg.callerPhone || ""),
            callerType: String(msg.callerType || "hearing"),
            translationEnabled: String(msg.translationEnabled ?? true),
          },
        });
      }
    });

    const unsubFcm = messaging().onMessage(async (remoteMessage) => {
      if (remoteMessage?.data?.type === "INCOMING_CALL") {
        await displayIncomingCallNotification({
          callId: String(remoteMessage.data.callId || ""),
          callerName: String(remoteMessage.data.callerName || "Incoming Caller"),
          callerPhone: String(remoteMessage.data.callerPhone || ""),
          callerType: (remoteMessage.data.callerType as "deaf" | "hearing") || "hearing",
          translationEnabled: remoteMessage.data.translationEnabled !== "false",
        });
      }
    });

    const unsubNotifee = notifee.onForegroundEvent(({ type, detail }) => {
      const data = detail.notification?.data;
      if (!data || data.type !== "INCOMING_CALL") return;

      if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "accept_call") {
        router.push({
          pathname: "/call/[id]",
          params: {
            id: String(data.callId),
            remoteName: String(data.callerName || "Caller"),
            remotePhone: String(data.callerPhone || ""),
            remoteType: String(data.callerType || "hearing"),
            isIncoming: "true",
          },
        });
      } else if (type === EventType.PRESS) {
        router.push({
          pathname: "/incoming-call",
          params: {
            callId: String(data.callId),
            callerName: String(data.callerName || "Caller"),
            callerPhone: String(data.callerPhone || ""),
            callerType: String(data.callerType || "hearing"),
          },
        });
      }
    });

    return () => {
      unsubWs();
      unsubFcm();
      unsubNotifee();
    };
  }, [router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0B1F24" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="incoming-call" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="call/[id]" options={{ presentation: "fullScreenModal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <NotificationAndSignalingRouter />
    </AuthProvider>
  );
}

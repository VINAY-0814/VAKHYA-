import messaging from "@react-native-firebase/messaging";
import notifee, { EventType } from "@notifee/react-native";
import { displayIncomingCallNotification } from "./src/services/notifications";
import "expo-router/entry";

// Handle FCM data-only incoming call alerts when app is backgrounded or terminated
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  if (remoteMessage?.data?.type === "INCOMING_CALL") {
    await displayIncomingCallNotification({
      callId: String(remoteMessage.data.callId || ""),
      callerName: String(remoteMessage.data.callerName || "Unknown Caller"),
      callerPhone: String(remoteMessage.data.callerPhone || ""),
      callerType: (remoteMessage.data.callerType as "deaf" | "hearing") || "hearing",
      translationEnabled: remoteMessage.data.translationEnabled !== "false",
    });
  }
});

// Handle Notifee notification button actions (Accept / Reject) when app is backgrounded or terminated
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const callId = detail.notification?.data?.callId;
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === "reject_call") {
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
    // Rejection is synced upon next foreground/API call if socket is asleep
    console.log("[VAKHYA Notifee] Background call rejected:", callId);
  }
});

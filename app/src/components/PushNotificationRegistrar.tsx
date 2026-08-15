import { useEffect } from "react";
import { Platform } from "react-native";
import { useRegisterPushToken } from "../api/client";
import { useAuth } from "../state/auth";

// Headless: requests permission and registers this device's Expo push token
// with the backend whenever a user is signed in. expo-notifications' own
// module code isn't web-safe (it touches localStorage at import time, which
// crashes Expo Router's server-side render on web), so it's only ever
// imported dynamically, inside this native-only effect — never at module
// scope, and never reached at all on web or during SSR.
export function PushNotificationRegistrar() {
  const { token } = useAuth();
  const registerPushToken = useRegisterPushToken();

  useEffect(() => {
    if (!token || Platform.OS === "web") return;
    let cancelled = false;

    (async () => {
      const Notifications = await import("expo-notifications");
      const { default: Constants } = await import("expo-constants");

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted" || cancelled) return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const pushToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
      if (!cancelled) registerPushToken.mutate(pushToken);
    })().catch((err) => {
      console.error("[push] Failed to register for push notifications:", err);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return null;
}

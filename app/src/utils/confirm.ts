import { Alert, Platform } from "react-native";

// react-native-web's Alert.alert is a no-op stub, so a plain Alert.alert
// confirmation dialog silently does nothing on web. This falls back to
// window.confirm there and uses the real native Alert elsewhere.
export function confirmAsync(title: string, message: string, confirmLabel = "Confirm"): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

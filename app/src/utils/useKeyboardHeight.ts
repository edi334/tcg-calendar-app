import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

// KeyboardAvoidingView is unreliable inside Modal on Android (the Modal
// renders in its own native window, which doesn't reliably get the
// standard resize-on-keyboard behavior). Tracking the keyboard height
// directly and applying it as marginBottom on the sheet is more robust.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

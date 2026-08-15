import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { TOAST_COLORS } from "../theme/palette";
import type { ToastData } from "../state/toast";

export function ToastHost({ toast }: { toast: ToastData | null }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState<ToastData | null>(null);

  useEffect(() => {
    if (toast) {
      setDisplayed(toast);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
    } else if (displayed) {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setDisplayed(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  if (!displayed) return null;

  const colors = TOAST_COLORS[displayed.type];

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: colors.bg,
            opacity: anim,
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
          },
        ]}
      >
        <Text style={styles.emoji}>{colors.emoji}</Text>
        <Text style={[styles.message, { color: colors.on }]} numberOfLines={2}>
          {displayed.message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  emoji: { fontSize: 16 },
  message: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
});

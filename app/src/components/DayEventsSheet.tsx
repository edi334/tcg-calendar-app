import { useEffect, useRef, useState } from "react";
import { Animated, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import type { TcgEvent } from "../types";
import { EventCard } from "./EventCard";

interface Props {
  visible: boolean;
  date: string; // YYYY-MM-DD
  events: TcgEvent[];
  onClose: () => void;
}

function formatDateHeading(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function DayEventsSheet({ visible, date, events, onClose }: Props) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  // Keep the Modal mounted through the exit animation — closing it
  // immediately (visible={false}) would cut the slide-down short.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 9, tension: 65 }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: anim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [480, 0] }) }],
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{formatDateHeading(date)}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              style={[styles.closeButton, { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <EventCard event={item} />}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ color: colors.textSecondary }}>No matching events on this day.</Text>
              </View>
            }
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "75%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "800" },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  // This is the padding that actually matters for breathing room below the
  // last card — the FlatList fills the sheet's available height and scrolls
  // internally, so the outer sheet's own paddingBottom never gets reached.
  list: { paddingBottom: 32 },
  empty: { paddingVertical: 32, alignItems: "center" },
});

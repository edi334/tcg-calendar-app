import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "../api/client";
import { useTheme } from "../theme/ThemeContext";
import { EVENT_TYPE_COLORS, EVENT_TYPE_EMOJI, EVENT_TYPE_ORDER } from "../theme/palette";
import { EVENT_TYPE_LABELS, type EventType } from "../types";

export function NotificationPreferencesSection() {
  const { colors } = useTheme();
  const { data } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const subscribed = new Set(data?.eventTypes ?? []);

  function toggle(type: EventType) {
    const next = new Set(subscribed);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    updatePreferences.mutate([...next]);
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Notify me about</Text>
      <Text style={[styles.helper, { color: colors.textSecondary }]}>
        Get a push notification whenever new events of these types are added.
        {Platform.OS === "web" ? " (Push notifications require the iOS or Android app.)" : ""}
      </Text>
      <View style={styles.chipRow}>
        {EVENT_TYPE_ORDER.map((type) => {
          const active = subscribed.has(type);
          const typeColor = EVENT_TYPE_COLORS[type];
          return (
            <TouchableOpacity
              key={type}
              onPress={() => toggle(type)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? typeColor.bg : colors.surfaceAlt,
                  borderColor: active ? typeColor.bg : colors.border,
                },
              ]}
            >
              <Text style={styles.chipEmoji}>{EVENT_TYPE_EMOJI[type]}</Text>
              <Text style={[styles.chipText, { color: active ? typeColor.on : colors.text }]}>
                {EVENT_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  helper: { fontSize: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 13, fontWeight: "600" },
});

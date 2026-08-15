import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { EVENT_TYPE_COLORS, EVENT_TYPE_EMOJI, GAME_EMOJI } from "../theme/palette";
import { EVENT_TYPE_LABELS, GAME_LABELS, type TcgEvent } from "../types";
import { formatDistanceKm } from "../utils/format";
import { AddToTripSheet } from "./AddToTripSheet";

function formatDateTime(iso: string, timezone: string | null): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone ?? undefined,
  });
}

interface Props {
  event: TcgEvent;
  /** When provided, renders a "Remove" action instead of "+ Trip" (used in trip detail). */
  onRemove?: () => void;
}

export function EventCard({ event, onRemove }: Props) {
  const { colors } = useTheme();
  const typeColor = EVENT_TYPE_COLORS[event.eventType];
  const distanceLabel = formatDistanceKm(event.distanceKm);
  const [sheetOpen, setSheetOpen] = useState(false);

  const cardStyle: ViewStyle = {
    ...(styles.card as ViewStyle),
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  return (
    <View style={styles.wrapper}>
      <Link href={`/event/${event.id}`} asChild>
        <TouchableOpacity style={cardStyle}>
          <View style={[styles.accentBar, { backgroundColor: typeColor.bg }]} />
          <View style={styles.body}>
            <View style={styles.headerRow}>
              <View style={[styles.badge, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={styles.badgeEmoji}>{GAME_EMOJI[event.game]}</Text>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{GAME_LABELS[event.game]}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: typeColor.bg }]}>
                <Text style={styles.badgeEmoji}>{EVENT_TYPE_EMOJI[event.eventType]}</Text>
                <Text style={[styles.badgeText, { color: typeColor.on }]}>{EVENT_TYPE_LABELS[event.eventType]}</Text>
              </View>
            </View>
            <Text style={[styles.title, styles.titleWithButton, { color: colors.text }]} numberOfLines={2}>
              {event.title}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {formatDateTime(event.startTime, event.timezone)}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {event.storeName} · {event.address}
            </Text>
            {distanceLabel ? (
              <Text style={[styles.meta, styles.distance, { color: colors.textSecondary }]}>📍 {distanceLabel}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      </Link>
      {onRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          style={[styles.saveButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          accessibilityLabel="Remove from trip"
        >
          <Text style={[styles.saveButtonText, { color: colors.text }]}>✕ Remove</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            onPress={() => setSheetOpen(true)}
            style={[styles.saveButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            accessibilityLabel="Add to trip"
          >
            <Text style={[styles.saveButtonText, { color: colors.text }]}>+ Trip</Text>
          </TouchableOpacity>
          <AddToTripSheet visible={sheetOpen} eventId={event.id} onClose={() => setSheetOpen(false)} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  card: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  accentBar: {
    width: 6,
  },
  body: {
    flex: 1,
    padding: 12,
    gap: 5,
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingRight: 68,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  titleWithButton: {
    paddingRight: 68,
  },
  meta: {
    fontSize: 13,
  },
  distance: {
    fontWeight: "600",
  },
  saveButton: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  saveButtonText: {
    fontSize: 11,
    fontWeight: "800",
  },
});

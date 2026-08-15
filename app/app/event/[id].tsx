import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useEvent } from "../../src/api/client";
import { AddToTripSheet } from "../../src/components/AddToTripSheet";
import { useTheme } from "../../src/theme/ThemeContext";
import { EVENT_TYPE_COLORS, EVENT_TYPE_EMOJI, GAME_EMOJI } from "../../src/theme/palette";
import { EVENT_TYPE_LABELS, GAME_LABELS } from "../../src/types";
import { formatDistanceKm } from "../../src/utils/format";

function formatDateTime(iso: string, timezone: string | null): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: timezone ?? undefined,
  });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, isLoading, isError } = useEvent(id);
  const { colors } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Loading…</Text>
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Couldn't load this event.</Text>
      </View>
    );
  }

  const typeColor = EVENT_TYPE_COLORS[event.eventType];
  const distanceLabel = formatDistanceKm(event.distanceKm);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
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

        <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
        <Text style={[styles.dateTime, { color: colors.textSecondary }]}>
          {formatDateTime(event.startTime, event.timezone)}
        </Text>
        {distanceLabel ? (
          <Text style={[styles.distance, { color: colors.textSecondary }]}>📍 {distanceLabel} from Timișoara</Text>
        ) : null}

        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Store</Text>
          <Text style={[styles.sectionValue, { color: colors.text }]}>{event.storeName}</Text>
          <Text style={[styles.sectionValue, { color: colors.text }]}>{event.address}</Text>
        </View>

        {event.format ? (
          <View style={[styles.section, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Format</Text>
            <Text style={[styles.sectionValue, { color: colors.text }]}>{event.format}</Text>
          </View>
        ) : null}

        {event.priceAmount != null ? (
          <View style={[styles.section, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Entry fee</Text>
            <Text style={[styles.sectionValue, { color: colors.text }]}>
              {event.priceAmount} {event.priceCurrency}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: typeColor.bg }]}
          onPress={() => setSheetOpen(true)}
        >
          <Text style={[styles.primaryButtonText, { color: typeColor.on }]}>+ Add to Trip</Text>
        </TouchableOpacity>

        {event.sourceUrl ? (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => Linking.openURL(event.sourceUrl!)}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>View original listing</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <AddToTripSheet visible={sheetOpen} eventId={event.id} onClose={() => setSheetOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  accentBar: { height: 5, width: "100%" },
  body: { padding: 16, gap: 12 },
  headerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeEmoji: { fontSize: 13 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "800" },
  dateTime: { fontSize: 15 },
  distance: { fontSize: 14, fontWeight: "600" },
  section: { gap: 2, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  sectionLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  sectionValue: { fontSize: 15 },
  primaryButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: { fontWeight: "800", fontSize: 15 },
  secondaryButton: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonText: { fontWeight: "700", fontSize: 14 },
});

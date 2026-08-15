import { Link } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, type ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import type { Trip } from "../types";

function formatDateRange(trip: Trip): string {
  if (trip.events.length === 0) return "No events yet";
  const dates = trip.events.map((e) => new Date(e.startTime));
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (min.toDateString() === max.toDateString()) {
    return min.toLocaleDateString(undefined, opts);
  }
  return `${min.toLocaleDateString(undefined, opts)} – ${max.toLocaleDateString(undefined, opts)}`;
}

export function TripCard({ trip }: { trip: Trip }) {
  const { colors } = useTheme();

  const cardStyle: ViewStyle = {
    ...(styles.card as ViewStyle),
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  return (
    <Link href={`/trip/${trip.id}`} asChild>
      <TouchableOpacity style={cardStyle}>
        <Text style={[styles.title, { color: colors.text }]}>{trip.name}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{formatDateRange(trip)}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {trip.events.length} event{trip.events.length === 1 ? "" : "s"}
        </Text>
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  title: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13 },
});

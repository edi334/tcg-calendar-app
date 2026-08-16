import { useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useEvents } from "../../src/api/client";
import { DayEventsSheet } from "../../src/components/DayEventsSheet";
import { EventCalendar } from "../../src/components/EventCalendar";
import { FilterBar } from "../../src/components/FilterBar";
import { SearchInfoBanner } from "../../src/components/SearchInfoBanner";
import { useFilters } from "../../src/state/filters";
import { useTheme } from "../../src/theme/ThemeContext";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CalendarScreen() {
  const { games, types } = useFilters();
  const { data, isLoading, isError } = useEvents({ games, types });
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [sheetOpen, setSheetOpen] = useState(false);
  const { colors } = useTheme();

  const eventsForDay = useMemo(
    () => (data ?? []).filter((e) => e.startTime.slice(0, 10) === selectedDate),
    [data, selectedDate]
  );

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSheetOpen(true);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FilterBar />
      <SearchInfoBanner />
      {isLoading ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.textSecondary }}>Loading events…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.textSecondary }}>Couldn't load events.</Text>
        </View>
      ) : (
        <EventCalendar events={data ?? []} selectedDate={selectedDate} onSelectDate={handleSelectDate} />
      )}
      <DayEventsSheet visible={sheetOpen} date={selectedDate} events={eventsForDay} onClose={() => setSheetOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});

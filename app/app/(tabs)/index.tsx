import { useMemo, useState } from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useEvents } from "../../src/api/client";
import { EventCalendar } from "../../src/components/EventCalendar";
import { EventCard } from "../../src/components/EventCard";
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
  const { colors } = useTheme();

  const eventsForDay = useMemo(
    () => (data ?? []).filter((e) => e.startTime.slice(0, 10) === selectedDate),
    [data, selectedDate]
  );

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
        <>
          <EventCalendar events={data ?? []} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          <FlatList
            data={eventsForDay}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <EventCard event={item} />}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={{ color: colors.textSecondary }}>No matching events on this day.</Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 12, flexGrow: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});

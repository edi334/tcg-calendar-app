import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCreateTrip, useTrips } from "../../src/api/client";
import { NewTripSheet } from "../../src/components/NewTripSheet";
import { TripCard } from "../../src/components/TripCard";
import { useTheme } from "../../src/theme/ThemeContext";

export default function TripsScreen() {
  const { colors } = useTheme();
  const { data: trips, isLoading, isError, refetch, isRefetching } = useTrips();
  const createTrip = useCreateTrip();
  const router = useRouter();
  const [showNewTripSheet, setShowNewTripSheet] = useState(false);

  function handleCreate(name: string) {
    createTrip.mutate(name || undefined, {
      onSuccess: (trip) => {
        setShowNewTripSheet(false);
        router.push(`/trip/${trip.id}`);
      },
    });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Your trips</Text>
        <TouchableOpacity
          style={[styles.newButton, { backgroundColor: colors.tint }]}
          onPress={() => setShowNewTripSheet(true)}
        >
          <Text style={[styles.newButtonText, { color: colors.tintOn }]}>+ New Trip</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.textSecondary }}>Loading…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={{ color: colors.textSecondary }}>Couldn't load your trips. Pull down to retry.</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TripCard trip={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No trips yet</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Tap "+ New Trip", or add an event to a trip from the Calendar tab.
              </Text>
            </View>
          }
        />
      )}

      <NewTripSheet
        visible={showNewTripSheet}
        onClose={() => setShowNewTripSheet(false)}
        onCreate={handleCreate}
        isPending={createTrip.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  newButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  newButtonText: { fontWeight: "700", fontSize: 13 },
  list: { padding: 12, paddingTop: 0, flexGrow: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyBody: { fontSize: 14, textAlign: "center" },
});

import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useDeleteTrip, useMe, useRemoveEventFromTrip, useRenameTrip, useTrip } from "../../src/api/client";
import { EventCard } from "../../src/components/EventCard";
import { useTheme } from "../../src/theme/ThemeContext";
import { confirmAsync } from "../../src/utils/confirm";
import { buildDriveThereUrl } from "../../src/utils/maps";

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useTrip(id);
  const { data: me } = useMe();
  const { colors } = useTheme();
  const router = useRouter();
  const removeEvent = useRemoveEventFromTrip();
  const renameTrip = useRenameTrip();
  const deleteTrip = useDeleteTrip();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  if (!trip) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Trip not found.</Text>
      </View>
    );
  }

  const driveUrl = me?.homeAddress ? buildDriveThereUrl(me.homeAddress, trip.events) : null;

  const startEditingName = () => {
    setNameDraft(trip.name);
    setEditingName(true);
  };

  const saveNameEdit = () => {
    const name = nameDraft.trim();
    if (name && name !== trip.name) {
      renameTrip.mutate({ tripId: trip.id, name });
    }
    setEditingName(false);
  };

  const handleDeleteTrip = async () => {
    const confirmed = await confirmAsync(
      "Delete trip?",
      `"${trip.name}" will be deleted. This can't be undone.`,
      "Delete"
    );
    if (confirmed) {
      deleteTrip.mutate(trip.id, { onSuccess: () => router.back() });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              style={[styles.nameInput, { color: colors.text, borderColor: colors.border }]}
              autoFocus
              onSubmitEditing={saveNameEdit}
            />
            <TouchableOpacity onPress={saveNameEdit}>
              <Text style={{ color: colors.tint, fontWeight: "700" }}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={startEditingName}>
            <Text style={[styles.title, { color: colors.text }]}>{trip.name} ✏️</Text>
          </TouchableOpacity>
        )}

        {me?.homeAddress ? null : (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Set your home address on the Profile tab to enable "Drive there".
          </Text>
        )}

        <TouchableOpacity
          style={[styles.driveButton, { backgroundColor: driveUrl ? colors.tint : colors.surfaceAlt }]}
          disabled={!driveUrl}
          onPress={() => driveUrl && Linking.openURL(driveUrl)}
        >
          <Text style={[styles.driveButtonText, { color: driveUrl ? colors.tintOn : colors.textSecondary }]}>
            🚗 Drive there
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDeleteTrip} style={styles.deleteRow}>
          <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "600" }}>Delete trip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trip.events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard event={item} onRemove={() => removeEvent.mutate({ tripId: trip.id, eventId: item.id })} />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: colors.textSecondary }}>
              No events in this trip yet. Add one from the Calendar tab.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: "800" },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  nameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  hint: { fontSize: 13 },
  driveButton: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  driveButtonText: { fontWeight: "800", fontSize: 15 },
  deleteRow: { alignItems: "center", paddingTop: 4 },
  list: { padding: 12, paddingTop: 0, flexGrow: 1 },
});

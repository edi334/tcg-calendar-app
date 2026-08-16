import { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAddEventToTrip, useCreateTrip, useTrips } from "../api/client";
import { useTheme } from "../theme/ThemeContext";
import { useKeyboardHeight } from "../utils/useKeyboardHeight";

interface Props {
  visible: boolean;
  eventId: string;
  onClose: () => void;
}

export function AddToTripSheet({ visible, eventId, onClose }: Props) {
  const { colors } = useTheme();
  const { data: trips } = useTrips();
  const addEventToTrip = useAddEventToTrip();
  const createTrip = useCreateTrip();
  const [newTripName, setNewTripName] = useState("");
  const [showNewTripInput, setShowNewTripInput] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  function handleAdd(tripId: string) {
    addEventToTrip.mutate({ tripId, eventId }, { onSuccess: onClose });
  }

  function handleCreateAndAdd() {
    createTrip.mutate(newTripName.trim() || undefined, {
      onSuccess: (trip) => {
        setNewTripName("");
        setShowNewTripInput(false);
        addEventToTrip.mutate({ tripId: trip.id, eventId }, { onSuccess: onClose });
      },
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.surface, marginBottom: keyboardHeight }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Add to trip</Text>

          {trips?.map((trip) => {
            const alreadyIn = trip.events.some((e) => e.id === eventId);
            return (
              <TouchableOpacity
                key={trip.id}
                style={[styles.row, { borderColor: colors.border }]}
                onPress={() => !alreadyIn && handleAdd(trip.id)}
                disabled={alreadyIn}
              >
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>{trip.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {alreadyIn ? "✓ Added" : `${trip.events.length} event${trip.events.length === 1 ? "" : "s"}`}
                </Text>
              </TouchableOpacity>
            );
          })}

          {showNewTripInput ? (
            <View style={[styles.row, { borderColor: colors.border }]}>
              <TextInput
                value={newTripName}
                onChangeText={setNewTripName}
                placeholder="Trip name"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                autoFocus
                onSubmitEditing={handleCreateAndAdd}
              />
              <TouchableOpacity onPress={handleCreateAndAdd}>
                <Text style={{ color: colors.tint, fontWeight: "700" }}>Create</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.row, { borderColor: colors.border }]} onPress={() => setShowNewTripInput(true)}>
              <Text style={{ color: colors.tint, fontSize: 15, fontWeight: "700" }}>+ New trip</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    gap: 4,
    maxHeight: "70%",
  },
  title: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  cancel: { alignItems: "center", paddingTop: 16 },
});

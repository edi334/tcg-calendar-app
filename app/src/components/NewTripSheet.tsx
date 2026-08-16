import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useKeyboardHeight } from "../utils/useKeyboardHeight";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  isPending: boolean;
}

export function NewTripSheet({ visible, onClose, onCreate, isPending }: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (visible) setName("");
  }, [visible]);

  function handleCreate() {
    onCreate(name.trim());
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.surface, marginBottom: keyboardHeight }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>New trip</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Trip name (optional)"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.tint }]}
            onPress={handleCreate}
            disabled={isPending}
          >
            <Text style={[styles.createButtonText, { color: colors.tintOn }]}>
              {isPending ? "Creating…" : "Create"}
            </Text>
          </TouchableOpacity>
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
    gap: 12,
  },
  title: { fontSize: 17, fontWeight: "800" },
  input: {
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
  },
  createButton: { paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  createButtonText: { fontWeight: "700", fontSize: 14 },
  cancel: { alignItems: "center" },
});

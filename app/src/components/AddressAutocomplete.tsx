import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAddressSearch } from "../api/client";
import { useTheme } from "../theme/ThemeContext";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function AddressAutocomplete({ value, onChange, placeholder }: Props) {
  const { colors } = useTheme();
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(value), 350);
    return () => clearTimeout(timeout);
  }, [value]);

  const { data: suggestions, isFetching } = useAddressSearch(focused ? debouncedQuery : "");
  const showDropdown = focused && (suggestions?.length ?? 0) > 0;

  function handleSelect(label: string) {
    onChange(label);
    setDebouncedQuery(label);
    setFocused(false);
  }

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)} // let a suggestion tap register before closing
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
      />
      {focused && isFetching ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>Searching…</Text>
      ) : null}
      {showDropdown ? (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {suggestions!.map((s, i) => (
            <TouchableOpacity
              key={`${s.label}-${i}`}
              style={[
                styles.row,
                i < suggestions!.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
              onPress={() => handleSelect(s.label)}
            >
              <Text style={[styles.rowText, { color: colors.text }]} numberOfLines={2}>
                📍 {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 44,
  },
  hint: { fontSize: 12, marginTop: 4 },
  dropdown: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: "hidden",
  },
  row: { paddingHorizontal: 12, paddingVertical: 10 },
  rowText: { fontSize: 14 },
});

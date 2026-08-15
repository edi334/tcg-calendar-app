import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme, type ThemeMode } from "../theme/ThemeContext";

const OPTIONS: { mode: ThemeMode; icon: string; label: string }[] = [
  { mode: "system", icon: "🖥️", label: "System" },
  { mode: "light", icon: "☀️", label: "Light" },
  { mode: "dark", icon: "🌙", label: "Dark" },
];

export function ThemeToggle() {
  const { mode, setMode, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      {OPTIONS.map((opt) => {
        const active = mode === opt.mode;
        return (
          <TouchableOpacity
            key={opt.mode}
            onPress={() => setMode(opt.mode)}
            accessibilityLabel={`${opt.label} theme`}
            accessibilityState={{ selected: active }}
            style={[styles.button, active && { backgroundColor: colors.tint }]}
          >
            <Text style={styles.icon}>{opt.icon}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    marginRight: 12,
  },
  button: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 18,
  },
  icon: {
    fontSize: 14,
  },
});

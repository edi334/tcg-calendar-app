import { StyleSheet, Text, View } from "react-native";
import { useMeta } from "../api/client";
import { useTheme } from "../theme/ThemeContext";

export function SearchInfoBanner() {
  const { data } = useMeta();
  const { colors } = useTheme();

  if (!data) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        📍 Searching from <Text style={[styles.strong, { color: colors.text }]}>{data.originQuery}</Text> — within{" "}
        <Text style={[styles.strong, { color: colors.text }]}>{data.radiusKm} km</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
  },
  strong: {
    fontWeight: "700",
  },
});

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFilters } from "../state/filters";
import { useTheme } from "../theme/ThemeContext";
import { EVENT_TYPE_COLORS, EVENT_TYPE_EMOJI, EVENT_TYPE_ORDER, GAME_EMOJI } from "../theme/palette";
import { EVENT_TYPE_LABELS, GAME_LABELS, type EventType, type Game } from "../types";

const GAMES: Game[] = ["mtg", "fab"];

interface ChipProps {
  label: string;
  emoji: string;
  active: boolean;
  onPress: () => void;
  activeBg: string;
  activeFg: string;
  inactiveBg: string;
  inactiveFg: string;
  inactiveBorder: string;
}

function Chip({ label, emoji, active, onPress, activeBg, activeFg, inactiveBg, inactiveFg, inactiveBorder }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? activeBg : inactiveBg, borderColor: active ? activeBg : inactiveBorder },
      ]}
    >
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text style={[styles.chipText, { color: active ? activeFg : inactiveFg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function FilterBar() {
  const { games, types, toggleGame, toggleType } = useFilters();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {GAMES.map((g) => (
          <Chip
            key={g}
            label={GAME_LABELS[g]}
            emoji={GAME_EMOJI[g]}
            active={games.includes(g)}
            onPress={() => toggleGame(g)}
            activeBg={colors.tint}
            activeFg={colors.tintOn}
            inactiveBg={colors.surfaceAlt}
            inactiveFg={colors.text}
            inactiveBorder={colors.border}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {EVENT_TYPE_ORDER.map((t: EventType) => {
          const typeColor = EVENT_TYPE_COLORS[t];
          return (
            <Chip
              key={t}
              label={EVENT_TYPE_LABELS[t]}
              emoji={EVENT_TYPE_EMOJI[t]}
              active={types.includes(t)}
              onPress={() => toggleType(t)}
              activeBg={typeColor.bg}
              activeFg={typeColor.on}
              inactiveBg={colors.surfaceAlt}
              inactiveFg={colors.text}
              inactiveBorder={colors.border}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    gap: 8,
    paddingHorizontal: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

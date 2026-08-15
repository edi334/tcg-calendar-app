import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import { useTheme } from "../theme/ThemeContext";
import { EVENT_TYPE_COLORS, EVENT_TYPE_ORDER } from "../theme/palette";
import { EVENT_TYPE_LABELS, type EventType, type TcgEvent } from "../types";

interface DayMarking {
  types: EventType[];
  count: number;
}

interface Props {
  events: TcgEvent[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function EventCalendar({ events, selectedDate, onSelectDate }: Props) {
  const { colors, scheme } = useTheme();

  const marksByDate = useMemo(() => {
    const marks: Record<string, DayMarking> = {};
    for (const event of events) {
      const key = toDateKey(event.startTime);
      if (!marks[key]) marks[key] = { types: [], count: 0 };
      if (!marks[key].types.includes(event.eventType)) marks[key].types.push(event.eventType);
      marks[key].count++;
    }
    for (const key of Object.keys(marks)) {
      marks[key].types.sort((a, b) => EVENT_TYPE_ORDER.indexOf(a) - EVENT_TYPE_ORDER.indexOf(b));
    }
    return marks;
  }, [events]);

  const todayKey = toDateKey(new Date().toISOString());

  const DayComponent = useMemo(() => {
    return function Day({ date, state }: { date?: DateData; state?: string }) {
      if (!date) return <View style={styles.dayCell} />;

      const marking = marksByDate[date.dateString];
      const hasEvents = !!marking && marking.types.length > 0;
      const primaryColor = hasEvents ? EVENT_TYPE_COLORS[marking!.types[0]] : null;
      const isSelected = date.dateString === selectedDate;
      const isToday = date.dateString === todayKey;
      const isOtherMonth = state === "disabled";

      return (
        <TouchableOpacity
          onPress={() => onSelectDate(date.dateString)}
          style={styles.dayCell}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.badge,
              hasEvents && primaryColor ? { backgroundColor: primaryColor.bg } : null,
              isToday && !isSelected ? { borderWidth: 2, borderColor: colors.textSecondary } : null,
              isSelected ? { borderWidth: 2.5, borderColor: colors.tint } : null,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                { color: isOtherMonth ? colors.textSecondary : colors.text },
                isOtherMonth ? styles.dayTextDim : null,
                hasEvents && primaryColor ? { color: primaryColor.on, fontWeight: "800" } : null,
              ]}
            >
              {date.day}
            </Text>
          </View>
          <View style={styles.dotsRow}>
            {hasEvents
              ? marking!.types
                  .slice(0, 4)
                  .map((t) => <View key={t} style={[styles.dot, { backgroundColor: EVENT_TYPE_COLORS[t].bg }]} />)
              : null}
          </View>
        </TouchableOpacity>
      );
    };
  }, [marksByDate, selectedDate, todayKey, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Calendar
        key={scheme}
        current={selectedDate}
        dayComponent={DayComponent}
        onDayPress={(day: DateData) => onSelectDate(day.dateString)}
        enableSwipeMonths
        style={{ backgroundColor: colors.surface }}
        theme={{
          backgroundColor: colors.surface,
          calendarBackground: colors.surface,
          textSectionTitleColor: colors.textSecondary,
          monthTextColor: colors.text,
          arrowColor: colors.tint,
          textMonthFontWeight: "800",
          textMonthFontSize: 17,
        }}
      />
      <Legend colors={colors} />
    </View>
  );
}

function Legend({ colors }: { colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={[styles.legend, { borderTopColor: colors.border }]}>
      {EVENT_TYPE_ORDER.map((t) => (
        <View key={t} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: EVENT_TYPE_COLORS[t].bg }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{EVENT_TYPE_LABELS[t]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingTop: 4,
    gap: 4,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dayTextDim: {
    opacity: 0.4,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    height: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "700",
  },
});

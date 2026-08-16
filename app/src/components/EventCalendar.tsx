import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { EVENT_TYPE_COLORS, EVENT_TYPE_ORDER } from "../theme/palette";
import type { EventType, TcgEvent } from "../types";

interface DayMarking {
  types: EventType[];
}

interface Props {
  events: TcgEvent[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

interface GridCell {
  day: number;
  year: number;
  month: number; // 0-11
  inMonth: boolean;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

// 6 rows x 7 cols, including leading/trailing days from adjacent months so
// every week is full — computed from plain Date math, no external library.
function buildMonthGrid(year: number, month: number): GridCell[] {
  const startOffset = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: GridCell[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day, year: y, month: m, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, year, month, inMonth: true });
  }
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    for (let day = 1; day <= 7 - remainder; day++) {
      cells.push({ day, year: y, month: m, inMonth: false });
    }
  }
  return cells;
}

export function EventCalendar({ events, selectedDate, onSelectDate }: Props) {
  const { colors } = useTheme();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = selectedDate.split("-").map(Number);
    return { year: y, month: m - 1 };
  });

  const marksByDate = useMemo(() => {
    const marks: Record<string, DayMarking> = {};
    for (const event of events) {
      const key = toDateKey(event.startTime);
      if (!marks[key]) marks[key] = { types: [] };
      if (!marks[key].types.includes(event.eventType)) marks[key].types.push(event.eventType);
    }
    for (const key of Object.keys(marks)) {
      marks[key].types.sort((a, b) => EVENT_TYPE_ORDER.indexOf(a) - EVENT_TYPE_ORDER.indexOf(b));
    }
    return marks;
  }, [events]);

  const todayKey = toDateKey(new Date().toISOString());

  const weeks = useMemo(() => {
    const grid = buildMonthGrid(cursor.year, cursor.month);
    const rows: GridCell[][] = [];
    for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));
    return rows;
  }, [cursor]);

  function goToMonth(delta: number) {
    setCursor((prev) => {
      let month = prev.month + delta;
      let year = prev.year;
      if (month < 0) {
        month = 11;
        year -= 1;
      } else if (month > 11) {
        month = 0;
        year += 1;
      }
      return { year, month };
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goToMonth(-1)} style={styles.navButton} hitSlop={12}>
          <Text style={[styles.navArrow, { color: colors.tint }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {MONTH_LABELS[cursor.month]} {cursor.year}
        </Text>
        <TouchableOpacity onPress={() => goToMonth(1)} style={styles.navButton} hitSlop={12}>
          <Text style={[styles.navArrow, { color: colors.tint }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((w) => (
          <View key={w} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: colors.textSecondary }]}>{w}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, i) => (
        <View key={i} style={styles.weekRow}>
          {week.map((cell) => {
            const key = dateKey(cell.year, cell.month, cell.day);
            const marking = marksByDate[key];
            const hasEvents = !!marking && marking.types.length > 0;
            const primaryColor = hasEvents ? EVENT_TYPE_COLORS[marking!.types[0]] : null;
            const isSelected = key === selectedDate;
            const isToday = key === todayKey;

            return (
              <TouchableOpacity key={key} onPress={() => onSelectDate(key)} style={styles.dayCell} activeOpacity={0.7}>
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
                      { color: cell.inMonth ? colors.text : colors.textSecondary },
                      !cell.inMonth ? styles.dayTextDim : null,
                      hasEvents && primaryColor ? { color: primaryColor.on, fontWeight: "800" } : null,
                    ]}
                  >
                    {cell.day}
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
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  navArrow: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 28,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "row",
  },
  // flex:1 + aspectRatio:1 makes every cell a perfect square sized purely
  // from available width ÷ 7 — scales correctly on any screen width and
  // guarantees rows can never visually overlap, unlike a fixed row height.
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
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
});

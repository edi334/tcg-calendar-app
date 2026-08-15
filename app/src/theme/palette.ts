import type { EventType, Game } from "../types";

// Each event type gets its own vivid, high-saturation color so days and cards
// are instantly recognizable at a glance without reading text.
export const EVENT_TYPE_COLORS: Record<EventType, { bg: string; on: string }> = {
  prerelease: { bg: "#FFB703", on: "#1A1300" },
  rcq: { bg: "#3A86FF", on: "#FFFFFF" },
  store_championship: { bg: "#8338EC", on: "#FFFFFF" },
  skirmish: { bg: "#FB5607", on: "#FFFFFF" },
  pro_quest: { bg: "#06D6A0", on: "#00332A" },
};

export const EVENT_TYPE_EMOJI: Record<EventType, string> = {
  prerelease: "📦",
  rcq: "🎯",
  store_championship: "🏆",
  skirmish: "⚡",
  pro_quest: "🗺️",
};

export const GAME_EMOJI: Record<Game, string> = {
  mtg: "🔮",
  fab: "⚔️",
};

export const EVENT_TYPE_ORDER: EventType[] = [
  "prerelease",
  "rcq",
  "store_championship",
  "skirmish",
  "pro_quest",
];

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  tint: string;
  tintOn: string;
}

export const lightColors: ThemeColors = {
  background: "#F7F7FA",
  surface: "#FFFFFF",
  surfaceAlt: "#EFEFF5",
  border: "#E2E2E8",
  text: "#16161A",
  textSecondary: "#6B7280",
  tint: "#4F46E5",
  tintOn: "#FFFFFF",
};

export const darkColors: ThemeColors = {
  background: "#101014",
  surface: "#1B1B22",
  surfaceAlt: "#26262F",
  border: "#34343E",
  text: "#F2F2F5",
  textSecondary: "#9C9CA8",
  tint: "#818CF8",
  tintOn: "#101014",
};

export type ToastType = "success" | "error" | "info";

export const TOAST_COLORS: Record<ToastType, { bg: string; on: string; emoji: string }> = {
  success: { bg: "#06D6A0", on: "#00332A", emoji: "✅" },
  error: { bg: "#EF4444", on: "#FFFFFF", emoji: "⚠️" },
  info: { bg: "#3A86FF", on: "#FFFFFF", emoji: "ℹ️" },
};

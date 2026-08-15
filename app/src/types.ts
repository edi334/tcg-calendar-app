export type Game = "mtg" | "fab";

export type EventType =
  | "prerelease"
  | "rcq"
  | "store_championship"
  | "skirmish"
  | "pro_quest";

export interface TcgEvent {
  id: string;
  game: Game;
  eventType: EventType;
  title: string;
  storeName: string;
  address: string;
  country: string | null;
  lat: number | null;
  lng: number | null;
  startTime: string; // ISO 8601 UTC instant
  timezone: string | null;
  distanceKm: number | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  format: string | null;
  sourceUrl: string | null;
}

export interface SearchMeta {
  originQuery: string;
  radiusKm: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  homeAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  events: TcgEvent[];
}

export const GAME_LABELS: Record<Game, string> = {
  mtg: "Magic: The Gathering",
  fab: "Flesh and Blood",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  prerelease: "Prerelease",
  rcq: "Regional Championship Qualifier",
  store_championship: "Store Championship",
  skirmish: "Skirmish",
  pro_quest: "Pro Quest",
};

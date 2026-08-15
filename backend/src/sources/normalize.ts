export type Game = "mtg" | "fab";

export type EventType =
  | "prerelease"
  | "rcq"
  | "store_championship"
  | "skirmish"
  | "pro_quest";

export interface NormalizedEvent {
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
  timezone: string | null; // IANA zone the venue is in, for local-time display
  distanceKm: number | null; // distance from the configured origin (ORIGIN_QUERY)
  priceAmount: number | null;
  priceCurrency: string | null;
  format: string | null;
  sourceUrl: string | null;
}

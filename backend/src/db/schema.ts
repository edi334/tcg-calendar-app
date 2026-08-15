import { doublePrecision, index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    game: text("game").notNull(), // "mtg" | "fab"
    eventType: text("event_type").notNull(), // "prerelease" | "rcq" | "store_championship" | "skirmish" | "pro_quest"
    title: text("title").notNull(),
    storeName: text("store_name").notNull(),
    address: text("address").notNull(),
    country: text("country"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    timezone: text("timezone"),
    distanceKm: doublePrecision("distance_km"),
    priceAmount: doublePrecision("price_amount"),
    priceCurrency: text("price_currency"),
    format: text("format"),
    sourceUrl: text("source_url"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("events_start_time_idx").on(table.startTime),
    index("events_game_type_idx").on(table.game, table.eventType),
  ]
);

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Google "sub" claim
  email: text("email").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  homeAddress: text("home_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export const trips = pgTable(
  "trips",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("trips_user_id_idx").on(table.userId)]
);

export type TripRow = typeof trips.$inferSelect;
export type NewTripRow = typeof trips.$inferInsert;

export const tripEvents = pgTable(
  "trip_events",
  {
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.tripId, table.eventId] })]
);

export type TripEventRow = typeof tripEvents.$inferSelect;

export const notificationSubscriptions = pgTable(
  "notification_subscriptions",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(), // "prerelease" | "rcq" | "store_championship" | "skirmish" | "pro_quest"
  },
  (table) => [primaryKey({ columns: [table.userId, table.eventType] })]
);

export type NotificationSubscriptionRow = typeof notificationSubscriptions.$inferSelect;

export const pushTokens = pgTable(
  "push_tokens",
  {
    token: text("token").primaryKey(), // Expo push token, unique per app install
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("push_tokens_user_id_idx").on(table.userId)]
);

export type PushTokenRow = typeof pushTokens.$inferSelect;

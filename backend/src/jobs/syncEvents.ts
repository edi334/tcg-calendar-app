import { and, gte, inArray, notInArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { events } from "../db/schema.js";
import { notifyNewEvents } from "../notifications/notifyNewEvents.js";
import { fetchFabEvents } from "../sources/fabLocator.js";
import { fetchWizardsEvents } from "../sources/wizardsLocator.js";
import type { NormalizedEvent } from "../sources/normalize.js";

export interface SyncResult {
  wizardsCount: number;
  fabCount: number;
  upserted: number;
  pruned: number;
}

function toRow(ev: NormalizedEvent, syncedAt: Date) {
  return {
    id: ev.id,
    game: ev.game,
    eventType: ev.eventType,
    title: ev.title,
    storeName: ev.storeName,
    address: ev.address,
    country: ev.country,
    lat: ev.lat,
    lng: ev.lng,
    startTime: new Date(ev.startTime),
    timezone: ev.timezone,
    distanceKm: ev.distanceKm,
    priceAmount: ev.priceAmount,
    priceCurrency: ev.priceCurrency,
    format: ev.format,
    sourceUrl: ev.sourceUrl,
    lastSyncedAt: syncedAt,
  };
}

export async function syncEvents(): Promise<SyncResult> {
  const startedAt = new Date();

  const [wizardsResult, fabResult] = await Promise.allSettled([fetchWizardsEvents(), fetchFabEvents()]);

  const wizardsEvents = wizardsResult.status === "fulfilled" ? wizardsResult.value : [];
  const fabEvents = fabResult.status === "fulfilled" ? fabResult.value : [];

  if (wizardsResult.status === "rejected") {
    console.error("[sync] Wizards fetch failed:", wizardsResult.reason);
  }
  if (fabResult.status === "rejected") {
    console.error("[sync] FAB fetch failed:", fabResult.reason);
  }

  const combined = [...wizardsEvents, ...fabEvents];

  if (combined.length === 0) {
    console.warn(
      "[sync] Both sources returned zero events this run; skipping upsert/prune so a transient upstream failure doesn't wipe existing data"
    );
    return { wizardsCount: 0, fabCount: 0, upserted: 0, pruned: 0 };
  }

  const seenIds = combined.map((e) => e.id);
  const existingIds = new Set(
    (await db.select({ id: events.id }).from(events).where(inArray(events.id, seenIds))).map((r) => r.id)
  );
  const newEvents = combined.filter((e) => !existingIds.has(e.id));

  for (const ev of combined) {
    const row = toRow(ev, startedAt);
    await db.insert(events).values(row).onConflictDoUpdate({ target: events.id, set: row });
  }

  // Remove future events that vanished from both sources (e.g. cancelled) —
  // but never touch past events, and never wipe based on a single missing id.
  const pruned = await db
    .delete(events)
    .where(and(gte(events.startTime, startedAt), notInArray(events.id, seenIds)))
    .returning({ id: events.id });

  if (newEvents.length > 0) {
    try {
      await notifyNewEvents(newEvents);
    } catch (err) {
      console.error("[sync] Failed to send new-event notifications:", err);
    }
  }

  return {
    wizardsCount: wizardsEvents.length,
    fabCount: fabEvents.length,
    upserted: combined.length,
    pruned: pruned.length,
  };
}

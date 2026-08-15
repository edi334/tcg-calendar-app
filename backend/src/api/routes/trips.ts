import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../auth/middleware.js";
import { db } from "../../db/client.js";
import { events, tripEvents, trips } from "../../db/schema.js";

export const tripsRouter = Router();

tripsRouter.use(requireAuth);

async function getOwnedTrip(userId: string, tripId: string) {
  const [trip] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .limit(1);
  return trip ?? null;
}

tripsRouter.get("/", async (req: AuthedRequest, res) => {
  try {
    const userTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.userId, req.userId!))
      .orderBy(desc(trips.createdAt));

    const tripIds = userTrips.map((t) => t.id);
    const eventRows = tripIds.length
      ? await db
          .select({ tripId: tripEvents.tripId, event: events })
          .from(tripEvents)
          .innerJoin(events, eq(tripEvents.eventId, events.id))
          .where(inArray(tripEvents.tripId, tripIds))
          .orderBy(asc(events.startTime))
      : [];

    const eventsByTrip = new Map<string, (typeof eventRows)[number]["event"][]>();
    for (const row of eventRows) {
      const list = eventsByTrip.get(row.tripId) ?? [];
      list.push(row.event);
      eventsByTrip.set(row.tripId, list);
    }

    res.json(userTrips.map((trip) => ({ ...trip, events: eventsByTrip.get(trip.id) ?? [] })));
  } catch (err) {
    console.error("[api] GET /api/trips failed:", err);
    res.status(500).json({ error: "Failed to load trips" });
  }
});

tripsRouter.post("/", async (req: AuthedRequest, res) => {
  try {
    const name = typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim() : "New Trip";
    const now = new Date();
    const [trip] = await db
      .insert(trips)
      .values({ id: randomUUID(), userId: req.userId!, name, createdAt: now, updatedAt: now })
      .returning();
    res.status(201).json({ ...trip, events: [] });
  } catch (err) {
    console.error("[api] POST /api/trips failed:", err);
    res.status(500).json({ error: "Failed to create trip" });
  }
});

tripsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  try {
    const trip = await getOwnedTrip(req.userId!, req.params.id);
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    const name = typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim() : trip.name;
    const [updated] = await db
      .update(trips)
      .set({ name, updatedAt: new Date() })
      .where(eq(trips.id, trip.id))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error("[api] PATCH /api/trips/:id failed:", err);
    res.status(500).json({ error: "Failed to rename trip" });
  }
});

tripsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  try {
    const trip = await getOwnedTrip(req.userId!, req.params.id);
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    await db.delete(trips).where(eq(trips.id, trip.id));
    res.status(204).end();
  } catch (err) {
    console.error("[api] DELETE /api/trips/:id failed:", err);
    res.status(500).json({ error: "Failed to delete trip" });
  }
});

tripsRouter.post("/:id/events", async (req: AuthedRequest, res) => {
  try {
    const trip = await getOwnedTrip(req.userId!, req.params.id);
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    const eventId = req.body?.eventId;
    if (typeof eventId !== "string" || !eventId) {
      res.status(400).json({ error: "Missing eventId" });
      return;
    }
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    await db
      .insert(tripEvents)
      .values({ tripId: trip.id, eventId, addedAt: new Date() })
      .onConflictDoNothing();
    await db.update(trips).set({ updatedAt: new Date() }).where(eq(trips.id, trip.id));
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("[api] POST /api/trips/:id/events failed:", err);
    res.status(500).json({ error: "Failed to add event to trip" });
  }
});

tripsRouter.delete("/:id/events/:eventId", async (req: AuthedRequest, res) => {
  try {
    const trip = await getOwnedTrip(req.userId!, req.params.id);
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    await db
      .delete(tripEvents)
      .where(and(eq(tripEvents.tripId, trip.id), eq(tripEvents.eventId, req.params.eventId)));
    await db.update(trips).set({ updatedAt: new Date() }).where(eq(trips.id, trip.id));
    res.status(204).end();
  } catch (err) {
    console.error("[api] DELETE /api/trips/:id/events/:eventId failed:", err);
    res.status(500).json({ error: "Failed to remove event from trip" });
  }
});

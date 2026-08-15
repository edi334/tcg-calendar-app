import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { Router } from "express";
import { db } from "../../db/client.js";
import { events } from "../../db/schema.js";

export const eventsRouter = Router();

function parseListParam(value: unknown): string[] | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value.split(",").map((v) => v.trim());
}

eventsRouter.get("/", async (req, res) => {
  try {
    const games = parseListParam(req.query.game);
    const types = parseListParam(req.query.type);
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;

    const conditions = [];
    if (games?.length) conditions.push(inArray(events.game, games));
    if (types?.length) conditions.push(inArray(events.eventType, types));
    if (from && !Number.isNaN(from.getTime())) conditions.push(gte(events.startTime, from));
    if (to && !Number.isNaN(to.getTime())) conditions.push(lte(events.startTime, to));

    const rows = await db
      .select()
      .from(events)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(events.startTime));

    res.json(rows);
  } catch (err) {
    console.error("[api] GET /api/events failed:", err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

eventsRouter.get("/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(events).where(eq(events.id, req.params.id)).limit(1);
    if (!row) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    console.error("[api] GET /api/events/:id failed:", err);
    res.status(500).json({ error: "Failed to load event" });
  }
});

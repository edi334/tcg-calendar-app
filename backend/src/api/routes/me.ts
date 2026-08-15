import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../auth/middleware.js";
import { db } from "../../db/client.js";
import { notificationSubscriptions, pushTokens, users } from "../../db/schema.js";

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get("/", async (req: AuthedRequest, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error("[api] GET /api/me failed:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

meRouter.put("/", async (req: AuthedRequest, res) => {
  try {
    const { name, homeAddress } = req.body ?? {};
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof name === "string") set.name = name;
    if (typeof homeAddress === "string" || homeAddress === null) set.homeAddress = homeAddress;

    const [user] = await db.update(users).set(set).where(eq(users.id, req.userId!)).returning();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error("[api] PUT /api/me failed:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

meRouter.get("/notification-preferences", async (req: AuthedRequest, res) => {
  try {
    const rows = await db
      .select({ eventType: notificationSubscriptions.eventType })
      .from(notificationSubscriptions)
      .where(eq(notificationSubscriptions.userId, req.userId!));
    res.json({ eventTypes: rows.map((r) => r.eventType) });
  } catch (err) {
    console.error("[api] GET /api/me/notification-preferences failed:", err);
    res.status(500).json({ error: "Failed to load notification preferences" });
  }
});

meRouter.put("/notification-preferences", async (req: AuthedRequest, res) => {
  try {
    const rawEventTypes: unknown[] = Array.isArray(req.body?.eventTypes) ? req.body.eventTypes : [];
    const eventTypes: string[] = [...new Set(rawEventTypes.filter((t): t is string => typeof t === "string"))];
    await db.transaction(async (tx) => {
      await tx.delete(notificationSubscriptions).where(eq(notificationSubscriptions.userId, req.userId!));
      if (eventTypes.length > 0) {
        await tx
          .insert(notificationSubscriptions)
          .values(eventTypes.map((eventType) => ({ userId: req.userId!, eventType })));
      }
    });
    res.json({ eventTypes });
  } catch (err) {
    console.error("[api] PUT /api/me/notification-preferences failed:", err);
    res.status(500).json({ error: "Failed to update notification preferences" });
  }
});

meRouter.post("/push-token", async (req: AuthedRequest, res) => {
  try {
    const token = req.body?.token;
    if (typeof token !== "string" || !token) {
      res.status(400).json({ error: "token is required" });
      return;
    }
    await db
      .insert(pushTokens)
      .values({ token, userId: req.userId!, createdAt: new Date() })
      .onConflictDoUpdate({ target: pushTokens.token, set: { userId: req.userId!, createdAt: new Date() } });
    res.status(204).end();
  } catch (err) {
    console.error("[api] POST /api/me/push-token failed:", err);
    res.status(500).json({ error: "Failed to register push token" });
  }
});

meRouter.delete("/push-token", async (req: AuthedRequest, res) => {
  try {
    const token = req.body?.token;
    if (typeof token !== "string" || !token) {
      res.status(400).json({ error: "token is required" });
      return;
    }
    await db.delete(pushTokens).where(and(eq(pushTokens.token, token), eq(pushTokens.userId, req.userId!)));
    res.status(204).end();
  } catch (err) {
    console.error("[api] DELETE /api/me/push-token failed:", err);
    res.status(500).json({ error: "Failed to remove push token" });
  }
});

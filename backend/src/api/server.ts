import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { config } from "../config.js";
import { syncEvents } from "../jobs/syncEvents.js";
import { openapiSpec } from "./openapi.js";
import { authRouter } from "./routes/auth.js";
import { eventsRouter } from "./routes/events.js";
import { geocodeRouter } from "./routes/geocode.js";
import { meRouter } from "./routes/me.js";
import { tripsRouter } from "./routes/trips.js";

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get("/api/openapi.json", (_req, res) => {
    res.json(openapiSpec);
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/meta", (_req, res) => {
    res.json({
      originQuery: config.originQuery,
      radiusKm: config.radiusKm,
    });
  });

  app.use("/api/events", eventsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/me", meRouter);
  app.use("/api/trips", tripsRouter);
  app.use("/api/geocode", geocodeRouter);

  app.post("/api/sync", async (req, res) => {
    if (req.header("x-sync-token") !== config.syncToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const result = await syncEvents();
      res.json(result);
    } catch (err) {
      console.error("[api] Manual sync failed:", err);
      res.status(500).json({ error: "Sync failed" });
    }
  });

  return app;
}

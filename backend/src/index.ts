import { createServer } from "./api/server.js";
import { config } from "./config.js";
import { runMigrations } from "./db/migrate.js";

async function main() {
  if (config.runMigrationsOnStartup) {
    await runMigrations();
  } else {
    console.log("[migrate] RUN_MIGRATIONS_ON_STARTUP=false — skipping, expecting migrations to have run already");
  }

  const app = createServer();
  app.listen(config.port, () => {
    console.log(`[server] Listening on port ${config.port}`);
  });

  // Fetching events is no longer done in-process here — it runs as its own
  // job (see src/jobs/runOnce.ts), on a schedule via a K8s CronJob (managed
  // directly on the server, not in this repo) in production, or manually
  // via `npm run sync:once` / POST /api/sync.
}

main().catch((err) => {
  console.error("[index] Fatal startup error:", err);
  process.exit(1);
});

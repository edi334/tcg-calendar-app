import { config } from "../config.js";
import { pool } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";
import { syncEvents } from "./syncEvents.js";

// Runs standalone — as a K8s CronJob, a docker-compose loop, or by hand
// (`npm run sync:once`) — so it can't assume the backend server has already
// migrated the DB by the time it starts. Runs migrations itself first
// (same RUN_MIGRATIONS_ON_STARTUP gate as the server; Drizzle's migrator
// takes a Postgres advisory lock, so this is safe even if it races the
// server's own migration on a fresh deploy).
async function main() {
  if (config.runMigrationsOnStartup) {
    await runMigrations();
  }
  const result = await syncEvents();
  console.log("[sync] Done:", result);
  await pool.end();
}

main().catch((err) => {
  console.error("[sync] Failed:", err);
  process.exit(1);
});

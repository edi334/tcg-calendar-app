import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { config } from "../config.js";
import { db, pool } from "./client.js";

async function ensureDatabaseExists() {
  const target = new URL(config.databaseUrl);
  const dbName = decodeURIComponent(target.pathname.replace(/^\//, ""));

  const adminUrl = new URL(target.toString());
  adminUrl.pathname = "/postgres";
  const adminPool = new Pool({ connectionString: adminUrl.toString() });

  try {
    const { rowCount } = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (rowCount === 0) {
      const quotedName = `"${dbName.replace(/"/g, '""')}"`;
      await adminPool.query(`CREATE DATABASE ${quotedName}`);
      console.log(`[migrate] Created database ${dbName}`);
    }
  } finally {
    await adminPool.end();
  }
}

// Leaves the shared pool open — callers that embed this in a longer-lived
// process (like the server on startup) keep using it afterward. The CLI
// entrypoint below closes it explicitly once it's done.
export async function runMigrations(): Promise<void> {
  await ensureDatabaseExists();
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] Migrations applied");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error("[migrate] Failed", err);
      process.exit(1);
    });
}

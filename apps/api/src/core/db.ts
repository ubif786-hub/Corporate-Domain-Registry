// The PostgreSQL connection (orders live there; see features/orders/order.schema.ts).
//
// DATABASE_URL comes from the settings file like every other setting, so it can change without a
// restart. On the droplet it is a Unix-socket address, postgresql://cdr@/cdr?host=/var/run/postgresql:
// the API's system user "cdr" logs in as the database role "cdr" (peer authentication), so there is
// no database password anywhere.
//
// The first use applies any migrations not yet applied (apps/api/drizzle/, copied next to the
// bundle as dist/migrations/). Search and the other pages that need no orders keep working while
// the database is down; order pages answer 503 until it is back.

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "../features/orders/order.schema";
import { config } from "./config";
import { HttpError } from "./http";

export type Db = NodePgDatabase<typeof schema>;

interface Connection { url: string; pool: pg.Pool; db: Db }

let current: Connection | null = null;
let migrated: Promise<void> | null = null;

/** dist/migrations next to the bundle, or apps/api/drizzle when running from the sources (tsx). */
function migrationsFolder(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const dir of [join(here, "migrations"), join(here, "..", "..", "drizzle")]) {
    if (existsSync(join(dir, "meta", "_journal.json"))) return dir;
  }
  throw new Error("database migrations folder not found next to the API");
}

function connect(url: string): Connection {
  const pool = new pg.Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
  // An idle connection dropped by the server must not crash the process; the pool replaces it.
  pool.on("error", (e) => console.error("[db] idle connection lost:", e.message));
  return { url, pool, db: drizzle({ client: pool, schema }) };
}

const unavailable = () => new HttpError(503, "storage", "Orders are unavailable right now. Nothing was charged; try again in a moment.");

/** The connection, migrated. A 503 for the visitor when DATABASE_URL is missing or the database
 *  cannot be reached. */
export async function database(): Promise<Connection> {
  const url = config().databaseUrl;
  if (!url) throw new HttpError(503, "not_configured", "The shop is not fully configured yet.");
  if (!current || current.url !== url) {
    const old = current;
    current = connect(url);
    migrated = null;
    if (old) old.pool.end().catch(() => {});
  }
  const conn = current;
  if (!migrated) {
    migrated = migrate(conn.db, { migrationsFolder: migrationsFolder() }).catch((e) => {
      migrated = null;
      throw e;
    });
  }
  try {
    await migrated;
  } catch (e) {
    console.error("[db] not ready:", e instanceof Error ? e.message : e);
    throw unavailable();
  }
  return conn;
}

/** The Drizzle handle, migrated. */
export async function db(): Promise<Db> {
  return (await database()).db;
}

/** Closes the pool (on shutdown). */
export async function closeDatabase(): Promise<void> {
  const old = current;
  current = null;
  migrated = null;
  if (old) await old.pool.end().catch(() => {});
}

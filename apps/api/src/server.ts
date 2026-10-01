// Starts the API behind nginx, and the sweep that runs every 5 minutes inside it.
//
// Environment (set in the systemd unit; nothing secret):
//   CDR_CONFIG               the settings file (default /srv/cdr/cdr.env)
//   HOST, PORT               default 127.0.0.1 and 4000: only nginx on this server reaches it
//   SWEEP_INTERVAL_SECONDS   default 300; 0 turns the sweep off
//   STATIC_DIR               local testing only: also serve the static export from this folder
//
// Orders live in PostgreSQL (DATABASE_URL in the settings file). Every order change is a
// transaction with the order's row locked, and one driver per order is a database lock, so a second
// process would be safe; one is all the site needs.

import { createApp } from "./app";
import { CONFIG_PATH, tryConfig } from "./core/config";
import { closeDatabase, database } from "./core/db";
import { settleInFlight } from "./core/http";
import { sweep } from "./features/cron/sweep.service";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 4000);
const SWEEP_SECONDS = Number(process.env.SWEEP_INTERVAL_SECONDS ?? 300);

const app = createApp({ staticDir: process.env.STATIC_DIR || undefined });
const server = app.listen(PORT, HOST, () => {
  const c = tryConfig();
  console.log(`[api] listening on http://${HOST}:${PORT}`);
  console.log(c
    ? `[api] settings from ${CONFIG_PATH}: Tucows ${c.opensrsEnv}, Stripe ${c.stripeSecretKey.startsWith("sk_live_") ? "LIVE" : "test"}, mail ${c.mailTransport}`
    : `[api] no settings file at ${CONFIG_PATH}: the shop answers 503 until it exists`);
  // Apply any new migrations now rather than on the first order. If the database is down, the
  // site still serves search; order pages answer 503 and the next use tries again.
  if (c?.databaseUrl) {
    database()
      .then(() => console.log("[db] ready"))
      .catch(() => { /* database() has logged why */ });
  } else if (c) {
    console.log("[db] DATABASE_URL is not set: checkout and orders answer 503");
  }
});

let timer: NodeJS.Timeout | null = null;
if (SWEEP_SECONDS > 0) {
  timer = setInterval(() => {
    sweep(240)
      // "not configured" is expected until the keys are in; only real work is worth a log line.
      .then((r) => { if (r.report.length && r.report[0] !== "not configured") console.log("[sweep]", r.report.join("; ")); })
      .catch((e) => console.error("[sweep]", e instanceof Error ? e.message : e));
  }, SWEEP_SECONDS * 1000);
}

// A restart during a deploy must not cut a registration in half on purpose: stop taking requests,
// give running fulfilment up to a minute to finish, then exit. (If it is cut anyway, the line is
// left "registering" and the next pass asks Tucows before doing anything.)
let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`[api] ${signal}: finishing work in progress`);
  if (timer) clearInterval(timer);
  server.close();
  await settleInFlight(60_000);
  await closeDatabase();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

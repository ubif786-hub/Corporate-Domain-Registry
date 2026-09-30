// Starts the API behind nginx, and the sweep that runs every 5 minutes inside it.
//
// Environment (set in the systemd unit; nothing secret):
//   CDR_CONFIG               the settings file (default /srv/cdr/cdr.env)
//   HOST, PORT               default 127.0.0.1 and 4000: only nginx on this server reaches it
//   SWEEP_INTERVAL_SECONDS   default 300; 0 turns the sweep off
//   STATIC_DIR               local testing only: also serve the static export from this folder
//
// ONE PROCESS. Order changes are safe because one Node process makes them one at a time; a second
// copy of the API on the same orders folder would break that.

import { createApp } from "./app";
import { CONFIG_PATH, tryConfig } from "./core/config";
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
});

let timer: NodeJS.Timeout | null = null;
if (SWEEP_SECONDS > 0) {
  timer = setInterval(() => {
    sweep(240)
      .then((r) => { if (r.report.length) console.log("[sweep]", r.report.join("; ")); })
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
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// The shop's settings and secrets. They live in ONE file outside the web root (on the droplet
// /srv/cdr/cdr.env, root:cdr 640), never in git, never in a log. config.sample.env is the template.
//
// The file is re-read when it changes, so a key can be rotated or the shop switched from test to
// live without restarting the process.
//
// Process environment (set by systemd, not secret):
//   CDR_CONFIG   path of the settings file (default /srv/cdr/cdr.env)
//   PORT, HOST   where the API listens (default 127.0.0.1:4000, behind nginx)

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { HttpError } from "./http";

export interface Config {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  siteUrl: string;
  notifyEmail: string;
  fromEmail: string;
  /** resend: Resend's HTTPS API (DigitalOcean blocks mail ports); file: an outbox folder beside
   *  the orders, for local proof; log: one line per email to the process log, no body. */
  mailTransport: "resend" | "file" | "log";
  resendApiKey: string;
  opensrsEnv: "test" | "live";
  opensrsUsername: string;
  opensrsApiKey: string;
  opensrsNameservers: string[];
  cadRate: number;
  orderSecret: string;
  cronToken: string;
  /** PostgreSQL, where the orders live (core/db.ts). On the droplet a Unix-socket address. */
  databaseUrl: string;
  /** Only the "file" mail transport writes here now (its outbox/ folder). */
  ordersDir: string;
  geoipDb: string;
  /** Local tests only: point the API at a stand-in for Tucows or Stripe. */
  opensrsUrl: string;
  stripeApi: string;
}

export const CONFIG_PATH = resolve(process.env.CDR_CONFIG || "/srv/cdr/cdr.env");

let cached: { stamp: string; config: Config } | null = null;

/** A value still holding the sample's placeholder counts as missing. */
function clean(v: string | undefined): string {
  const s = (v ?? "").trim();
  return s.includes("PASTE") ? "" : s;
}

function parse(raw: Record<string, string | undefined>): Config {
  const siteUrl = clean(raw.SITE_URL).replace(/\/+$/, "");
  let fromEmail = clean(raw.FROM_EMAIL);
  if (!fromEmail && siteUrl) {
    try { fromEmail = "no-reply@" + new URL(siteUrl).hostname.replace(/^www\./, ""); } catch { /* left empty */ }
  }
  const transport = clean(raw.MAIL_TRANSPORT);
  const cadRate = Number(clean(raw.CAD_RATE) || "1");
  return {
    stripeSecretKey: clean(raw.STRIPE_SECRET_KEY),
    stripeWebhookSecret: clean(raw.STRIPE_WEBHOOK_SECRET),
    siteUrl,
    notifyEmail: clean(raw.NOTIFY_EMAIL),
    fromEmail,
    mailTransport: transport === "resend" || transport === "log" ? transport : "file",
    resendApiKey: clean(raw.RESEND_API_KEY),
    opensrsEnv: clean(raw.OPENSRS_ENV) === "live" ? "live" : "test",
    opensrsUsername: clean(raw.OPENSRS_USERNAME),
    opensrsApiKey: clean(raw.OPENSRS_API_KEY),
    opensrsNameservers: clean(raw.OPENSRS_NAMESERVERS).split(",").map((s) => s.trim()).filter(Boolean),
    cadRate: Number.isFinite(cadRate) && cadRate > 0 ? cadRate : 1,
    orderSecret: clean(raw.ORDER_SECRET),
    cronToken: clean(raw.CRON_TOKEN),
    databaseUrl: clean(raw.DATABASE_URL),
    ordersDir: resolve(clean(raw.ORDERS_DIR) || "/srv/cdr/cdr-orders"),
    geoipDb: resolve(clean(raw.GEOIP_DB) || "/srv/cdr/geo/dbip-city-lite.mmdb"),
    opensrsUrl: clean(raw.OPENSRS_URL),
    stripeApi: (clean(raw.STRIPE_API) || "https://api.stripe.com/v1").replace(/\/+$/, ""),
  };
}

/** The settings, or null when the file is missing or unreadable. */
export function tryConfig(): Config | null {
  let stamp: string;
  try {
    const st = statSync(CONFIG_PATH);
    stamp = `${st.mtimeMs}:${st.size}:${st.ctimeMs}`;
  } catch {
    cached = null;
    return null;
  }
  if (cached && cached.stamp === stamp) return cached.config;
  try {
    const config = parse(parseEnv(readFileSync(CONFIG_PATH, "utf8")));
    cached = { stamp, config };
    return config;
  } catch {
    return null;
  }
}

/** The settings; a 503 to the visitor when the file is missing. */
export function config(): Config {
  const c = tryConfig();
  if (!c) throw new HttpError(503, "not_configured", "The shop configuration file is missing.");
  return c;
}

/** The settings, with a 503 unless every named one is filled in. */
export function requireConfig(keys: (keyof Config)[]): Config {
  const c = config();
  for (const k of keys) {
    const v = c[k];
    if (v === "" || (Array.isArray(v) && v.length === 0)) {
      throw new HttpError(503, "not_configured", "The shop is not fully configured yet.");
    }
  }
  return c;
}

/** True unless the Stripe key is a live key: every email and record says so. */
export function isTestMode(c: Config = config()): boolean {
  return !c.stripeSecretKey.startsWith("sk_live_");
}

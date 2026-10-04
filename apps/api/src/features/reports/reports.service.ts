// The owner's notices, to ALERT_EMAIL. The sweep (every 5 minutes) calls both; each keeps its own
// pace in the app_state table, so a restart neither repeats nor skips one.
//
//   LOW BALANCE  the Tucows balance is read every 3 hours. Below LOW_BALANCE_USD an alert goes out,
//                repeated once a day while it stays low: Tucows has no automatic top-up, and an
//                empty balance puts new orders on hold (the customer is then not charged).
//   REPORT       every REPORT_DAYS days at 13:00 UTC (9 a.m. in Toronto in summer): orders, domains,
//                money and buyers since the last report, and the domains coming up for renewal.

import { sql } from "drizzle-orm";
import { isTestMode, type Config } from "../../core/config";
import { db } from "../../core/db";
import { sendMail } from "../../core/mail";
import { money, twoDecimals } from "../../core/money";
import { balance } from "../../integrations/opensrs/client";
import { UNPAID } from "../admin/admin.queries";
import { dayWords, termWords } from "../orders/order.emails";
import { appState } from "./reports.schema";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const RENEWAL_WINDOW_DAYS = 90;

async function getState(key: string): Promise<Record<string, unknown>> {
  const d = await db();
  const rows = await d.select().from(appState).where(sql`${appState.key} = ${key}`);
  return rows[0]?.value ?? {};
}

async function setState(key: string, value: Record<string, unknown>): Promise<void> {
  const d = await db();
  await d.insert(appState).values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appState.key, set: { value, updatedAt: new Date() } });
}

const at = (v: unknown) => (typeof v === "string" ? Date.parse(v) : NaN);
const iso = (ms: number) => new Date(ms).toISOString();
const prefix = (c: Config) => (c.opensrsEnv === "test" ? "[TEST] " : "");

/* ---------- low balance ---------- */

export async function balanceNotice(c: Config, now = Date.now()): Promise<string | null> {
  const s = await getState("balance");
  if (now - at(s.checked_at) < 3 * HOUR_MS) return null;
  const b = await balance();
  if (b === null) return null; // Tucows not reachable: the next sweep asks again
  let alertedAt = b < c.lowBalanceUsd ? s.alerted_at : null;
  let line: string | null = null;
  if (b < c.lowBalanceUsd && !(now - at(alertedAt) < DAY_MS)) {
    const body = [
      `The Tucows reseller balance is $${twoDecimals(b)} USD, below the alert level of $${twoDecimals(c.lowBalanceUsd)}.`,
      "",
      "Every new domain and every renewal is paid from this balance. When it runs out, Tucows puts new orders on hold: the customer is not charged and the domain is not registered.",
      "",
      "Add funds in the Tucows reseller control panel. Tucows has no automatic top-up.",
      "",
      `The balance is checked every 3 hours. This reminder repeats once a day until it is back above $${twoDecimals(c.lowBalanceUsd)}.`,
    ].join("\n") + "\n";
    if (await sendMail(c.alertEmail, `${prefix(c)}Tucows balance is low: $${twoDecimals(b)} USD`, body)) {
      alertedAt = iso(now);
      line = `low balance alert sent ($${twoDecimals(b)})`;
    }
  }
  await setState("balance", { checked_at: iso(now), balance_usd: b, alerted_at: alertedAt ?? null });
  return line;
}

/* ---------- the report ---------- */

/** The next 13:00 UTC after now. */
function nextSlot(now: number): string {
  const d = new Date(now);
  d.setUTCHours(13, 0, 0, 0);
  if (d.getTime() <= now) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

export async function reportNotice(c: Config, now = Date.now()): Promise<string | null> {
  if (c.reportDays <= 0) return null;
  const s = await getState("report");
  const next = at(s.next_at);
  if (Number.isNaN(next)) {
    await setState("report", { next_at: nextSlot(now) });
    return null;
  }
  if (now < next) return null;
  const since = Number.isNaN(at(s.last_sent_at)) ? now - c.reportDays * DAY_MS : at(s.last_sent_at);
  const body = await reportText(c, since, now);
  const subject = `${prefix(c)}Sales report, ${dayWords(iso(since))} to ${dayWords(iso(now))}`;
  if (!(await sendMail(c.alertEmail, subject, body))) return "report not sent; the next sweep tries again";
  let n = next;
  while (n <= now) n += c.reportDays * DAY_MS;
  await setState("report", { next_at: iso(n), last_sent_at: iso(now) });
  return "report sent";
}

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);
const isoOf = (v: unknown) => (v instanceof Date ? v : new Date(String(v))).toISOString();
const amounts = (usd: number, cad: number) => [usd || !cad ? money(usd, "usd") : "", cad ? money(cad, "cad") : ""].filter(Boolean).join(", ");

/** The sales figures for a period: the report email and the admin dashboard's Sales report. Money
 *  is what Stripe captured, in cents, per currency (USD and CAD are never added together). */
export interface SalesReport {
  from: string;
  to: string;
  /** Orders in this payment mode only: test orders while Stripe is in test. */
  test_mode: boolean;
  period: { orders: number; registered: number; renewed: number; failed: number; usd: number; cad: number };
  all: { registered: number; renewed: number; usd: number; cad: number };
  /** Paid orders in the period, oldest first. */
  buyers: {
    order_id: string; created_at: string; name: string; org: string; email: string; phone: string; country: string;
    lines: { domain: string; service: string; state: string; term: number; expires_at: string | null }[];
  }[];
  /** Domains sold or renewed here whose latest known expiry falls in the next RENEWAL_WINDOW_DAYS. */
  expiring: { domain: string; expires_at: string; name: string; email: string; order_id: string }[];
  renewal_window_days: number;
}

export async function reportData(c: Config, since: number, now: number): Promise<SalesReport> {
  const d = await db();
  const testMode = isTestMode(c);
  const unpaid = sql.join(UNPAID.map((s) => sql`${s}`), sql`, `);
  const paid = sql`o.test_mode = ${testMode} and o.status not in (${unpaid})`;
  const from = new Date(since);
  const to = new Date(now);
  const inPeriod = sql`and o.created_at >= ${from} and o.created_at < ${to}`;
  const captured = sql`coalesce((o.stripe->>'amount_captured')::bigint, 0)`;

  const totals = async (window: boolean) => ((await d.execute(sql`
    select count(*)::int as orders,
      coalesce(sum(${captured}) filter (where o.currency = 'usd'), 0)::bigint as usd,
      coalesce(sum(${captured}) filter (where o.currency = 'cad'), 0)::bigint as cad
    from orders o where ${paid} ${window ? inPeriod : sql``}`)).rows[0] ?? {}) as Row;
  const lines = async (window: boolean) => ((await d.execute(sql`
    select
      count(*) filter (where l.state = 'registered' and l.service = 'register')::int as registered,
      count(*) filter (where l.state = 'registered' and l.service = 'renew')::int as renewed,
      count(*) filter (where l.state = 'failed')::int as failed
    from order_lines l join orders o on o.id = l.order_id
    where ${paid} ${window ? inPeriod : sql``}`)).rows[0] ?? {}) as Row;

  const [period, periodLines, total, totalLines] = [await totals(true), await lines(true), await totals(false), await lines(false)];

  const buyers = (await d.execute(sql`
    select o.id, o.created_at, o.email, trim(concat_ws(' ', o.registrant->>'first_name', o.registrant->>'last_name')) as name,
      coalesce(o.registrant->>'org_name', '') as org, coalesce(o.registrant->>'country', '') as country,
      coalesce(o.registrant->>'phone', '') as phone,
      json_agg(json_build_object('domain', l.domain, 'service', l.service, 'state', l.state, 'term', l.term, 'expires_at', l.expires_at) order by l.position) as lines
    from orders o join order_lines l on l.order_id = o.id
    where ${paid} ${inPeriod}
    group by o.id order by o.created_at
    limit 500`)).rows as Row[];

  // The latest known expiry of each domain sold or renewed here.
  const expiring = (await d.execute(sql`
    select * from (
      select distinct on (lower(l.domain)) l.domain, l.expires_at, o.email, o.id as order_id,
        trim(concat_ws(' ', o.registrant->>'first_name', o.registrant->>'last_name')) as name
      from order_lines l join orders o on o.id = l.order_id
      where ${paid} and l.state = 'registered' and l.expires_at is not null
      order by lower(l.domain), l.expires_at desc
    ) latest
    where latest.expires_at >= ${to} and latest.expires_at < ${new Date(now + RENEWAL_WINDOW_DAYS * DAY_MS)}
    order by latest.expires_at`)).rows as Row[];

  return {
    from: iso(since),
    to: iso(now),
    test_mode: testMode,
    period: {
      orders: num(period.orders), registered: num(periodLines.registered), renewed: num(periodLines.renewed),
      failed: num(periodLines.failed), usd: num(period.usd), cad: num(period.cad),
    },
    all: { registered: num(totalLines.registered), renewed: num(totalLines.renewed), usd: num(total.usd), cad: num(total.cad) },
    buyers: buyers.map((r) => ({
      order_id: String(r.id), created_at: isoOf(r.created_at), name: String(r.name ?? ""), org: String(r.org ?? ""),
      email: String(r.email ?? ""), phone: String(r.phone ?? ""), country: String(r.country ?? ""),
      lines: ((r.lines as Row[]) ?? []).map((l) => ({
        domain: String(l.domain), service: String(l.service), state: String(l.state), term: num(l.term),
        expires_at: l.expires_at ? isoOf(l.expires_at) : null,
      })),
    })),
    expiring: expiring.map((r) => ({ domain: String(r.domain), expires_at: isoOf(r.expires_at), name: String(r.name ?? ""), email: String(r.email ?? ""), order_id: String(r.order_id) })),
    renewal_window_days: RENEWAL_WINDOW_DAYS,
  };
}

/** The report email's text. */
export async function reportText(c: Config, since: number, now: number): Promise<string> {
  const r = await reportData(c, since, now);
  const b = await balance();
  const out: string[] = [];
  out.push("Corporate Domain Registry, sales report" + (r.test_mode ? " (TEST orders: no real money)" : ""));
  out.push(`${dayWords(r.from)} to ${dayWords(r.to)}`, "");
  out.push("THIS PERIOD");
  out.push(`Orders paid: ${r.period.orders}`);
  out.push(`New domains registered: ${r.period.registered}`);
  out.push(`Domains renewed: ${r.period.renewed}`);
  out.push(`Not completed (the customer was not charged): ${r.period.failed}`);
  out.push(`Money taken: ${amounts(r.period.usd, r.period.cad)}`, "");

  out.push("BUYERS THIS PERIOD");
  if (!r.buyers.length) out.push("None.");
  for (const o of r.buyers) {
    out.push(`${dayWords(o.created_at)}, ${o.name}${o.org ? ` (${o.org})` : ""}, ${o.email}, ${o.country}`);
    for (const l of o.lines) {
      const what = l.state === "registered" ? (l.service === "renew" ? "renewed" : "registered") : l.state === "failed" ? "not completed" : "in progress";
      out.push(`  ${l.domain}: ${what}, ${termWords(l.term)}`);
    }
  }
  out.push("");

  out.push(`COMING UP FOR RENEWAL IN THE NEXT ${r.renewal_window_days} DAYS`);
  if (!r.expiring.length) out.push("None.");
  for (const e of r.expiring) out.push(`${e.domain} expires ${dayWords(e.expires_at)}: ${e.name}, ${e.email}`);
  out.push(`Customers renew on ${c.siteUrl}/renew/`, "");

  out.push("SINCE THE SHOP OPENED");
  out.push(`Domains registered: ${r.all.registered}, renewed: ${r.all.renewed}`);
  out.push(`Money taken: ${amounts(r.all.usd, r.all.cad)}`, "");

  out.push(`Tucows balance now: ${b === null ? "could not be read" : "$" + twoDecimals(b) + " USD"}`, "");
  out.push(`Every order, with contact details, is in the admin panel: ${c.siteUrl}/admin/ ("Download all (CSV)" on the Orders page).`);
  return out.join("\n") + "\n";
}

// Renewal reminders to customers: 60, 30, 7 and 1 days before a domain expires, the day after, then
// weekly while Tucows can still renew it. Each email links to /renew/?domain=. A domain renewed
// here or elsewhere starts a new cycle; a missed reminder is not sent late. Runs in the sweep.

import { sql } from "drizzle-orm";
import { priceCents, type Currency } from "@cdr/shared";
import { isTestMode, type Config } from "../../core/config";
import { db } from "../../core/db";
import { sendMail } from "../../core/mail";
import { money } from "../../core/money";
import { domainExpiry } from "../../integrations/opensrs/client";
import { dayWords } from "../orders/order.emails";
import { appState } from "../reports/reports.schema";
import { expiringBetween, getState, setState } from "../reports/reports.service";

const DAY_MS = 86_400_000;
const BEFORE_DAYS = [60, 30, 7, 1];
// Past this, Tucows can't renew it anyway.
const AFTER_DAYS = 90;
// Spread out over the sweeps.
const PER_PASS = 10;
// ponytail: leaves room under Resend's free 100 a day for order emails; raise it with a paid plan.
const PER_DAY = 50;
const DAY_KEY = "reminders:day";

/** How many reminders are due by now for this expiry. */
export function remindersDue(expiry: number, now: number): number {
  let n = BEFORE_DAYS.filter((d) => now >= expiry - d * DAY_MS).length;
  if (now >= expiry + DAY_MS) n += 1 + Math.floor((now - expiry - DAY_MS) / (7 * DAY_MS));
  return n;
}

interface Sent { expires_at?: string; sent?: number; stopped?: boolean }

export async function renewalReminders(c: Config, now = Date.now()): Promise<string | null> {
  const domains = await expiringBetween(c, new Date(now - AFTER_DAYS * DAY_MS), new Date(now + (BEFORE_DAYS[0] + 1) * DAY_MS));
  if (!domains.length) return null;
  const d = await db();
  const rows = await d.select().from(appState).where(sql`${appState.key} like 'renewal:%'`);
  const state = new Map(rows.map((r) => [r.key, r.value as Sent]));

  const today = new Date(now).toISOString().slice(0, 10);
  const day = await getState(DAY_KEY);
  let sentToday = day.date === today ? Number(day.sent) || 0 : 0;
  let sent = 0;
  for (const e of domains) {
    if (sent >= PER_PASS || sentToday >= PER_DAY) break;
    const key = "renewal:" + e.domain.toLowerCase();
    const s = state.get(key) ?? {};
    // A later expiry found at Tucows (renewed outside the shop) wins over ours.
    const expiry = Math.max(Date.parse(e.expires_at), Date.parse(s.expires_at ?? "") || 0);
    const done = s.expires_at && Date.parse(s.expires_at) === expiry ? s : { sent: 0 };
    const due = remindersDue(expiry, now);
    if (done.stopped || due <= (done.sent ?? 0)) continue;

    const t = await domainExpiry(e.domain);
    if (t.status === "error") continue;
    if (t.status === "not_ours") {
      await setState(key, { expires_at: new Date(expiry).toISOString(), sent: due, stopped: true });
      continue;
    }
    if (Date.parse(t.expires_at) > expiry + DAY_MS) {
      await setState(key, { expires_at: t.expires_at, sent: 0 });
      continue;
    }
    if (!(await sendMail(e.email, (isTestMode(c) ? "[TEST] " : "") + subject(e.domain, expiry, now), body(c, e.domain, e.first_name, e.currency, expiry, now)))) break;
    await setState(key, { expires_at: new Date(expiry).toISOString(), sent: due });
    sent++;
    sentToday++;
  }
  if (sent) await setState(DAY_KEY, { date: today, sent: sentToday });
  return sent ? `${sent} renewal ${sent === 1 ? "email" : "emails"} sent` : null;
}

function subject(domain: string, expiry: number, now: number): string {
  return now < expiry ? `Renew ${domain}: it expires on ${dayWords(new Date(expiry).toISOString())}` : `${domain} has expired: renew it to keep it`;
}

function body(c: Config, domain: string, firstName: string, currency: Currency, expiry: number, now: number): string {
  const day = dayWords(new Date(expiry).toISOString());
  const left = Math.ceil((expiry - now) / DAY_MS);
  const link = `${c.siteUrl}/renew/?domain=${encodeURIComponent(domain)}`;
  const out = [`Hi ${firstName || "there"},`, ""];
  if (now < expiry) {
    out.push(`Your domain ${domain} expires on ${day}` + (left > 1 ? `, in ${left} days.` : ", tomorrow.") + " Renew it now so your website and email keep working without a break:");
  } else {
    out.push(`Your domain ${domain} expired on ${day}. Your website and email may stop working. You can still renew it for a short time:`);
  }
  out.push("", "  " + link, "");
  const year = priceCents(1, currency, c.cadRate);
  if (year) out.push(`Renewing for 1 year costs ${money(year, currency)}` + (c.gstHstNumber ? " (plus GST/HST in Canada)" : "") + ". Longer terms are on the renewal page.", "");
  if (now >= expiry) out.push("If it is not renewed, the domain is deleted and anyone can register it.", "");
  out.push(`You get this email because ${domain} is registered with Corporate Domain Registry. These emails stop once it is renewed.`);
  out.push("", `Questions? Reply to this email or write to ${c.notifyEmail}.`, "", "Corporate Domain Registry", c.siteUrl);
  return out.join("\n") + "\n";
}

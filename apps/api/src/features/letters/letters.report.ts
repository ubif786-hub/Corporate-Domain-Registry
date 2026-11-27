// How a mailing is doing: every letter's furthest step (sent, QR scanned, checkout started, paid,
// done, refunded or cancelled), the figures per country, and the money taken. Built from the
// mailing's letters, the QR scans (letter_scans) and the order lines that carry a letter's number.

import { between, eq, sql } from "drizzle-orm";
import type { Currency } from "@cdr/shared";
import { db } from "../../core/db";
import { plainAmount } from "../../core/money";
import { UNPAID } from "../admin/admin.queries";
import { row } from "../admin/admin.csv";
import type { OrderStripe } from "../orders/order.types";
import { refText, type Letter } from "./letters.lists";
import { letterScans, mailings } from "./letters.schema";
import { summary, type MailingSummary } from "./letters.service";

export const LETTER_STATUSES = ["sent", "scanned", "checkout", "refunded", "paid", "done"] as const;
export type LetterStatus = (typeof LETTER_STATUSES)[number];
const RANK = Object.fromEntries(LETTER_STATUSES.map((s, i) => [s, i])) as Record<LetterStatus, number>;

export interface LetterRow extends Letter {
  status: LetterStatus;
  /** What a done letter became. */
  done_as?: "moved" | "renewed" | "registered";
  scans: number;
  first_scan?: string;
  last_scan?: string;
  /** The order that got furthest, and who filled it in. */
  order_id?: string;
  order_at?: string;
  contact?: { name: string; email: string; phone: string; reminders: boolean };
  revenue_cents: number;
  currency?: Currency;
}

export interface Funnel {
  letters: number;
  scanned: number;
  checkout: number;
  paid: number;
  done: number;
  moved: number;
  renewed: number;
  refunded: number;
  /** Taken and kept, GST/HST left out. */
  revenue: { usd: number; cad: number };
}

export interface MailingReport { mailing: MailingSummary; countries: { CA: Funnel; US: Funnel }; letters: LetterRow[] }

const NOT_PAID = new Set<string>([...UNPAID, "payment_failed"]);
const iso = (v: unknown) => new Date(v as string).toISOString();
const emptyFunnel = (): Funnel => ({ letters: 0, scanned: 0, checkout: 0, paid: 0, done: 0, moved: 0, renewed: 0, refunded: 0, revenue: { usd: 0, cad: 0 } });

interface LineRow {
  letter_ref: string; domain: string; service: string; state: string; amount_cents: number;
  id: string; status: string; currency: Currency; created_at: unknown; stripe: OrderStripe;
  registrant: { first_name?: string; last_name?: string; org_name?: string; email?: string; phone?: string };
  reminder_consent_at: unknown; live_cents: number;
}

/** A line's share of what its order kept: the capture less refunds and GST/HST, split over the
 *  lines still standing by their price. Failed lines kept nothing. */
function lineRevenue(l: LineRow): number {
  if (NOT_PAID.has(l.status) || l.state === "failed" || !l.live_cents) return 0;
  const s = l.stripe ?? {};
  const kept = (s.amount_captured ?? 0) - (s.amount_refunded ?? 0);
  const tax = s.amount_tax && s.amount_authorized ? Math.round((kept * s.amount_tax) / s.amount_authorized) : 0;
  return Math.max(0, Math.round(((kept - tax) * l.amount_cents) / l.live_cents));
}

function lineStatus(l: LineRow): LetterStatus {
  if (NOT_PAID.has(l.status)) return "checkout";
  if (l.state === "registered") return "done";
  if (l.state === "failed") return "refunded";
  return "paid";
}

export async function mailingReport(id: number, testMode: boolean): Promise<MailingReport | null> {
  const d = await db();
  const [m] = await d.select().from(mailings).where(eq(mailings.id, id));
  if (!m) return null;
  const scans = new Map((await d.select().from(letterScans).where(between(letterScans.ref, m.firstRef, m.lastRef))).map((s) => [s.ref, s]));
  const lines = (await d.execute(sql`
    select l.letter_ref, l.domain, l.service, l.state, l.amount_cents, o.id, o.status, o.currency, o.created_at, o.stripe,
      o.registrant, o.reminder_consent_at,
      (select coalesce(sum(x.amount_cents), 0) from order_lines x where x.order_id = o.id and x.state <> 'failed')::int as live_cents
    from order_lines l join orders o on o.id = l.order_id
    where l.letter_ref is not null and l.letter_ref::int between ${m.firstRef} and ${m.lastRef} and o.test_mode = ${testMode}
    order by o.created_at`)).rows as unknown as LineRow[];
  const byRef = new Map<number, LineRow[]>();
  for (const l of lines) {
    const ref = Number(l.letter_ref);
    byRef.set(ref, [...(byRef.get(ref) ?? []), l]);
  }

  const countries = { CA: emptyFunnel(), US: emptyFunnel() };
  const rows: LetterRow[] = m.letters.map((letter) => {
    const s = scans.get(letter.ref);
    const r: LetterRow = { ...letter, status: s ? "scanned" : "sent", scans: s?.count ?? 0, revenue_cents: 0 };
    if (s) { r.first_scan = s.firstAt.toISOString(); r.last_scan = s.lastAt.toISOString(); }
    // Only lines for this letter's own domain count; a number typed onto another domain doesn't.
    let best: LineRow | null = null;
    for (const l of (byRef.get(letter.ref) ?? []).filter((x) => x.domain === letter.domain)) {
      r.revenue_cents += lineRevenue(l);
      // The letter decides the currency, so its orders share one.
      r.currency = l.currency;
      if (!best || RANK[lineStatus(l)] >= RANK[lineStatus(best)]) best = l;
    }
    if (best) {
      r.status = lineStatus(best);
      if (r.status === "done") r.done_as = best.service === "transfer" ? "moved" : best.service === "renew" ? "renewed" : "registered";
      r.order_id = best.id;
      r.order_at = iso(best.created_at);
      const g = best.registrant ?? {};
      r.contact = {
        name: [g.first_name, g.last_name].filter(Boolean).join(" ") + (g.org_name ? `, ${g.org_name}` : ""),
        email: g.email ?? "",
        phone: g.phone ?? "",
        reminders: Boolean(best.reminder_consent_at),
      };
    }

    const f = countries[letter.country];
    const rank = RANK[r.status];
    f.letters++;
    // A checkout passes through the letter's page, so it counts as a scan even from before scans were counted.
    if (rank >= RANK.scanned) f.scanned++;
    if (rank >= RANK.checkout) f.checkout++;
    if (rank >= RANK.refunded) f.paid++;
    if (r.status === "done") f.done++;
    if (r.done_as === "moved") f.moved++;
    if (r.done_as === "renewed") f.renewed++;
    if (r.status === "refunded") f.refunded++;
    if (r.currency) f.revenue[r.currency] += r.revenue_cents;
    return r;
  });
  return { mailing: summary(m), countries, letters: rows };
}

const STATUS_WORDS: Record<LetterStatus, string> = {
  sent: "Not scanned", scanned: "Scanned only", checkout: "Started checkout", paid: "Paid, in progress", done: "Done", refunded: "Refunded or cancelled",
};
const DONE_WORDS = { moved: "Moved to us", renewed: "Renewed", registered: "Registered" };

/** The letters for a spreadsheet, optionally one status or one country. */
export function mailingReportCsv(r: MailingReport, status: string, country: string): string {
  let out = "﻿" + row(["reference", "country", "envelope", "domain", "expires", "name", "company", "street", "city", "province_state", "postal_code",
    "status", "qr_scans", "first_scan_utc", "last_scan_utc", "order", "ordered_utc", "contact_name", "contact_email", "contact_phone", "reminder_emails_ok", "revenue", "currency"]);
  for (const l of r.letters) {
    if ((status && l.status !== status) || (country && l.country !== country)) continue;
    out += row([
      refText(l.ref), l.country === "CA" ? "Canada" : "USA", l.envelope, l.domain, l.expires, l.name, l.company, l.street, l.city, l.state, l.postal,
      l.done_as ? DONE_WORDS[l.done_as] : STATUS_WORDS[l.status], l.scans, l.first_scan ?? "", l.last_scan ?? "",
      l.order_id ?? "", l.order_at ?? "", l.contact?.name ?? "", l.contact?.email ?? "", l.contact?.phone ?? "",
      l.contact ? (l.contact.reminders ? "yes" : "no") : "",
      l.revenue_cents ? plainAmount(l.revenue_cents) : "", l.revenue_cents && l.currency ? l.currency.toUpperCase() : "",
    ]);
  }
  return out;
}

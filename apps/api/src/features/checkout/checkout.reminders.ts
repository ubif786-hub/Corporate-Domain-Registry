// Reminder emails for checkouts nobody paid for, only to customers who ticked "email me a reminder"
// at checkout. The days and the wording are set in the admin (Letters page), kept in app_state.
// Each email links back to the domains and ends with a link to stop them. Runs in the sweep, inside
// the same daily cap as the renewal emails.

import { timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import { sql } from "drizzle-orm";
import { isTestMode, type Config } from "../../core/config";
import { db } from "../../core/db";
import { allow, HttpError } from "../../core/http";
import { sendMail } from "../../core/mail";
import { getState, setState } from "../reports/reports.service";
import { DAY_KEY, PER_DAY } from "../renew/renew.reminders";
import { isValidOrderId, note, readOrder, remindersToken, updateOrder } from "../orders/order.store";
import type { Order } from "../orders/order.types";

export interface ReminderSettings { on: boolean; days: number[]; subject: string; body: string }

export const DEFAULT_REMINDERS: ReminderSettings = {
  on: false,
  days: [2, 7],
  subject: "Your order for {domains} is not finished",
  body: "Hi {first_name},\n\nYou started an order for {domains} with Corporate Domain Registry, but the payment was not finished, so nothing was charged.\n\nYou can pick up where you left off here:",
};

const KEY = "checkout_reminders";
const DAY_MS = 86_400_000;
const PER_PASS = 10;
const MAX_DAYS = 60;
const NOT_PAID = ["pending_payment", "expired", "stripe_error", "payment_failed"];

export async function reminderSettings(): Promise<ReminderSettings> {
  const s = await getState(KEY);
  return {
    on: s.on === true,
    days: Array.isArray(s.days) ? s.days.map(Number) : DEFAULT_REMINDERS.days,
    subject: typeof s.subject === "string" ? s.subject : DEFAULT_REMINDERS.subject,
    body: typeof s.body === "string" ? s.body : DEFAULT_REMINDERS.body,
  };
}

/** The admin's form, checked: days like "2, 7" (1 to 60, up to five), a one-line subject, a body. */
export function cleanSettings(raw: unknown): ReminderSettings {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const days = [...new Set(String(Array.isArray(b.days) ? b.days.join(",") : b.days ?? "").split(/[\s,]+/).filter(Boolean).map(Number))].sort((x, y) => x - y);
  if (!days.length || days.length > 5 || days.some((n) => !Number.isInteger(n) || n < 1 || n > MAX_DAYS)) {
    throw new HttpError(400, "invalid", `Enter up to five days between 1 and ${MAX_DAYS}, for example 2, 7.`, { field: "days" });
  }
  const subject = String(b.subject ?? "").replace(/\s+/g, " ").trim();
  if (subject.length < 3 || subject.length > 150) throw new HttpError(400, "invalid", "Write a subject between 3 and 150 characters.", { field: "subject" });
  const body = String(b.body ?? "").replace(/\r\n?/g, "\n").trim();
  if (body.length < 10 || body.length > 3000) throw new HttpError(400, "invalid", "Write a message between 10 and 3,000 characters.", { field: "body" });
  return { on: b.on === true, days, subject, body };
}

export const saveSettings = (s: ReminderSettings) => setState(KEY, { ...s });

const listed = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);

/** The email for this order: the admin's wording, then a link per domain and the stop link. */
export function reminderEmail(c: Config, s: ReminderSettings, o: Pick<Order, "id" | "registrant" | "lines">): { subject: string; body: string } {
  const fill = (t: string) => t.replaceAll("{first_name}", o.registrant.first_name || "there").replaceAll("{domains}", listed(o.lines.map((l) => l.domain)));
  const links = o.lines.map((l) => {
    const url = l.service === "register"
      ? `${c.siteUrl}/search/?domain=${encodeURIComponent(l.domain)}`
      : `${c.siteUrl}/renew/?domain=${encodeURIComponent(l.domain)}${l.letter_ref ? `&ref=${l.letter_ref}` : ""}`;
    return `  ${l.domain}: ${url}`;
  });
  const stop = `${c.siteUrl}/api/reminders/stop/?order=${o.id}&t=${remindersToken(o.id)}`;
  const body = [
    fill(s.body), "", ...links, "",
    "You get this email because you asked for a reminder when you started this order. To stop these reminders, open this link:",
    "  " + stop, "",
    `Questions? Reply to this email or write to ${c.notifyEmail}.`, "",
    // Canada's anti-spam law wants the sender's mailing address in every reminder.
    "Corporate Domain Registry", "100 Mural Street, Suite 100, Richmond Hill, ON L4B 1J3", "1-855-363-6624", c.siteUrl,
  ].join("\n") + "\n";
  return { subject: (isTestMode(c) ? "[TEST] " : "") + fill(s.subject), body };
}

const stopAll = (o: Order, why: string, days: number) =>
  updateOrder(o.id, (x) => { x.reminders_sent = days; note(x, `No more reminder emails: ${why}.`); return x; });

export async function checkoutReminders(c: Config, now = Date.now()): Promise<string | null> {
  const s = await reminderSettings();
  if (!s.on || !s.days.length) return null;
  const d = await db();
  const due = (createdAt: string) => s.days.filter((n) => now >= Date.parse(createdAt) + n * DAY_MS).length;
  const rows = (await d.execute<{ id: string }>(sql`
    select id from orders
    where reminder_consent_at is not null and status in ('expired', 'payment_failed') and test_mode = ${isTestMode(c)}
      and reminders_sent < ${s.days.length} and created_at > ${new Date(now - (Math.max(...s.days) + 2) * DAY_MS)}
    order by created_at desc limit 200`)).rows;

  const today = new Date(now).toISOString().slice(0, 10);
  const day = await getState(DAY_KEY);
  let sentToday = day.date === today ? Number(day.sent) || 0 : 0;
  let sent = 0;
  const seen = new Set<string>();
  for (const { id } of rows) {
    if (sent >= PER_PASS || sentToday >= PER_DAY) break;
    const o = await readOrder(id);
    if (!o) continue;
    const email = o.registrant.email.toLowerCase();
    // Only the newest unpaid checkout per customer gets reminders.
    if (seen.has(email)) { await stopAll(o, "a newer checkout from the same email", s.days.length); continue; }
    seen.add(email);
    const n = due(o.created_at);
    if (n <= (o.reminders_sent ?? 0)) continue;
    const domains = o.lines.map((l) => l.domain.toLowerCase());
    const bought = (await d.execute(sql`
      select 1 from order_lines l join orders x on x.id = l.order_id
      where lower(l.domain) in (${sql.join(domains.map((x) => sql`${x}`), sql`, `)}) and x.created_at > ${new Date(o.created_at)}
        and x.status not in (${sql.join(NOT_PAID.map((x) => sql`${x}`), sql`, `)}) limit 1`)).rows.length > 0;
    if (bought) { await stopAll(o, "the domains were ordered and paid for since", s.days.length); continue; }

    const m = reminderEmail(c, s, o);
    if (!(await sendMail(o.registrant.email, m.subject, m.body))) break;
    await updateOrder(id, (x) => { x.reminders_sent = n; note(x, `Reminder email ${n} of ${s.days.length} sent to ${o.registrant.email}.`); return x; });
    sent++;
    sentToday++;
  }
  if (sent) await setState(DAY_KEY, { date: today, sent: sentToday });
  return sent ? `${sent} checkout ${sent === 1 ? "reminder" : "reminders"} sent` : null;
}

/* ---------- the stop link ---------- */

const page = (title: string, text: string, form = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 36rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.5; color: #1a1a1a">
<h1 style="font-size: 1.5rem">${title}</h1><p>${text}</p>${form}<p><a href="/">Corporate Domain Registry</a></p></body></html>`;

export const remindersRouter = Router();

// GET shows a button and POST stops them, so a mail scanner opening the link changes nothing.
remindersRouter.all("/api/reminders/stop", allow("GET", "POST"), express.urlencoded({ extended: false, limit: "2kb" }), async (req, res) => {
  const v = (k: string) => String(req.method === "POST" ? req.body?.[k] ?? "" : req.query[k] ?? "");
  const id = v("order");
  const t = v("t");
  const ok = isValidOrderId(id) && /^[a-f0-9]{32}$/.test(t) && timingSafeEqual(Buffer.from(t), Buffer.from(remindersToken(id)));
  const o = ok ? await readOrder(id) : null;
  res.set("Content-Type", "text/html; charset=utf-8");
  if (!o) {
    res.status(404).send(page("This link does not work", "It may be cut short. Open the link from the email again, or reply to the email and we will stop the reminders for you."));
    return;
  }
  if (req.method === "GET") {
    res.send(page("Stop the reminder emails?", "We will not send any more reminders about unfinished orders to this email address.",
      `<form method="post"><input type="hidden" name="order" value="${id}"><input type="hidden" name="t" value="${t}"><button type="submit" style="font: inherit; padding: 0.5rem 1rem; cursor: pointer">Stop the reminders</button></form>`));
    return;
  }
  const d = await db();
  await d.execute(sql`update orders set reminder_consent_at = null where lower(email) = ${o.registrant.email.toLowerCase()}`);
  await updateOrder(id, (x) => { note(x, "The customer stopped the reminder emails."); return x; });
  res.send(page("Reminders stopped", "You will not get any more reminder emails from us about unfinished orders."));
});

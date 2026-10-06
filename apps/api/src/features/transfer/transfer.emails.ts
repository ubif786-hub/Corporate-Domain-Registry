// Customer emails for transfers: code request, refused code, reminders, and how it ended.
// Each is marked on the line once sent, so the sweep can retry without sending twice.

import { TRANSFER_STEPS, transferGuide, type TransferGuide } from "@cdr/shared";
import { config } from "../../core/config";
import { sendMail } from "../../core/mail";
import { money } from "../../core/money";
import { isoNow, toUnix, unixNow } from "../../core/time";
import { dayWords, orderSummary, resultLines, subjectPrefix, termWords } from "../orders/order.emails";
import { readOrder, transferToken, updateOrder } from "../orders/order.store";
import { MAX_ATTEMPTS, type LineTransfer, type Order, type OrderLine } from "../orders/order.types";

// Days after payment. The last reminder goes out a week before the refund.
const REMINDER_DAYS = [3, 10, 30, 60];

export function reminderDays(codeDays: number): number[] {
  const last = codeDays - 7;
  return [...REMINDER_DAYS.filter((d) => d < last), ...(last > 0 ? [last] : [])];
}

type At = { l: OrderLine; i: number };

export async function transferNotices(id: string): Promise<void> {
  const o = await readOrder(id);
  if (!o?.stripe.settled_at) return;
  const xfers: At[] = o.lines.map((l, i) => ({ l, i })).filter((x) => x.l.service === "transfer");
  if (!xfers.length) return;
  const c = config();
  const paid = toUnix(o.stripe.authorized_at ?? o.created_at) ?? unixNow();
  const refundOn = dayWords(new Date((paid + c.transferCodeDays * 86_400) * 1000).toISOString());
  const to = o.registrant.email;
  const send = (subject: string, body: string[]) => sendMail(to, subjectPrefix(o) + subject, [`Hi ${o.registrant.first_name},`, "", ...body, ...signOff(o)].join("\n") + "\n");

  // First email: ask for the code. CDR hears about the sale too.
  const unasked = xfers.filter((x) => !x.l.transfer?.asked_at && x.l.state === "awaiting_code");
  if (unasked.length) {
    const others = o.lines.filter((l) => l.service !== "transfer");
    const body = [`Thank you for your order. ${charged(o)}`.trim(), ""];
    if (others.length) body.push(...resultLines(others, true));
    body.push(...codeRequest(o, unasked, refundOn));
    if (!(await send(`Your order ${o.id}: one more step to move ${names(unasked)}`, body))) return;
    await mark(id, unasked, { asked_at: isoNow() });
    await sendMail(c.notifyEmail, `${subjectPrefix(o)}New order ${o.id}, ${money(o.stripe.amount_captured ?? 0, o.currency)} (waiting for transfer codes)`, orderSummary(o));
    return;
  }

  const schedule = reminderDays(c.transferCodeDays);
  const due = schedule.filter((d) => unixNow() - paid >= d * 86_400).length;

  // Refused or cancelled: ask for a new code now (this counts as the due reminder).
  for (const x of xfers) {
    const t = x.l.transfer ?? {};
    if (x.l.state !== "awaiting_code" || !t.last_error || t.error_told) continue;
    const left = Math.max(0, MAX_ATTEMPTS - x.l.attempts);
    const cancelled = t.status === "cancelled";
    const body = [
      cancelled
        ? `The transfer of ${x.l.domain} was cancelled before it finished. The reply we got: "${t.last_error}".`
        : `The transfer code you sent for ${x.l.domain} did not work. The reply we got: "${t.last_error}".`,
      "",
      "This usually means the code was mistyped or has expired, the domain is still locked, or the transfer was turned down at the company it is with now. Check that the transfer lock is off, get a new code and send it with the same link:",
      "  " + codeLink(o, x.i),
      "",
      `You can send ${left} more ${left === 1 ? "code" : "codes"}. If we don't receive a working code by ${refundOn}, we refund ${x.l.domain} in full.`,
    ];
    const subject = cancelled ? `The transfer of ${x.l.domain} was cancelled` : `The transfer code for ${x.l.domain} did not work`;
    if (await send(subject, body)) await mark(id, [x], { error_told: true, reminded: due });
  }

  // One reminder email for all domains still waiting on a code.
  const fresh = await readOrder(id);
  const waiting = (fresh ?? o).lines.map((l, i) => ({ l, i })).filter((x) => x.l.service === "transfer" && x.l.state === "awaiting_code" && (x.l.transfer?.reminded ?? 0) < due);
  if (waiting.length) {
    const last = due === schedule.length;
    const amount = waiting.reduce((sum, x) => sum + (x.l.transfer?.charged_cents ?? 0), 0);
    const body = [
      `You paid to move ${names(waiting)} to Corporate Domain Registry on ${dayWords(new Date(paid * 1000).toISOString())}, and we are still waiting for the transfer code.`,
      "",
      ...steps(waiting),
      "",
      "Send the code here:",
      ...waiting.map((x) => `  ${x.l.domain}: ${codeLink(o, x.i)}`),
      "",
      last
        ? `This is our last reminder. If we don't receive a working code by ${refundOn}, we cancel the move and refund ${money(amount, o.currency)} to your card.`
        : `If we don't receive a working code by ${refundOn}, we refund it in full.`,
    ];
    const subject = last ? `Last reminder: the transfer code for ${names(waiting)} is needed by ${refundOn}` : `Reminder: we are waiting for the transfer code for ${names(waiting)}`;
    if (await send(subject, body)) await mark(id, waiting, { reminded: due });
  }

  // How each transfer ended (a failed one only after its refund went through).
  for (const x of xfers) {
    const t = x.l.transfer ?? {};
    if (t.closed_told) continue;
    let sent = false;
    if (x.l.state === "registered") {
      sent = await send(`${x.l.domain} has moved to Corporate Domain Registry`, [
        `${x.l.domain} has moved to Corporate Domain Registry` + (x.l.expires_at ? ` and now runs until ${dayWords(x.l.expires_at)}.` : "."),
        "",
        "Your website and email keep working as before. Our registry partner, Tucows (OpenSRS), may send you an email asking you to confirm your contact details. Please answer it within 15 days, or the domain can be suspended.",
      ]);
    } else if (x.l.state === "failed" && (t.refunded_cents || !t.charged_cents)) {
      sent = await send(`We could not move ${x.l.domain}`, [
        `We could not move ${x.l.domain} to Corporate Domain Registry: ${failWords(x.l, c.transferCodeDays)}.`,
        "",
        t.refunded_cents
          ? `We have refunded ${money(t.refunded_cents, o.currency)} to your card. Depending on your bank it can take 5 to 10 days to appear on your statement.`
          : "You were not charged for it.",
        "",
        `${x.l.domain} stays with the company it is with now, and nothing changes there.`,
      ]);
    }
    if (sent) await mark(id, [x], { closed_told: true });
  }
}

function codeRequest(o: Order, lines: At[], refundOn: string): string[] {
  return [
    `To move ${names(lines)} to Corporate Domain Registry, we need ${lines.length === 1 ? "its" : "each domain's"} transfer code from ${heldBy(lines)}.`,
    "",
    ...steps(lines),
    "",
    "Then send the code to us here:",
    ...lines.map((x) => `  ${x.l.domain}: ${codeLink(o, x.i)}`),
    "",
    "What happens next:",
    "  - Your website and email keep working while the domain moves.",
    "  - Your current company may email you to confirm the transfer or to offer you a discount to stay. Don't cancel the transfer.",
    "  - The move usually finishes within a week of sending the code. The years you paid for are added on top of the current expiry date:",
    ...lines.map((x) => `      ${x.l.domain}: ${termWords(x.l.term)}`),
    "  - We email you as soon as it is done.",
    "",
    `If we don't receive a working code by ${refundOn}, we refund ${lines.length === 1 ? "it" : "each domain that did not move"} in full.`,
  ];
}

// The registrar's own steps if all domains are with one known registrar, else the generic ones.
function steps(lines: At[]): string[] {
  const found = lines.map((x) => transferGuide(x.l.transfer?.from_registrar));
  const guides = [...new Map(found.filter((g): g is TransferGuide => g !== null).map((g) => [g.url, g])).values()];
  const one = guides.length === 1 && found.every((g) => g?.url === guides[0].url) ? guides[0] : null;
  const out = [one ? `How to get the code at ${one.name}:` : "How to get the code:"];
  (one?.steps ?? TRANSFER_STEPS).forEach((s, n) => out.push(`  ${n + 1}. ${s}`));
  for (const g of guides) out.push(`${g.name}'s own instructions: ${g.url}`);
  return out;
}

function failWords(l: OrderLine, days: number): string {
  switch (l.reason) {
    case "no_code": return `we did not receive a working transfer code within ${days} days`;
    case "rejected": return l.transfer?.status === "cancelled" ? "the transfer was cancelled" : "the transfer codes we received did not work";
    case "tucows_on_hold": return "the registry could not process it";
    default: return "the registry could not complete it";
  }
}

// Names the registrar when all domains are with the same one.
function heldBy(lines: At[]): string {
  const from = new Set(lines.map((x) => x.l.transfer?.from_registrar ?? ""));
  const [one] = [...from];
  return from.size === 1 && one ? `${one}, the company it is with now` : `the company ${lines.length === 1 ? "it is" : "each is"} with now`;
}

const names = (lines: At[]) => lines.length === 1 ? lines[0].l.domain : lines.length === 2 ? `${lines[0].l.domain} and ${lines[1].l.domain}` : "your domains";

function charged(o: Order): string {
  const amount = o.stripe.amount_captured ?? 0;
  return amount > 0 ? `We have charged ${money(amount, o.currency)} to your card.` : "";
}

function codeLink(o: Order, i: number): string {
  return `${config().siteUrl}/transfer-code/?order=${o.id}&line=${i}&t=${transferToken(o.id, i)}`;
}

function signOff(o: Order): string[] {
  const c = config();
  return ["", "Order number: " + o.id, `Questions? Reply to this email or write to ${c.notifyEmail}.`, "", "Corporate Domain Registry", c.siteUrl];
}

async function mark(id: string, lines: At[], fields: Partial<LineTransfer>): Promise<void> {
  await updateOrder(id, (o) => {
    for (const x of lines) o.lines[x.i].transfer = { ...o.lines[x.i].transfer, ...fields };
    return o;
  });
}

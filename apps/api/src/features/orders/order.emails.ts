// The emails an order sends: one to the customer and one to CDR when it settles, and CDR's
// "CHECK order" notices when something needs a human.

import { config } from "../../core/config";
import { sendMail } from "../../core/mail";
import { money } from "../../core/money";
import { isoNow } from "../../core/time";
import { updateOrder } from "./order.store";
import type { FailReason, Order } from "./order.types";

export function subjectPrefix(o: Order): string {
  return o.test_mode ? "[TEST] " : "";
}

export function termWords(term: number): string {
  return term + (term === 1 ? " year" : " years");
}

function reasonWords(reason: FailReason | undefined): string {
  switch (reason) {
    case "taken": return "someone else registered it first";
    case "tucows_on_hold": return "the registry could not process it";
    case "error": return "the registry could not be reached";
    default: return "the registry did not accept it";
  }
}

/** The facts of an order as plain text, for CDR's own notices. */
export function orderSummary(o: Order): string {
  const r = o.registrant;
  const s = o.stripe;
  const out: string[] = [];
  out.push("Order: " + o.id + (o.test_mode ? ` (TEST: no real money, Tucows ${o.opensrs_env})` : ""));
  out.push("Status: " + o.status);
  out.push("Order total: " + money(o.subtotal_cents, o.currency)
    + (s.amount_authorized !== undefined ? ", card authorised for " + money(s.amount_authorized, o.currency) : "")
    + (s.amount_captured !== undefined ? ", captured " + money(s.amount_captured, o.currency) : ""));
  out.push("Stripe payment: " + (s.payment_intent ?? "n/a"));
  out.push("");
  for (const l of o.lines) {
    const tid = l.opensrs?.order_id ? ", Tucows order " + l.opensrs.order_id : "";
    out.push(`- ${l.domain}, ${termWords(l.term)}, ${money(l.amount_cents, o.currency)}: ${l.state.toUpperCase()}${l.reason ? ` (${l.reason})` : ""}${tid}`);
  }
  out.push("");
  out.push("Registrant:");
  out.push(`${r.first_name} ${r.last_name}` + (r.org_name !== "" ? ", " + r.org_name : ""));
  out.push(r.address1 + (r.address2 !== "" ? ", " + r.address2 : ""));
  out.push(r.city + (r.state !== "" ? ", " + r.state : "") + " " + r.postal_code + ", " + r.country);
  out.push(r.email + ", " + r.phone);
  out.push("Ordered from IP " + (o.registrant_ip || "?") + " at " + o.created_at);
  out.push("");
  out.push("The full record is on the admin page: " + config().siteUrl + "/api/admin/");
  return out.join("\n") + "\n";
}

/** A notice to CDR that an order needs a human. */
export async function notifyCheck(o: Order, subject: string, why: string): Promise<void> {
  await sendMail(config().notifyEmail, subjectPrefix(o) + subject, why + "\n\n" + orderSummary(o));
}

/** The customer's and CDR's emails once an order settles. Sent once per order. */
export async function sendFinalEmails(o: Order): Promise<void> {
  if (o.notified_final) return;
  const c = config();
  const registered = o.lines.filter((l) => l.state === "registered");
  const failed = o.lines.filter((l) => l.state === "failed");
  const waiting = o.lines.filter((l) => l.state !== "registered" && l.state !== "failed");
  const captured = o.stripe.amount_captured ?? 0;

  // To the customer, in plain words.
  const b: string[] = [];
  b.push(`Hi ${o.registrant.first_name},`, "");
  if (registered.length) {
    b.push("Thank you for your order. " + (registered.length === 1 ? "This domain is now registered to you:" : "These domains are now registered to you:"));
    for (const l of registered) b.push(`  ${l.domain} (${termWords(l.term)})`);
    b.push("");
  }
  if (waiting.length) {
    b.push("The registry is still processing:");
    for (const l of waiting) b.push("  " + l.domain);
    b.push("We will email you if anything changes.", "");
  }
  if (failed.length) {
    b.push(registered.length ? "We could not register:" : "We are sorry, we could not register your order:");
    for (const l of failed) b.push(`  ${l.domain} (${reasonWords(l.reason)})`);
    b.push("You are not charged for " + (failed.length === 1 ? "it" : "these") + ".", "");
  }
  b.push(captured > 0
    ? "Amount charged to your card: " + money(captured, o.currency) + "."
    : "Nothing was charged. The hold on your card has been released; depending on your bank it can take a few days to disappear from your statement.");
  if (registered.length) {
    b.push("", "Our registry partner, Tucows (OpenSRS), may send you an email asking you to confirm your contact details. Please answer it within 15 days, or the domain can be suspended.");
  }
  b.push("", "Order number: " + o.id, `Questions? Reply to this email or write to ${c.notifyEmail}.`, "", "Corporate Domain Registry", c.siteUrl);
  const subject = registered.length ? `Your domain order ${o.id} is complete` : `Your domain order ${o.id} could not be completed`;
  await sendMail(o.registrant.email, subjectPrefix(o) + subject, b.join("\n") + "\n");

  // To CDR.
  const what = o.status === "registered" ? "New order" : o.status === "failed" ? "FAILED order" : "CHECK order";
  let intro = "";
  for (const l of o.lines) {
    if (l.reason === "tucows_on_hold") intro += `Tucows put ${l.domain} on hold (usually not enough balance). Cancel that order in the Tucows panel so it does not register without payment, and top up the balance.\n`;
  }
  if (o.settled_early) intro += "The card hold was about to expire, so the order was charged while some names were still pending at Tucows. Check them in the Tucows panel.\n";
  await sendMail(c.notifyEmail, `${subjectPrefix(o)}${what} ${o.id}, ${money(captured, o.currency)}`, (intro !== "" ? intro + "\n" : "") + orderSummary(o));

  await updateOrder(o.id, (x) => { x.notified_final = isoNow(); return x; });
}

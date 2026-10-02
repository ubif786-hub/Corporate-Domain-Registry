// After the card is authorised: register each domain at Tucows, then take the money for what
// registered and release the rest of the hold.
//
//   order.status   pending_payment -> authorized -> fulfilling -> registered
//                                                             -> partially_registered
//                                                             -> failed      (nothing registered, hold released)
//                                                  -> pending   (Tucows is still working; the sweep checks back)
//                  plus expired, payment_failed, amount_mismatch, settle_error (retried), and
//                  needs_review (settled on day six, or a payment that needs a human)
//   line.state     new -> registering -> registered | pending | failed | unknown
//
// THREE CALLERS DRIVE THIS, and any of them may be first: the Stripe webhook (right after the card
// is authorised), the done page's polling (order-status), and the sweep (cron). One driver per
// order at a time (withDriveLock); the others return at once.
//
// NEVER REGISTER TWICE. A line is written as "registering" BEFORE sw_register is sent. If the reply
// never comes (a timeout, a restart), the line is left "registering" or "unknown" and the next pass
// ASKS Tucows what happened (get_orders_by_domain) instead of sending the order again. Only a name
// Tucows has no order for, and that is still free, goes back to "new".
//
// CARD HOLDS LAST SEVEN DAYS. An order still pending on day six is settled anyway: registered and
// still-pending names are charged, and CDR is told to check.

import type { OrderStatus } from "@cdr/shared";
import { money } from "../../core/money";
import { isoNow, sleep, toUnix, unixNow } from "../../core/time";
import * as opensrs from "../../integrations/opensrs/client";
import { stripe } from "../../integrations/stripe/client";
import { notifyCheck, sendFinalEmails } from "./order.emails";
import { note, readOrder, updateOrder, withDriveLock } from "./order.store";
import type { Order, OrderLine } from "./order.types";

export const DRIVABLE: readonly OrderStatus[] = ["authorized", "fulfilling", "pending", "settle_error"];
const MAX_ATTEMPTS = 3;
const SETTLE_AFTER_SECONDS = 6 * 86_400;

/* ---------- the payment ---------- */

/**
 * A finished Checkout Session, recorded on its order: the card must be AUTHORISED (PaymentIntent
 * "requires_capture") for the amount checkout computed, less any promotion code Stripe applied.
 * Anything else is flagged, CDR is told, and a wrong hold is released.
 *
 * Called by the webhook (with the event id, so a redelivery is a no-op) and by order-status and
 * the sweep when the webhook is late (with the session read from Stripe). Acts only on a
 * pending_payment order. Returns the order, or false when Stripe could not be read (the caller retries).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordCheckout(orderId: string, session: any, eventId: string | null = null): Promise<Order | null | false> {
  if (session?.status && session.status !== "complete") return await readOrder(orderId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pi: any = null;
  if (session?.payment_intent) {
    const piId = typeof session.payment_intent === "object" ? session.payment_intent.id : session.payment_intent;
    const r = await stripe("GET", "/payment_intents/" + encodeURIComponent(piId));
    if (r.status !== 200 || !r.body || typeof r.body !== "object") return false;
    pi = r.body;
  }

  let notify: "mismatch" | "captured_early" | "no_payment" | null = null;
  const order = await updateOrder(orderId, (o) => {
    if (eventId !== null) {
      if (o.events.includes(eventId)) return null;
      o.events.push(eventId);
    }
    if (o.status !== "pending_payment") return eventId !== null ? o : null;
    o.stripe.session_id = session.id;
    o.stripe.livemode = !!session.livemode;
    o.stripe.customer = { email: session.customer_details?.email ?? null, name: session.customer_details?.name ?? null };
    const subtotal: number = Number.isInteger(session.amount_subtotal) ? session.amount_subtotal : -1;
    const discount: number = Number.isInteger(session.total_details?.amount_discount) ? session.total_details.amount_discount : 0;
    o.stripe.amount_subtotal = subtotal;
    o.stripe.amount_discount = discount;
    if (!pi) {
      o.status = "needs_review";
      notify = "no_payment";
      note(o, "Checkout completed without a payment to hold.");
      return o;
    }
    o.stripe.payment_intent = pi.id;
    const currency = typeof pi.currency === "string" ? pi.currency : "";
    const expected = subtotal - discount;

    if (pi.status !== "requires_capture") {
      o.status = pi.status === "succeeded" ? "needs_review" : "payment_failed";
      notify = pi.status === "succeeded" ? "captured_early" : null;
      note(o, `Payment is "${pi.status}", not an authorisation waiting for capture.`);
      return o;
    }
    const capturable = Number(pi.amount_capturable) || 0;
    o.stripe.amount_authorized = capturable;
    if (subtotal !== o.subtotal_cents || capturable !== expected || currency !== o.currency) {
      o.status = "amount_mismatch";
      notify = "mismatch";
      note(o, `Stripe authorised ${money(capturable, currency)} against ${money(expected, o.currency)}. Releasing the hold.`);
      return o;
    }
    o.status = "authorized";
    o.stripe.authorized_at = isoNow();
    note(o, `Card authorised for ${money(expected, o.currency)}`
      + (discount ? ` after a ${money(discount, o.currency)} promotion` : "") + ".");
    return o;
  });
  if (!order) return null;

  if (notify === "mismatch" && order.stripe.payment_intent) {
    await stripe("POST", `/payment_intents/${encodeURIComponent(order.stripe.payment_intent)}/cancel`, {}, "cdr-cancel-" + order.id);
  }
  if (notify) {
    const why = {
      mismatch: "Stripe authorised a different amount from the order total, so the card hold was released and nothing was registered.",
      captured_early: "Stripe CHARGED the card at once instead of holding it (check the Stripe settings). Nothing was registered: register the domains by hand or refund the customer.",
      no_payment: "Stripe reported a finished checkout with no payment attached. Nothing was registered.",
    }[notify];
    await notifyCheck(order, "CHECK order " + order.id, why);
  }
  return order;
}

/** A checkout Stripe says has expired: the order is closed, unless something else moved it on. */
export async function recordExpired(orderId: string): Promise<Order | null> {
  return updateOrder(orderId, (o) => {
    if (o.status !== "pending_payment") return null;
    o.status = "expired";
    note(o, "Checkout expired without payment.");
    return o;
  });
}

/* ---------- registration ---------- */

const isFinal = (l: OrderLine) => l.state === "registered" || l.state === "failed";

/** Drives one order as far as it can go in about budgetSeconds. Returns the order's status. */
export async function fulfil(id: string, budgetSeconds = 20): Promise<OrderStatus | "busy" | null> {
  return withDriveLock(id, async () => {
    const order = await readOrder(id);
    if (!order || !DRIVABLE.includes(order.status)) return order ? order.status : null;
    const started = unixNow();

    if (order.status !== "settle_error") {
      if (order.status === "authorized") {
        await updateOrder(id, (o) => { o.status = "fulfilling"; note(o, "Fulfilment started."); return o; });
      }
      // Up to three rounds, so a lost reply is looked up (and a free name retried) in the same
      // pass. Names waiting on the registry (pending) are left for a later pass.
      rounds: for (let round = 0; round < 3; round++) {
        for (let i = 0; i < order.lines.length; i++) {
          if (unixNow() - started > budgetSeconds) break rounds;
          await fulfilLine(id, i);
        }
        const again = ((await readOrder(id))?.lines ?? []).filter((l) => l.state === "new" || l.state === "registering" || l.state === "unknown");
        if (!again.length) break;
        await sleep(2000);
      }
    }
    return settle(id);
  });
}

async function setLine(id: string, i: number, fields: Partial<OrderLine>, text: string): Promise<void> {
  await updateOrder(id, (o) => {
    Object.assign(o.lines[i], fields);
    note(o, `${o.lines[i].domain}: ${text}`);
    return o;
  });
}

/** "16-OCT-2007 15:21:26" (Tucows' order dates) or anything Date.parse reads -> seconds, or null. */
function tucowsDate(s: string): number | null {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?/.exec(s.trim());
  if (m) {
    const month = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(m[2].toUpperCase());
    if (month >= 0) return Math.floor(Date.UTC(+m[3], month, +m[1], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)) / 1000);
  }
  return toUnix(s);
}

/** Moves one line one step. Every result is written before the next Tucows call. */
async function fulfilLine(id: string, i: number): Promise<void> {
  const order = await readOrder(id);
  if (!order) return;
  const line = order.lines[i];
  if (isFinal(line)) return;

  if (line.state === "new") {
    if (line.attempts >= MAX_ATTEMPTS) {
      await setLine(id, i, { state: "failed", reason: "error" }, `Gave up after ${MAX_ATTEMPTS} attempts.`);
      return;
    }
    await setLine(id, i, { state: "registering", attempts: line.attempts + 1, attempted_at: isoNow() }, "Registering at Tucows.");
    const r = await opensrs.register(line.domain, line.term, order.registrant, order.registrant_ip ?? "");
    const a = r.attributes;
    const tucows = {
      order_id: typeof a.id === "string" ? a.id : null,
      domain_id: typeof a.domain_id === "string" ? a.domain_id : null,
      code: r.code,
      text: r.text,
      reg_username: r.regUsername,
    };
    const said = ("Tucows replied " + (r.transport ? `${r.code} ${r.text}` : `nothing (${r.error})`)).replace(/\.*$/, ".");

    if (!r.transport) {
      await setLine(id, i, { state: "unknown", opensrs: tucows }, said + " Will ask Tucows what happened before trying again.");
    } else if ((typeof a.forced_pending === "string" && a.forced_pending !== "" && a.forced_pending !== "0") || r.code === 440) {
      // Tucows parked the order (usually: not enough balance). It must not complete later without
      // payment, so the line fails and CDR is told to cancel it in the panel.
      await setLine(id, i, { state: "failed", reason: "tucows_on_hold", opensrs: tucows }, said + " Order put on hold by Tucows: cancel it in the Tucows panel.");
    } else if (r.code === 200) {
      await setLine(id, i, { state: "registered", registered_at: isoNow(), opensrs: tucows }, said);
    } else if (r.code === 250) {
      await setLine(id, i, { state: "pending", opensrs: tucows }, said + " The registry answers later.");
    } else if (r.code === 485 || r.code === 211 || r.code === 221) {
      await setLine(id, i, { state: "failed", reason: "taken", opensrs: tucows }, said);
    } else if (r.code === 486) {
      await setLine(id, i, { state: "unknown", opensrs: tucows }, said + " A registration is in progress for this name; checking back.");
    } else {
      await setLine(id, i, { state: "failed", reason: "rejected", opensrs: tucows }, said);
    }
    return;
  }

  if (line.state === "registering" || line.state === "unknown") {
    // What did the last attempt do? Only orders on this account from around that attempt count.
    const orders = await opensrs.ordersFor(line.domain);
    if (orders === null) return; // Tucows not reachable: try again on the next pass
    const since = (toUnix(line.attempted_at) ?? 86_400) - 86_400;
    for (const o of orders) {
      const when = tucowsDate(o.date);
      if (when !== null && when < since) continue;
      const tucows = { ...(line.opensrs ?? {}), order_id: o.id };
      if (o.status === "completed") {
        await setLine(id, i, { state: "registered", registered_at: isoNow(), opensrs: tucows }, `Found Tucows order ${o.id}, completed.`);
        return;
      }
      if (o.status === "pending" || o.status === "waiting" || o.status === "processed") {
        await setLine(id, i, { state: "pending", opensrs: tucows }, `Found Tucows order ${o.id}, ${o.status}.`);
        return;
      }
    }
    // No live order of ours. If the name is still free, nothing happened and it is safe to retry.
    const look = await opensrs.lookup(line.domain, true);
    if (look.status === "available") {
      await setLine(id, i, { state: "new" }, "No Tucows order found and the name is still free; will try again.");
    } else if (look.status === "taken" || look.status === "premium") {
      await setLine(id, i, { state: "failed", reason: "taken" }, "No Tucows order of ours, and the name is now taken.");
    }
    return;
  }

  if (line.state === "pending") {
    const tucowsId = line.opensrs?.order_id;
    if (!tucowsId) {
      await setLine(id, i, { state: "unknown" }, "Pending without an order id.");
      return;
    }
    const status = await opensrs.orderStatus(tucowsId);
    if (status === "completed") await setLine(id, i, { state: "registered", registered_at: isoNow() }, "Tucows order completed.");
    else if (status === "declined" || status === "cancelled" || status === "deleted") await setLine(id, i, { state: "failed", reason: "rejected" }, `Tucows order ${status}.`);
  }
}

/* ---------- the money ---------- */

/** When every line is final (or the hold is about to lapse), take the money for what registered
 *  and release the rest, then email the customer and CDR once. */
async function settle(id: string): Promise<OrderStatus | null> {
  const order = await readOrder(id);
  if (!order) return null;
  const states = order.lines.map((l) => l.state);
  const open = states.some((s) => s !== "registered" && s !== "failed");
  const age = unixNow() - (toUnix(order.stripe.authorized_at ?? order.created_at) ?? unixNow());
  const forced = open && age > SETTLE_AFTER_SECONDS;

  if (open && !forced) {
    const status: OrderStatus = states.includes("new") ? "fulfilling" : "pending";
    if (order.status !== status) await updateOrder(id, (o) => { o.status = status; return o; });
    return status;
  }

  // What is charged: registered lines, plus on a forced settle the ones Tucows may still complete
  // (pending, or sent with the reply lost). A line never sent ("new") is not charged.
  let chargeable = 0;
  for (const l of order.lines) {
    if (l.state === "registered" || (forced && (l.state === "pending" || l.state === "registering" || l.state === "unknown"))) chargeable += l.amount_cents;
  }
  const authorized = order.stripe.amount_authorized ?? 0;
  // A promotion code discounts the whole order; the capture keeps the same proportion.
  let capture = order.subtotal_cents > 0 ? Math.round((authorized * chargeable) / order.subtotal_cents) : 0;
  capture = Math.min(capture, authorized);
  const pi = encodeURIComponent(order.stripe.payment_intent ?? "");

  const r = capture > 0
    ? await stripe("POST", `/payment_intents/${pi}/capture`, { amount_to_capture: capture }, "cdr-capture-" + id)
    : await stripe("POST", `/payment_intents/${pi}/cancel`, { cancellation_reason: "abandoned" }, "cdr-cancel-" + id);
  const ok = r.status === 200 && r.body?.status === (capture > 0 ? "succeeded" : "canceled");

  if (!ok) {
    const message: string = r.body?.error?.message ?? `HTTP ${r.status}`;
    const first = order.status !== "settle_error";
    const updated = await updateOrder(id, (o) => {
      o.status = "settle_error";
      o.stripe.settle_error = message;
      note(o, "Stripe settle failed: " + message);
      return o;
    });
    if (first && updated) {
      await notifyCheck(updated, `CHECK order ${id}: Stripe could not settle the card hold`,
        `Stripe said: ${message}\n\nThe sweep keeps retrying. Check the payment in the Stripe dashboard.`);
    }
    return "settle_error";
  }

  const registered = order.lines.filter((l) => l.state === "registered").length;
  // A forced settle leaves names Tucows may still complete or decline. The money is already taken,
  // so the order stops being driven automatically and CDR checks it by hand.
  const status: OrderStatus = forced ? "needs_review" : capture === 0 ? "failed" : registered === order.lines.length ? "registered" : "partially_registered";
  const settled = await updateOrder(id, (o) => {
    o.status = status;
    o.stripe.amount_captured = capture;
    o.stripe.settled_at = isoNow();
    delete o.stripe.settle_error;
    if (forced) o.settled_early = true;
    note(o, capture ? `Captured ${money(capture, o.currency)}.` : "Nothing registered: card hold released.");
    return o;
  });
  if (settled) await sendFinalEmails(settled);
  return status;
}

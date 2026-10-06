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
// RENEWALS (service "renew") go through the same states, "registered" meaning renewed. RENEW carries
// the expiry year seen at checkout, so Tucows refuses a repeat once one went through (465); a lost
// reply is settled by reading the expiry back from Tucows.
//
// TRANSFERS wait for the customer's code (awaiting_code), which can take longer than the card
// hold, so they are charged with the order (status "transferring") and refunded if they fail.
// A refused code goes back to awaiting_code, up to MAX_ATTEMPTS. A lost reply is checked with
// check_transfer before anything is resent.
//
// CARD HOLDS LAST SEVEN DAYS. An order still pending on day six is settled anyway: registered and
// still-pending names are charged, and CDR is told to check.

import type { OrderStatus } from "@cdr/shared";
import { config } from "../../core/config";
import { money } from "../../core/money";
import { isoNow, sleep, toUnix, unixNow } from "../../core/time";
import * as opensrs from "../../integrations/opensrs/client";
import { stripe } from "../../integrations/stripe/client";
import { transferNotices } from "../transfer/transfer.emails";
import { notifyCheck, sendFinalEmails } from "./order.emails";
import { dropTransferCode, note, readOrder, transferCode, updateOrder, withDriveLock } from "./order.store";
import { MAX_ATTEMPTS, type LineTransfer, type Order, type OrderLine } from "./order.types";

export const DRIVABLE: readonly OrderStatus[] = ["authorized", "fulfilling", "pending", "transferring", "settle_error"];
const SETTLE_AFTER_SECONDS = 6 * 86_400;

/* ---------- the payment ---------- */

/**
 * A finished Checkout Session, recorded on its order: the card must be AUTHORISED (PaymentIntent
 * "requires_capture") for the amount checkout computed, less any promotion code, plus any GST/HST.
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
    const tax: number = Number.isInteger(session.total_details?.amount_tax) ? session.total_details.amount_tax : 0;
    o.stripe.amount_subtotal = subtotal;
    o.stripe.amount_discount = discount;
    if (tax) o.stripe.amount_tax = tax;
    if (!pi) {
      o.status = "needs_review";
      notify = "no_payment";
      note(o, "Checkout completed without a payment to hold.");
      return o;
    }
    o.stripe.payment_intent = pi.id;
    const currency = typeof pi.currency === "string" ? pi.currency : "";
    const expected = subtotal - discount + tax;

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
      + (discount ? ` after a ${money(discount, o.currency)} promotion` : "")
      + (tax ? `, including ${money(tax, o.currency)} GST/HST` : "") + ".");
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
const isTransfer = (l: OrderLine) => l.service === "transfer";
const YEAR_MS = 365.2425 * 86_400_000;

const tucowsSaid = (r: opensrs.OpsResult) => ("Tucows replied " + (r.transport ? `${r.code} ${r.text}` : `nothing (${r.error})`)).replace(/\.*$/, ".");

/** iso plus whole years, as ISO. */
const plusYears = (iso: string, years: number) => {
  const d = new Date(iso);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString();
};

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
  if (line.service === "renew") return renewLine(id, i, line);
  if (line.service === "transfer") return transferLine(id, i, order, line);

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
      await setLine(id, i, { state: "registered", registered_at: isoNow(), expires_at: plusYears(isoNow(), line.term), opensrs: tucows }, said);
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
        await setLine(id, i, { state: "registered", registered_at: isoNow(), expires_at: plusYears(isoNow(), line.term), opensrs: tucows }, `Found Tucows order ${o.id}, completed.`);
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
    if (status === "completed") await setLine(id, i, { state: "registered", registered_at: isoNow(), expires_at: plusYears(isoNow(), line.term) }, "Tucows order completed.");
    else if (status === "declined" || status === "cancelled" || status === "deleted") await setLine(id, i, { state: "failed", reason: "rejected" }, `Tucows order ${status}.`);
  }
}

/** Moves one renewal one step. */
async function renewLine(id: string, i: number, line: OrderLine): Promise<void> {
  const from = line.expires_at;
  if (!from) {
    await setLine(id, i, { state: "failed", reason: "error" }, "No expiry date from checkout; not renewed.");
    return;
  }
  const fromYear = new Date(from).getUTCFullYear();

  if (line.state === "new") {
    if (line.attempts >= MAX_ATTEMPTS) {
      await setLine(id, i, { state: "failed", reason: "error" }, `Gave up after ${MAX_ATTEMPTS} attempts.`);
      return;
    }
    await setLine(id, i, { state: "registering", attempts: line.attempts + 1, attempted_at: isoNow() }, `Renewing at Tucows from ${fromYear}.`);
    const r = await opensrs.renew(line.domain, fromYear, line.term);
    const tucows = { order_id: typeof r.attributes.order_id === "string" ? r.attributes.order_id : null, code: r.code, text: r.text };
    const said = ("Tucows replied " + (r.transport ? `${r.code} ${r.text}` : `nothing (${r.error})`)).replace(/\.*$/, ".");
    if (!r.transport) {
      await setLine(id, i, { state: "unknown", opensrs: tucows }, said + " Will read the expiry at Tucows before trying again.");
    } else if (r.code === 200) {
      await setLine(id, i, { state: "registered", registered_at: isoNow(), expires_at: r.expires_at ?? plusYears(from, line.term), opensrs: tucows }, said);
    } else {
      // 465 or 541 mean the expiry year changed since checkout: renewed some other way, not by us.
      await setLine(id, i, { state: "failed", reason: "rejected", opensrs: tucows }, said);
    }
    return;
  }

  if (line.state === "registering" || line.state === "unknown") {
    const now = await opensrs.domainExpiry(line.domain);
    if (now.status === "error") return; // Tucows not reachable: try again on the next pass
    if (now.status === "not_ours") {
      await setLine(id, i, { state: "failed", reason: "rejected" }, "No longer in the Tucows account; not renewed.");
    } else if (new Date(now.expires_at).getUTCFullYear() > fromYear) {
      await setLine(id, i, { state: "registered", registered_at: isoNow(), expires_at: now.expires_at }, `Tucows shows the new expiry ${now.expires_at.slice(0, 10)}: renewed.`);
    } else {
      await setLine(id, i, { state: "new" }, "The expiry at Tucows has not moved, so nothing happened; will try again.");
    }
  }
}

/* ---------- transfers ---------- */

/** Moves a transfer one step. */
async function transferLine(id: string, i: number, order: Order, line: OrderLine): Promise<void> {
  const t: LineTransfer = line.transfer ?? {};

  if (line.state === "awaiting_code") {
    const days = config().transferCodeDays;
    const paid = toUnix(order.stripe.authorized_at ?? order.created_at) ?? unixNow();
    if (unixNow() - paid > days * 86_400) {
      await dropTransferCode(id, i);
      await setLine(id, i, { state: "failed", reason: "no_code" }, `No working transfer code within ${days} days; it will be refunded.`);
    }
    return;
  }

  if (line.state === "new") {
    if (line.attempts >= MAX_ATTEMPTS) {
      await dropTransferCode(id, i);
      await setLine(id, i, { state: "failed", reason: "error" }, `Gave up after ${MAX_ATTEMPTS} attempts.`);
      return;
    }
    const code = await transferCode(id, i);
    if (code === null) {
      await setLine(id, i, { state: "awaiting_code" }, "No code on file; waiting for the customer's code.");
      return;
    }
    await setLine(id, i, { state: "registering", attempts: line.attempts + 1, attempted_at: isoNow() }, "Sending the transfer to Tucows.");
    const r = await opensrs.transfer(line.domain, code, order.registrant, order.registrant_ip ?? "");
    const a = r.attributes;
    const tucows = { order_id: typeof a.id === "string" ? a.id : null, code: r.code, text: r.text };
    const said = tucowsSaid(r);
    if (!r.transport) {
      await setLine(id, i, { state: "unknown", opensrs: tucows }, said + " Will ask Tucows what happened before sending again.");
    } else if ((typeof a.forced_pending === "string" && a.forced_pending !== "" && a.forced_pending !== "0") || r.code === 440) {
      await dropTransferCode(id, i);
      await setLine(id, i, { state: "failed", reason: "tucows_on_hold", opensrs: tucows }, said + " Order put on hold by Tucows: cancel it in the Tucows panel.");
    } else if (r.code === 200) {
      await dropTransferCode(id, i);
      await setLine(id, i, { state: "pending", opensrs: tucows, transfer: { ...t, status: "pending_owner", last_error: undefined } }, said);
    } else {
      await codeRefused(id, i, line.attempts + 1, t, r.text || said, tucows);
    }
    return;
  }

  if (line.state === "registering" || line.state === "unknown") {
    // Did the last send reach Tucows? Only trust a state from around that time.
    const st = await opensrs.transferStatus(line.domain);
    if (!st) return; // Tucows not reachable: try again on the next pass
    const fresh = st.at !== null && st.at >= (toUnix(line.attempted_at) ?? 0) - 300;
    if (fresh && st.state === "cancelled") {
      await codeRefused(id, i, line.attempts, t, st.reason || "Tucows cancelled the transfer.");
    } else if (fresh && st.state !== "undef") {
      await dropTransferCode(id, i);
      await setLine(id, i, { state: "pending", transfer: { ...t, status: st.state } }, `Found the transfer at Tucows, ${st.state}.`);
    } else {
      await setLine(id, i, { state: "new" }, "Tucows has no transfer from the last attempt; will send it again.");
    }
    return;
  }

  if (line.state === "pending") {
    if (t.completed_expiry) return addPaidYears(id, i, line, t);
    const st = await opensrs.transferStatus(line.domain);
    if (!st) return;
    if (st.state === "completed") {
      const now = await opensrs.domainExpiry(line.domain);
      if (now.status !== "ours") return; // Tucows has not caught up yet: the next pass
      // The years the move added (usually one); the rest of the paid years are renewed on top.
      const before = line.expires_at ? Date.parse(line.expires_at) : NaN;
      const added = Number.isNaN(before) ? 1 : Math.max(0, Math.round((Date.parse(now.expires_at) - before) / YEAR_MS));
      const extra = Math.max(0, line.term - added);
      if (!extra) {
        await setLine(id, i, { state: "registered", registered_at: isoNow(), expires_at: now.expires_at, transfer: { ...t, status: "completed" } }, `Transferred; Tucows shows the expiry ${now.expires_at.slice(0, 10)}.`);
        return;
      }
      const next: LineTransfer = { ...t, status: "completed", completed_expiry: now.expires_at, extra_years: extra };
      await setLine(id, i, { transfer: next }, `Transferred; renewing the ${extra} more ${extra === 1 ? "year" : "years"} paid for.`);
      return addPaidYears(id, i, line, next);
    }
    if (st.state === "cancelled") return codeRefused(id, i, line.attempts, t, st.reason || "The transfer was cancelled.");
    if (st.state !== t.status && st.state !== "undef") await setLine(id, i, { transfer: { ...t, status: st.state } }, `Transfer at Tucows: ${st.state}.`);
  }
}

/** Code refused (`tucows` set) or transfer cancelled: wait for a new code, or fail after MAX_ATTEMPTS. */
async function codeRefused(id: string, i: number, attempts: number, t: LineTransfer, why: string, tucows?: OrderLine["opensrs"]): Promise<void> {
  await dropTransferCode(id, i);
  const fields: Partial<OrderLine> = { transfer: { ...t, status: tucows ? "refused" : "cancelled", last_error: why, error_told: false } };
  if (tucows) fields.opensrs = tucows;
  if (attempts >= MAX_ATTEMPTS) await setLine(id, i, { ...fields, state: "failed", reason: "rejected" }, `${why} Gave up after ${MAX_ATTEMPTS} codes; it will be refunded.`);
  else await setLine(id, i, { ...fields, state: "awaiting_code" }, `${why} Waiting for a new code.`);
}

/** Renews the paid years the move didn't add. Reads the expiry first so it never renews twice. */
async function addPaidYears(id: string, i: number, line: OrderLine, t: LineTransfer): Promise<void> {
  const from = t.completed_expiry as string;
  const fromYear = new Date(from).getUTCFullYear();
  const years = t.extra_years ?? 0;
  const now = await opensrs.domainExpiry(line.domain);
  if (now.status === "error") return;
  if (now.status === "ours" && new Date(now.expires_at).getUTCFullYear() > fromYear) {
    await setLine(id, i, { state: "registered", registered_at: isoNow(), expires_at: now.expires_at }, `Tucows shows the new expiry ${now.expires_at.slice(0, 10)}: renewed.`);
    return;
  }
  const r = await opensrs.renew(line.domain, fromYear, years);
  if (!r.transport) return; // read the expiry again on the next pass
  if (r.code === 200) {
    await setLine(id, i, { state: "registered", registered_at: isoNow(), expires_at: r.expires_at ?? plusYears(from, years) }, tucowsSaid(r));
    return;
  }
  // Moved, but the extra years were refused: CDR renews by hand or refunds the difference.
  await setLine(id, i, { state: "registered", registered_at: isoNow(), expires_at: from }, `${tucowsSaid(r)} The ${years} extra ${years === 1 ? "year was" : "years were"} not added.`);
  const order = await readOrder(id);
  if (order) {
    await notifyCheck(order, `CHECK order ${id}: ${line.domain} moved, extra years not added`,
      `${line.domain} was transferred, but Tucows refused the renewal of ${years} more ${years === 1 ? "year" : "years"} (${tucowsSaid(r)})\n\nRenew it in the Tucows panel, or refund the difference in Stripe.`);
  }
}

/* ---------- the money ---------- */

/** When every line is final (or the hold is about to lapse), take the money for what registered
 *  and release the rest, then email the customer and CDR once. Open transfers are charged now and
 *  refunded later if they fail. */
async function settle(id: string): Promise<OrderStatus | null> {
  const order = await readOrder(id);
  if (!order) return null;
  if (order.stripe.settled_at) return closeTransfers(order);
  const states = order.lines.map((l) => l.state);
  const open = order.lines.some((l) => !isTransfer(l) && !isFinal(l));
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
    if (l.state === "registered" || (isTransfer(l) && l.state !== "failed")
      || (forced && (l.state === "pending" || l.state === "registering" || l.state === "unknown"))) chargeable += l.amount_cents;
  }
  const authorized = order.stripe.amount_authorized ?? 0;
  // A promotion code discounts the whole order and GST/HST is on all of it: the capture keeps the same proportion.
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
  const transfers = capture > 0 && order.lines.some((l) => isTransfer(l) && !isFinal(l));
  // A forced settle leaves names Tucows may still complete or decline. The money is already taken,
  // so the order stops being driven automatically and CDR checks it by hand (after its transfers).
  const status: OrderStatus = transfers ? "transferring" : forced ? "needs_review" : capture === 0 ? "failed" : registered === order.lines.length ? "registered" : "partially_registered";
  const settled = await updateOrder(id, (o) => {
    o.status = status;
    o.stripe.amount_captured = capture;
    o.stripe.settled_at = isoNow();
    delete o.stripe.settle_error;
    if (forced) o.settled_early = true;
    // Each transfer's share of the charge, i.e. its refund if it fails.
    for (const l of o.lines) {
      if (isTransfer(l) && l.state !== "failed" && o.subtotal_cents > 0) l.transfer = { ...l.transfer, charged_cents: Math.round((authorized * l.amount_cents) / o.subtotal_cents) };
    }
    note(o, capture ? `Captured ${money(capture, o.currency)}.` : "Nothing registered: card hold released.");
    return o;
  });
  if (settled && !transfers) await sendFinalEmails(settled);
  if (settled && transfers) await transferNotices(id);
  return status;
}

/** Refunds failed transfers, emails the customer, and closes the order once every transfer is done.
 *  A refused refund is retried next pass. */
async function closeTransfers(order: Order): Promise<OrderStatus> {
  const id = order.id;
  const owed = (l: OrderLine) => isTransfer(l) && l.state === "failed" && (l.transfer?.charged_cents ?? 0) > 0 && !l.transfer?.refunded_cents;
  let refunded = order.stripe.amount_refunded ?? 0;
  for (const [i, l] of order.lines.entries()) {
    if (!owed(l)) continue;
    const amount = Math.min(l.transfer?.charged_cents ?? 0, (order.stripe.amount_captured ?? 0) - refunded);
    if (amount <= 0) continue;
    const r = await stripe("POST", "/refunds", {
      payment_intent: order.stripe.payment_intent ?? "",
      amount,
      reason: "requested_by_customer",
      metadata: { order_id: id, domain: l.domain },
    }, `cdr-refund-${id}-${i}`);
    if (r.status !== 200 || !["succeeded", "pending"].includes(r.body?.status)) {
      const message: string = r.body?.error?.message ?? `HTTP ${r.status}`;
      const first = !order.stripe.settle_error;
      const updated = await updateOrder(id, (o) => { o.stripe.settle_error = message; note(o, `${l.domain}: Stripe refund failed: ${message}`); return o; });
      if (first && updated) {
        await notifyCheck(updated, `CHECK order ${id}: Stripe could not refund ${l.domain}`,
          `Stripe said: ${message}\n\nThe sweep keeps retrying. Check the payment in the Stripe dashboard.`);
      }
      return "transferring";
    }
    refunded += amount;
    await updateOrder(id, (o) => {
      o.lines[i].transfer = { ...o.lines[i].transfer, refunded_cents: amount, refund_id: r.body.id };
      o.stripe.amount_refunded = refunded;
      delete o.stripe.settle_error;
      note(o, `${l.domain}: refunded ${money(amount, o.currency)}.`);
      return o;
    });
  }

  await transferNotices(id);
  const now = await readOrder(id);
  if (!now || now.lines.some((l) => !isFinal(l) || owed(l) || (isTransfer(l) && !l.transfer?.closed_told))) return "transferring";
  const registered = now.lines.filter((l) => l.state === "registered").length;
  const status: OrderStatus = now.settled_early ? "needs_review" : registered === now.lines.length ? "registered" : registered ? "partially_registered" : "failed";
  const closed = await updateOrder(id, (o) => {
    if (o.status !== "transferring") return null;
    o.status = status;
    note(o, "Every transfer is done.");
    return o;
  });
  if (closed && closed.status === status) await sendFinalEmails(closed);
  return status;
}

// POST /api/stripe-webhook/ — Stripe tells us the customer finished paying.
//
// Registered in the Stripe dashboard (Developers, Webhooks) for:
//   checkout.session.completed             the customer finished Checkout; the card is authorised, not charged
//   checkout.session.expired               they walked away; the order is closed
//   checkout.session.async_payment_failed  a delayed payment did not clear
//
// EVERY DELIVERY IS VERIFIED against the endpoint's signing secret, over the body EXACTLY as it
// arrived (express.raw on this route only), before a word of it is believed. Stripe retries until
// it gets a 2xx and may send one event twice, so every step is idempotent: an event already
// recorded on the order is a no-op.
//
// The payment is read back from Stripe and checked (recordCheckout). Then the reply goes back to
// Stripe at once and the fulfilment carries on: register at Tucows, then capture or release.

import express, { Router } from "express";
import { requireConfig } from "../../core/config";
import { afterReply, allow, HttpError, sendJson } from "../../core/http";
import { signatureOk } from "../../integrations/stripe/client";
import { fulfil, recordCheckout } from "../orders/fulfilment.service";
import { isValidOrderId, note, readOrder, updateOrder } from "../orders/order.store";

const HANDLED = ["checkout.session.completed", "checkout.session.expired", "checkout.session.async_payment_failed"];

export const stripeWebhookRouter = Router();

stripeWebhookRouter.all(
  "/api/stripe-webhook",
  allow("POST"),
  express.raw({ type: () => true, limit: "1mb" }),
  async (req, res) => {
    const c = requireConfig(["stripeSecretKey", "stripeWebhookSecret", "siteUrl", "notifyEmail"]);
    const payload: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!signatureOk(payload, req.get("stripe-signature"), c.stripeWebhookSecret)) {
      throw new HttpError(400, "signature", "Signature verification failed.");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;
    try { event = JSON.parse(payload.toString("utf8")); } catch { event = null; }
    if (!event || typeof event !== "object" || !event.id || !event.type) throw new HttpError(400, "bad_event", "Unreadable event.");

    if (!HANDLED.includes(event.type)) return sendJson(res, 200, { received: true, ignored: event.type });

    const session = event.data?.object ?? {};
    const orderId = session.metadata?.order_id ?? session.client_reference_id ?? null;
    if (!isValidOrderId(orderId) || !readOrder(orderId)) return sendJson(res, 200, { received: true, ignored: "unknown order" });

    let order;
    if (event.type === "checkout.session.completed") {
      order = await recordCheckout(orderId, session, event.id);
      if (order === false) throw new HttpError(503, "stripe_unavailable", "Could not read the payment; Stripe will retry.");
    } else {
      order = updateOrder(orderId, (o) => {
        if (o.events.includes(event.id)) return null;
        o.events.push(event.id);
        if (o.status !== "pending_payment") return o;
        o.status = event.type === "checkout.session.expired" ? "expired" : "payment_failed";
        note(o, event.type === "checkout.session.expired" ? "Checkout expired without payment." : "Payment failed.");
        return o;
      });
    }
    if (!order) return sendJson(res, 200, { received: true, ignored: "unknown order" });

    if (order.status !== "authorized") return sendJson(res, 200, { received: true, order: order.id, status: order.status });

    // Answer Stripe now, then register.
    sendJson(res, 200, { received: true, order: order.id, status: "authorized" });
    const id = order.id;
    afterReply("fulfil " + id, () => fulfil(id, 120));
  },
);

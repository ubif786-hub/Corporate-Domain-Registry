// GET /api/order-status/?order=<id>&t=<token> — the done page's view of one order.
//
// The token is in the address Stripe sends the customer back to (checkout), so only the customer's
// own browser can read the order, and it reads only what the page shows: the status, each domain's
// state and the amount charged. No contact details.
//
// IT ALSO KEEPS THE ORDER MOVING. If the webhook is late, the Checkout Session is read from Stripe
// here and recorded the same way. If the order is waiting on registration, the reply is sent first
// and the fulfilment then runs for a few seconds (one driver per order, so a page polling every few
// seconds is harmless).

import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import type { OrderStatusResponse } from "@cdr/shared";
import { requireConfig } from "../../core/config";
import { afterReply, allow, HttpError, sendJson } from "../../core/http";
import { stripe } from "../../integrations/stripe/client";
import { DRIVABLE, fulfil, recordCheckout, recordExpired } from "./fulfilment.service";
import { isValidOrderId, orderToken, readOrder } from "./order.store";

const sameToken = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const orderStatusRouter = Router();

orderStatusRouter.all("/api/order-status", allow("GET"), async (req, res) => {
  requireConfig(["stripeSecretKey", "siteUrl"]);
  const id = typeof req.query.order === "string" ? req.query.order : "";
  const token = typeof req.query.t === "string" ? req.query.t : "";
  if (!isValidOrderId(id) || !sameToken(orderToken(id), token)) throw new HttpError(404, "not_found", "Order not found.");
  let order = await readOrder(id);
  if (!order) throw new HttpError(404, "not_found", "Order not found.");

  // The webhook is the normal path; this is the fallback when it has not arrived.
  if (order.status === "pending_payment" && order.stripe.session_id) {
    const r = await stripe("GET", "/checkout/sessions/" + encodeURIComponent(order.stripe.session_id));
    if (r.status === 200 && r.body) {
      if (r.body.status === "complete") {
        const recorded = await recordCheckout(id, r.body);
        if (recorded) order = recorded;
      } else if (r.body.status === "expired") {
        order = (await recordExpired(id)) ?? order;
      }
    }
  }

  const out: OrderStatusResponse = {
    order: order.id,
    status: order.status,
    currency: order.currency.toUpperCase(),
    lines: order.lines.map((l) => ({ domain: l.domain, term: l.term, state: l.state, service: l.service })),
    charged: order.stripe.amount_captured !== undefined ? (order.stripe.amount_captured - (order.stripe.amount_refunded ?? 0)) / 100 : null,
    email: order.registrant.email,
  };
  sendJson(res, 200, out);
  // A transferring order waits days for the customer's code: the sweep and the code link drive it.
  if (DRIVABLE.includes(order.status) && order.status !== "transferring") afterReply("fulfil " + id, () => fulfil(id, 20));
});

// The order, then the Stripe Checkout Session.
//
// THE CARD IS ONLY AUTHORISED (capture_method=manual). The webhook hands the order to the
// fulfilment, which registers each domain and then charges only for what registered, releasing the
// rest of the hold. Promotion codes are entered on Stripe's page.

import type { CheckoutRegistrant, Currency } from "@cdr/shared";
import type { Config } from "../../core/config";
import { isTestMode } from "../../core/config";
import { HttpError } from "../../core/http";
import { money } from "../../core/money";
import { isoNow, unixNow } from "../../core/time";
import { stripe } from "../../integrations/stripe/client";
import { insertOrder, newOrderId, note, orderToken, updateOrder } from "../orders/order.store";
import type { Order, OrderLine } from "../orders/order.types";

interface NewOrder {
  config: Config;
  currency: Currency;
  lines: OrderLine[];
  registrant: CheckoutRegistrant;
  ip: string | null;
  country: string | null;
}

export async function startCheckout({ config: c, currency, lines, registrant, ip, country }: NewOrder): Promise<{ url: string; order: string }> {
  const subtotal = lines.reduce((n, l) => n + l.amount_cents, 0);
  const id = newOrderId();
  const now = isoNow();
  const order: Order = {
    id,
    status: "pending_payment",
    test_mode: isTestMode(c),
    opensrs_env: c.opensrsEnv,
    created_at: now,
    updated_at: now,
    currency,
    subtotal_cents: subtotal,
    lines,
    registrant,
    // Kept for the registrar agreement (OpenSRS MSA 3.9): who ordered, from where, and when.
    registrant_ip: ip ?? "",
    visitor_country: country,
    agreement: { accepted_at: now, document: "Domain Registration and Management Agreement", url: c.siteUrl + "/tos/" },
    stripe: {},
    events: [],
    log: [],
  };
  note(order, `Order created, ${money(subtotal, currency)}; all domains confirmed available.`);
  await insertOrder(order);

  const r = await stripe("POST", "/checkout/sessions", {
    mode: "payment",
    payment_method_types: ["card"],
    client_reference_id: id,
    customer_email: registrant.email,
    success_url: `${c.siteUrl}/checkout/done/?order=${id}&t=${orderToken(id)}`,
    cancel_url: `${c.siteUrl}/checkout/`,
    // Short, so the availability check is still fresh when the customer pays. Stripe's minimum is
    // 30 minutes; a little more so a clock a few minutes out cannot fall under it.
    expires_at: unixNow() + 40 * 60,
    allow_promotion_codes: "true",
    metadata: { order_id: id },
    payment_intent_data: {
      capture_method: "manual",
      metadata: { order_id: id },
      description: `Corporate Domain Registry order ${id}`,
    },
    line_items: lines.map((l) => ({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: l.amount_cents,
        product_data: { name: `${l.domain}, registration for ${l.term} ${l.term === 1 ? "year" : "years"}` },
      },
    })),
  }, "cdr-checkout-" + id);

  if (r.status !== 200 || !r.body?.url) {
    await updateOrder(id, (o) => {
      o.status = "stripe_error";
      o.stripe.error = { http: r.status, type: r.body?.error?.type ?? null, message: r.body?.error?.message ?? null };
      note(o, "Stripe refused the session: " + (r.body?.error?.message ?? `HTTP ${r.status}`));
      return o;
    });
    throw new HttpError(502, "payment_unavailable", "Payment could not be started. Nothing was charged; try again in a moment.");
  }

  await updateOrder(id, (o) => {
    o.stripe.session_id = r.body.id;
    o.stripe.expires_at = Number.isInteger(r.body.expires_at) ? isoNow(new Date(r.body.expires_at * 1000)) : null;
    return o;
  });
  return { url: r.body.url, order: id };
}

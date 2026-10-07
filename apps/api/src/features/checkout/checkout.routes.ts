// POST /api/checkout/ — the registrant form and the cart in, a Stripe Checkout URL out.
//
// The page sends JSON: { items: [{domain, term, service}], registrant: {...}, agree, ca_agree }.
// service is "register" (the default), "renew" or "transfer"; ca_agree comes with a .ca registration or transfer.
//
// Every line is priced here from the catalogue, in the visitor's currency: CAD in Canada, USD
// everywhere else, decided from the same IP database as the header chip.
//
// EVERY DOMAIN IS CHECKED AGAIN, straight at the registry (no cache), before Stripe is asked. A name
// that went while it sat in the cart is refused here, before any card is touched. "renew" and
// "transfer" items become a renewal if the domain is ours, a transfer otherwise.

import express, { Router } from "express";
import { currencyForCountry, type CheckoutResponse } from "@cdr/shared";
import { isTestMode, requireConfig } from "../../core/config";
import { allow, HttpError, sendJson } from "../../core/http";
import { rateLimited } from "../../core/rate-limit";
import { visitorCountry, visitorIp } from "../../core/visitor";
import { lookup } from "../../integrations/opensrs/client";
import { checkRenewal } from "../renew/renew.service";
import { startCheckout } from "./checkout.service";
import { asService, validateCa, validateCart, validateRegistrant } from "./checkout.validation";

export const checkoutRouter = Router();

checkoutRouter.all(
  "/api/checkout",
  allow("POST"),
  express.json({ limit: "64kb", type: () => true }),
  async (req, res) => {
    const c = requireConfig(["stripeSecretKey", "siteUrl", "notifyEmail", "opensrsUsername", "opensrsApiKey"]);
    // Test with test, live with live. Real domains for test money, or real money for test domains,
    // is a misconfiguration, and the shop stays shut until it is fixed.
    if ((c.opensrsEnv === "live") === isTestMode(c)) throw new HttpError(503, "not_configured", "The shop is not fully configured yet.");
    const input = req.body;
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new HttpError(400, "bad_request", "The request could not be read.");
    const ip = visitorIp(req);
    if (rateLimited("checkout", ip, 20, 600)) throw new HttpError(429, "too_many", "Too many attempts. Wait a few minutes and try again.");

    const country = await visitorCountry(req);
    const currency = currencyForCountry(country);
    const cart = validateCart(input.items, currency, c.cadRate);
    const { registrant, errors } = validateRegistrant(input.registrant, input.agree);
    if (cart.lines.some((l) => l.service !== "renew" && l.domain.endsWith(".ca"))) validateCa(registrant, input.registrant, input.ca_agree, errors);
    if (Object.keys(errors).length || Object.keys(cart.lineErrors).length) {
      throw new HttpError(422, "invalid", "Some details need attention.", { fields: errors, lines: cart.lineErrors });
    }
    if (!cart.lines.length) throw new HttpError(422, "empty_cart", "Your cart is empty.");

    // The final check, at the registry.
    const unavailable: Record<string, string> = {};
    const down = () => new HttpError(503, "registry_unavailable", "We could not confirm your domains with the registry just now. Nothing was charged; please try again in a moment.");
    for (const [n, line] of cart.lines.entries()) {
      const at = cart.positions[n];
      if (line.service === "renew" || line.service === "transfer") {
        const r = await checkRenewal(line.domain);
        if (r.status === "error") throw down();
        if (r.status === "not_registered") unavailable[at] = "Nobody has registered this domain yet. Search for it to register it instead.";
        else if (r.status === "not_transferable") unavailable[at] = r.reason;
        else if (line.term > r.max_term) {
          unavailable[at] = r.max_term > 0
            ? `This domain can be renewed for at most ${r.max_term} ${r.max_term === 1 ? "year" : "years"} now. Change the duration in your cart.`
            : "This domain is already renewed as far ahead as the registry allows.";
        } else {
          // A .ca sent as a renewal turned out to be elsewhere: the CIRA details were never asked.
          if (r.status === "transferable" && line.domain.endsWith(".ca") && !registrant.ca_legal_type) {
            unavailable[at] = "This .ca domain is with another company, so it moves to us and we need the owner's .ca details. Remove it and add it again from the renewal page.";
            continue;
          }
          asService(line, r.status === "renewable" ? "renew" : "transfer");
          if (r.expires_at) line.expires_at = r.expires_at;
          if (r.status === "transferable" && r.registrar) line.transfer = { from_registrar: r.registrar };
        }
        continue;
      }
      const look = await lookup(line.domain, true);
      if (look.status === "error") throw down();
      if (look.status !== "available") unavailable[at] = "This domain is no longer available. Remove it from your cart to continue.";
    }
    if (Object.keys(unavailable).length) {
      throw new HttpError(422, "unavailable", "A domain in your cart cannot be ordered.", { fields: {}, lines: unavailable });
    }

    const out: CheckoutResponse = await startCheckout({ config: c, currency, lines: cart.lines, registrant, ip, country });
    sendJson(res, 200, out);
  },
);

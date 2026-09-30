// GET /api/domain-check/?domain=example.com — is it free, and what does it cost here.
//
// Answers 200 with one of these statuses, so the page has one shape to read:
//   available    free to register; prices holds the ladder in the visitor's currency
//   taken        registered already (or a registration is waiting for it)
//   premium      a registry premium name: not sold online
//   unsupported  an extension the shop does not sell online (catalog.json "sellable")
//   invalid      not a domain name
//   error        Tucows did not answer; the page offers a retry
// and 429 when one visitor searches too fast (OpenSRS agreement 3.2 forbids bulk lookups).
//
// The answer is a snapshot: checkout checks every domain again, straight at the registry, before
// any card is touched.

import { Router } from "express";
import { catalog, isSellable, isValidDomain, normaliseDomain, priceCents, type DomainCheckResponse } from "@cdr/shared";
import { requireConfig, tryConfig } from "../../core/config";
import { allow, HttpError, sendJson } from "../../core/http";
import { isoNow } from "../../core/time";
import { rateLimited } from "../../core/rate-limit";
import { visitorCurrency, visitorIp } from "../../core/visitor";
import { lookup } from "../../integrations/opensrs/client";

export const domainCheckRouter = Router();

domainCheckRouter.all("/api/domain-check", allow("GET"), async (req, res) => {
  const domain = normaliseDomain(typeof req.query.domain === "string" ? req.query.domain : "");
  const currency = await visitorCurrency(req);
  const out: DomainCheckResponse = { domain, status: "invalid", currency: currency.toUpperCase() };

  if (!isValidDomain(domain)) return sendJson(res, 200, out);
  if (!isSellable(domain)) return sendJson(res, 200, { ...out, status: "unsupported" });

  requireConfig(["opensrsUsername", "opensrsApiKey"]);
  if (rateLimited("check", visitorIp(req), 30, 60)) {
    throw new HttpError(429, "too_many", "Too many searches in a row. Wait a minute and try again.");
  }

  const look = await lookup(domain);
  out.status = look.status;
  if (look.status === "available") {
    const rate = tryConfig()?.cadRate ?? 1;
    out.prices = Object.fromEntries(catalog.terms.map((t) => [String(t), (priceCents(t, currency, rate) ?? 0) / 100]));
  }
  out.checked_at = isoNow();
  sendJson(res, 200, out);
});

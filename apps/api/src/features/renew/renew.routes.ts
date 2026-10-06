// GET /api/renew-check/?domain=example.com — can this domain be renewed here, until when does it
// run now, and what does it cost. The renewal page (/renew/) asks this; checkout asks again before
// any card is touched.
//
//   renewable         in CDR's Tucows account: expires_at, max_term and the prices up to max_term
//   transferable      held elsewhere and free to move here: the same, expires_at as the registry shows it
//   not_transferable  held elsewhere, but the registry would refuse a move now: reason
//   not_registered    nobody holds it (search it to register it)
//   invalid           not a domain name
//   error             Tucows or the registry did not answer; the page offers a retry

import { Router } from "express";
import { catalog, isValidDomain, normaliseDomain, priceCents, type RenewCheckResponse } from "@cdr/shared";
import { requireConfig } from "../../core/config";
import { allow, HttpError, sendJson } from "../../core/http";
import { rateLimited } from "../../core/rate-limit";
import { visitorCurrency, visitorIp } from "../../core/visitor";
import { checkRenewal } from "./renew.service";

export const renewRouter = Router();

renewRouter.all("/api/renew-check", allow("GET"), async (req, res) => {
  const domain = normaliseDomain(typeof req.query.domain === "string" ? req.query.domain : "");
  const currency = await visitorCurrency(req);
  const out: RenewCheckResponse = { domain, status: "invalid", currency: currency.toUpperCase() };
  if (!isValidDomain(domain)) return sendJson(res, 200, out);

  const c = requireConfig(["opensrsUsername", "opensrsApiKey"]);
  // The same bucket as the search: one visitor, 30 Tucows queries a minute.
  if (rateLimited("check", visitorIp(req), 30, 60)) {
    throw new HttpError(429, "too_many", "Too many searches in a row. Wait a minute and try again.");
  }
  const r = await checkRenewal(domain);
  out.status = r.status;
  if (r.status === "not_transferable") out.reason = r.reason;
  if (r.status === "renewable" || r.status === "transferable") {
    if (r.expires_at) out.expires_at = r.expires_at;
    out.max_term = r.max_term;
    out.prices = Object.fromEntries(catalog.terms.filter((t) => t <= r.max_term).map((t) => [String(t), (priceCents(t, currency, c.cadRate) ?? 0) / 100]));
  }
  sendJson(res, 200, out);
});

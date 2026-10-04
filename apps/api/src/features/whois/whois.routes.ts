// GET /api/whois/?domain=example.com — the domain's public registration record, from its
// registry's RDAP server (integrations/rdap). Contact details are not shown: registries redact
// them, and the page does not ask for them.

import { Router } from "express";
import { isValidDomain, normaliseDomain, type WhoisResponse } from "@cdr/shared";
import { allow, HttpError, sendJson } from "../../core/http";
import { isoNow } from "../../core/time";
import { rateLimited } from "../../core/rate-limit";
import { visitorIp } from "../../core/visitor";
import { rdapDomain } from "../../integrations/rdap/rdap";

export const whoisRouter = Router();

whoisRouter.all("/api/whois", allow("GET"), async (req, res) => {
  const domain = normaliseDomain(typeof req.query.domain === "string" ? req.query.domain : "");
  const out: WhoisResponse = {
    domain, status: "invalid", registrar: null, created_at: null, updated_at: null, expires_at: null, statuses: [], nameservers: [], checked_at: isoNow(),
  };
  if (!isValidDomain(domain)) return sendJson(res, 200, out);
  if (rateLimited("whois", visitorIp(req), 20, 60)) {
    throw new HttpError(429, "too_many", "Too many lookups in a row. Wait a minute and try again.");
  }
  const r = await rdapDomain(domain);
  sendJson(res, 200, r.status === "registered" ? { ...out, status: r.status, ...r.record } : { ...out, status: r.status });
});

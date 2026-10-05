// GET /api/whois/?domain=example.com: the domain's public registration record, from its
// registry's RDAP server and the registrar's record it links to (integrations/rdap). Personal
// details the registrar hides are left out.

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
    domain, status: "invalid", registry_domain_id: null, registrar: null, registrar_whois: null, registrar_iana_id: null, registrar_url: null, abuse_email: null, abuse_phone: null,
    registrant: null, admin: null, tech: null, created_at: null, updated_at: null, expires_at: null, registrar_expires_at: null,
    record_updated_at: null, complaint_url: null, statuses: [], nameservers: [], dnssec: null, checked_at: isoNow(),
  };
  if (!isValidDomain(domain)) return sendJson(res, 200, out);
  if (rateLimited("whois", visitorIp(req), 20, 60)) {
    throw new HttpError(429, "too_many", "Too many lookups in a row. Wait a minute and try again.");
  }
  const r = await rdapDomain(domain);
  sendJson(res, 200, r.status === "registered" ? { ...out, status: r.status, ...r.record } : { ...out, status: r.status });
});

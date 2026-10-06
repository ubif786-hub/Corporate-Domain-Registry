// Renew from anywhere: domains in our Tucows account renew in place, others are transferred in.
// Transfers are checked against RDAP before payment. A registrar lock is fine; the owner removes it.

import { isSellable, tldOf, type RdapRecord } from "@cdr/shared";
import { domainExpiry } from "../../integrations/opensrs/client";
import { rdapDomain } from "../../integrations/rdap/rdap";

const DAY_MS = 86_400_000;
const YEAR_MS = 365.2425 * DAY_MS;

/** The most years a domain expiring on expiresAt can be renewed by today: the registries refuse a
 *  term that would run more than ten years from now. 0 when it is already that far out. */
export function maxRenewTerm(expiresAt: string, now = Date.now()): number {
  const left = Math.max(0, (Date.parse(expiresAt) - now) / YEAR_MS);
  return Math.max(0, Math.min(10, Math.floor(10 - left)));
}

/** Why the registry would refuse a move today, or null (RDAP statuses as RFC 8056 spells them). */
export function transferBlock(r: Pick<RdapRecord, "statuses" | "created_at" | "transferred_at" | "expires_at">, now = Date.now()): string | null {
  const has = (status: string) => r.statuses.some((s) => s.toLowerCase() === status);
  if (has("server transfer prohibited")) return "The registry has locked this domain against transfers. The company it is with now can tell you why.";
  if (has("pending delete") || has("redemption period") || has("pending restore")) return "This domain has expired and is being deleted. Only the company it is with now can restore it.";
  if (has("pending transfer")) return "This domain is already being transferred.";
  const within = (iso: string | null, days: number) => iso !== null && now - Date.parse(iso) < days * DAY_MS;
  if (within(r.created_at, 60)) return "This domain was registered less than 60 days ago. Registries allow a move 60 days after registration.";
  if (within(r.transferred_at, 60)) return "This domain moved to its current company less than 60 days ago. Registries allow another move 60 days after.";
  if (r.expires_at && now - Date.parse(r.expires_at) > 30 * DAY_MS) return "This domain expired more than 30 days ago. Only the company it is with now can renew it.";
  return null;
}

export type Renewal =
  | { status: "renewable"; expires_at: string; max_term: number }
  | { status: "transferable"; expires_at: string | null; max_term: number; registrar: string | null }
  | { status: "not_transferable"; reason: string }
  | { status: "not_registered" }
  | { status: "error" };

export async function checkRenewal(domain: string): Promise<Renewal> {
  const r = await domainExpiry(domain);
  if (r.status === "error") return r;
  if (r.status === "ours") return { status: "renewable", expires_at: r.expires_at, max_term: maxRenewTerm(r.expires_at) };
  if (!isSellable(domain)) return { status: "not_transferable", reason: `.${tldOf(domain)} domains are not sold online. Contact us to move one.` };
  const rdap = await rdapDomain(domain);
  if (rdap.status === "available") return { status: "not_registered" };
  if (rdap.status !== "registered") return { status: "error" };
  const why = transferBlock(rdap.record);
  if (why) return { status: "not_transferable", reason: why };
  // A transfer adds a year, so the same 10-year cap applies.
  const expires = rdap.record.expires_at;
  const max = expires ? maxRenewTerm(expires) : 10;
  if (max < 1) return { status: "not_transferable", reason: "This domain is already registered as far ahead as the registry allows." };
  return { status: "transferable", expires_at: expires, max_term: max, registrar: rdap.record.registrar };
}

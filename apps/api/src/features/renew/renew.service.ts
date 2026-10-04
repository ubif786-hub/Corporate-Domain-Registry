// Renewals: only for domains in CDR's own Tucows account (bought through this site or moved to
// CDR). Tucows answers GET DOMAIN for those alone, with the expiry date the renewal starts from.

import { domainExpiry } from "../../integrations/opensrs/client";

const YEAR_MS = 365.2425 * 86_400_000;

/** The most years a domain expiring on expiresAt can be renewed by today: the registries refuse a
 *  term that would run more than ten years from now. 0 when it is already that far out. */
export function maxRenewTerm(expiresAt: string, now = Date.now()): number {
  const left = Math.max(0, (Date.parse(expiresAt) - now) / YEAR_MS);
  return Math.max(0, Math.min(10, Math.floor(10 - left)));
}

export type Renewal =
  | { status: "renewable"; expires_at: string; max_term: number }
  | { status: "not_ours" } | { status: "error" };

export async function checkRenewal(domain: string): Promise<Renewal> {
  const r = await domainExpiry(domain);
  if (r.status !== "ours") return r;
  return { status: "renewable", expires_at: r.expires_at, max_term: maxRenewTerm(r.expires_at) };
}

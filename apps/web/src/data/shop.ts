// The live shop: whether it is switched on in this build, and the one call the search makes.
//
// THE SHOP IS ON WHEN THE BUILD SAYS SO (NEXT_PUBLIC_PAYMENTS=1): the export for the server
// (scripts/export-static.mjs --payments), or `npm run dev` with the API running beside it
// (npm run dev:api; next.config.ts sends /api/* there). Without it the search says online ordering
// is not open instead of failing.

import { catalog, type CheckStatus as ApiCheckStatus, type DomainCheckResponse } from "@cdr/shared";

export const SHOP_OPEN = process.env.NEXT_PUBLIC_PAYMENTS === "1";

/** The extensions sold online, without the dot (catalog.json "sellable"). */
export const SELLABLE_TLDS: readonly string[] = catalog.sellable;

/**
 * What the search can say about a domain: the API's answers (available, taken, premium,
 * unsupported, invalid, error) plus two of the page's own:
 *   busy         too many searches in a row (the registrar forbids bulk lookups)
 *   closed       this build has no shop behind it
 */
export type CheckStatus = ApiCheckStatus | "busy" | "closed";

export interface DomainCheck {
  domain: string;
  status: CheckStatus;
}

const KNOWN: ApiCheckStatus[] = ["available", "taken", "premium", "unsupported", "invalid", "error"];

/** Asks GET /api/domain-check/. Never throws, except when the caller aborts. */
export async function checkDomain(domain: string, signal?: AbortSignal): Promise<DomainCheck> {
  if (!SHOP_OPEN) return { domain, status: "closed" };
  try {
    const res = await fetch(`/api/domain-check/?domain=${encodeURIComponent(domain)}`, { cache: "no-store", signal });
    if (res.status === 429) return { domain, status: "busy" };
    if (!res.ok) return { domain, status: "error" };
    const data = (await res.json()) as Partial<DomainCheckResponse> | null;
    const status: CheckStatus = data?.status && KNOWN.includes(data.status) ? data.status : "error";
    return { domain: typeof data?.domain === "string" && data.domain ? data.domain : domain, status };
  } catch (e) {
    if (signal?.aborted) throw e;
    return { domain, status: "error" };
  }
}

/** The same name under the other extensions sold online: "shop.com" -> shop.net, shop.org... */
export function alternatives(domain: string): string[] {
  const dot = domain.lastIndexOf(".");
  if (dot < 1) return [];
  const name = domain.slice(0, dot);
  const tld = domain.slice(dot + 1);
  if (name.includes(".")) return [];
  return SELLABLE_TLDS.filter((t) => t !== tld).map((t) => `${name}.${t}`);
}

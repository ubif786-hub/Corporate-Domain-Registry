// The live shop: whether it is switched on in this build, and the one call the search makes.
//
// THE SHOP RUNS ONLY IN A PAYMENTS EXPORT (scripts/export-cpanel.mjs --payments), because its
// server half is PHP beside the static pages (cpanel/api). `npm run dev` and a plain export have
// no such server, so the search says online ordering is not open instead of failing.

import catalog from "./catalog.json";

export const SHOP_OPEN = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1" && process.env.NEXT_PUBLIC_PAYMENTS === "1";

/** The extensions sold online, without the dot (catalog.json "sellable"). */
export const SELLABLE_TLDS: readonly string[] = catalog.sellable;

/**
 * What the search can say about a domain:
 *   available    free to register
 *   taken        registered already
 *   premium      a registry premium name, not sold online
 *   unsupported  an extension not sold online
 *   invalid      not a domain name
 *   error        the registry did not answer; try again
 *   busy         too many searches in a row (the registrar forbids bulk lookups)
 *   closed       this build has no shop behind it
 */
export type CheckStatus = "available" | "taken" | "premium" | "unsupported" | "invalid" | "error" | "busy" | "closed";

export interface DomainCheck {
  domain: string;
  status: CheckStatus;
}

const KNOWN: CheckStatus[] = ["available", "taken", "premium", "unsupported", "invalid", "error"];

/** Asks api/domain-check.php. Never throws, except when the caller aborts. */
export async function checkDomain(domain: string, signal?: AbortSignal): Promise<DomainCheck> {
  if (!SHOP_OPEN) return { domain, status: "closed" };
  try {
    const res = await fetch(`/api/domain-check/?domain=${encodeURIComponent(domain)}`, { cache: "no-store", signal });
    if (res.status === 429) return { domain, status: "busy" };
    if (!res.ok) return { domain, status: "error" };
    const data = await res.json();
    const status: CheckStatus = KNOWN.includes(data?.status) ? data.status : "error";
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

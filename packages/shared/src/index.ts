// What the site (apps/web) and the API (apps/api) must agree on: the catalogue, the domain rules,
// the prices, and the shape of every API reply the pages read. One copy, so the price the server
// charges and the price the page shows cannot drift apart.

import catalogJson from "../catalog.json";
import type { RdapRecord } from "./rdap";

export * from "./rdap";

export interface Catalog {
  chargeCurrency: string;
  terms: number[];
  ladder: Record<string, number>;
  sellable: string[];
  countries: string[];
  notSoldOnline: string[];
}

export const catalog: Catalog = catalogJson;

/* ---------- currencies ---------- */

/** Canada pays in CAD, everyone else in USD (the client's rule, 27 Sep 2026). */
export type Currency = "usd" | "cad";

export function currencyForCountry(country: string | null | undefined): Currency {
  return country === "CA" ? "cad" : "usd";
}

/** A term's price in cents. CAD is the USD ladder times cadRate, which the client set to 1
 *  ("dollar for dollar", 28 Sep 2026). Null for a term the catalogue does not sell. */
export function priceCents(term: number, currency: Currency, cadRate = 1): number | null {
  const usd = catalog.ladder[String(term)];
  if (usd === undefined) return null;
  const rate = currency === "cad" ? cadRate : 1;
  return Math.round(usd * rate * 100);
}

/* ---------- domain names ---------- */

/** "HTTPS://www.Example.com/path" -> "example.com". */
export function normaliseDomain(raw: unknown): string {
  let d = String(raw ?? "").trim().toLowerCase();
  d = d.replace(/^[a-z]+:\/\//, "");
  d = d.replace(/[/?#].*$/, "");
  d = d.replace(/^www\./, "");
  return d.replace(/\.+$/, "");
}

const DOMAIN_SHAPE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/** Shaped like a domain name: labels of letters, digits and inner hyphens (punycode included),
 *  an extension of letters. Whether it can be SOLD is isSellable(). */
export function isValidDomain(domain: string): boolean {
  return domain.length <= 253 && DOMAIN_SHAPE.test(domain);
}

export function tldOf(domain: string): string {
  return domain.slice(domain.lastIndexOf(".") + 1);
}

/** A second-level name (one label, one extension) on an extension sold online (catalog.json
 *  "sellable", plan D6). Hyphens in the third and fourth places are reserved for punycode. */
export function isSellable(domain: string): boolean {
  const dots = domain.split(".").length - 1;
  return dots === 1
    && catalog.sellable.includes(tldOf(domain))
    && (domain.slice(2, 4) !== "--" || domain.startsWith("xn--"));
}

/* ---------- .ca (CIRA) ---------- */

/** CIRA's Canadian presence classes, as OpenSRS takes them (registrant_extra_info.legal_type).
 *  org: the registrant must be an organisation, so the organisation name is required (OpenSRS
 *  .CA contact rules: every type except ABO, CCT, LGR and RES). */
export const CA_LEGAL_TYPES: { code: string; label: string; org: boolean }[] = [
  { code: "CCT", label: "Canadian citizen", org: false },
  { code: "RES", label: "Permanent resident of Canada", org: false },
  { code: "CCO", label: "Corporation registered in Canada", org: true },
  { code: "PRT", label: "Partnership registered in Canada", org: true },
  { code: "TRS", label: "Trust established in Canada", org: true },
  { code: "ASS", label: "Canadian unincorporated association", org: true },
  { code: "TDM", label: "Owner of a trademark registered in Canada", org: true },
  { code: "LGR", label: "Legal representative of a Canadian citizen or permanent resident", org: false },
  { code: "ABO", label: "Aboriginal person indigenous to Canada", org: false },
  { code: "INB", label: "Indian band recognised in Canada", org: true },
  { code: "EDU", label: "Canadian educational institution", org: true },
  { code: "LAM", label: "Canadian library, archive or museum", org: true },
  { code: "HOP", label: "Canadian hospital", org: true },
  { code: "GOV", label: "Government or government body in Canada", org: true },
  { code: "TRD", label: "Trade union recognised in Canada", org: true },
  { code: "PLT", label: "Canadian political party", org: true },
  { code: "OMK", label: "Official mark protected by the Trademarks Act", org: true },
  { code: "MAJ", label: "His Majesty the King", org: true },
];

/* ---------- the API contract ---------- */

/** What a cart line buys. A renewal is only for a domain already in CDR's Tucows account. */
export type LineService = "register" | "renew";

/** GET /api/renew-check/?domain= */
export interface RenewCheckResponse {
  domain: string;
  /** renewable: in CDR's Tucows account; not_ours: registered elsewhere (or not at all) */
  status: "renewable" | "not_ours" | "invalid" | "error";
  /** "USD" or "CAD" */
  currency: string;
  /** Only when renewable. */
  expires_at?: string;
  /** The most years it can be renewed by: a registration may not run past ten years. */
  max_term?: number;
  prices?: Record<string, number>;
}

/** GET /api/whois/?domain= (the registry's RDAP record merged with the registrar's) */
export type WhoisResponse = RdapRecord & {
  domain: string;
  /** registered: a record exists; available: the registry has none; unsupported: the extension
   *  publishes no RDAP service */
  status: "registered" | "available" | "unsupported" | "invalid" | "error";
  /** set when the server could not read the registrar's record: the page fetches it from the browser */
  registrar_record_url: string | null;
  checked_at: string;
};

/** GET /api/domain-check/?domain= */
export type CheckStatus = "available" | "taken" | "premium" | "unsupported" | "invalid" | "error";

export interface DomainCheckResponse {
  domain: string;
  status: CheckStatus;
  /** "USD" or "CAD" */
  currency: string;
  /** Only when available: term (years, as a string) -> price in whole currency units. */
  prices?: Record<string, number>;
  checked_at?: string;
}

/** POST /api/checkout/ */
export interface CheckoutRegistrant {
  first_name: string;
  last_name: string;
  org_name: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  /** Only on orders with a .ca domain: CIRA's legal type (CA_LEGAL_TYPES). */
  ca_legal_type?: string;
}

export interface CheckoutRequest {
  /** service defaults to "register". */
  items: { domain: string; term: number; service?: LineService }[];
  registrant: Partial<CheckoutRegistrant>;
  agree: boolean;
  /** Only with a .ca domain in the cart: the registrant meets CIRA's Canadian presence rules and
   *  accepts CIRA's registrant agreement. */
  ca_agree?: boolean;
}

export interface CheckoutResponse {
  url: string;
  order: string;
}

/** Every refusal from the API has this shape. fields and lines come with a 422. */
export interface ApiError {
  error: string;
  message: string;
  /** form field name -> what is wrong */
  fields?: Record<string, string>;
  /** cart position (as a string) -> what is wrong with that line */
  lines?: Record<string, string>;
}

/** GET /api/order-status/?order=&t= */
export type OrderStatus =
  | "pending_payment" | "authorized" | "fulfilling" | "pending"
  | "registered" | "partially_registered" | "failed"
  | "expired" | "payment_failed" | "amount_mismatch" | "settle_error" | "needs_review" | "stripe_error";

export type LineState = "new" | "registering" | "registered" | "pending" | "failed" | "unknown";

export interface OrderStatusResponse {
  order: string;
  status: OrderStatus;
  /** "USD" or "CAD" */
  currency: string;
  /** state "registered" on a renewal means renewed. */
  lines: { domain: string; term: number; state: LineState; service: LineService }[];
  /** Whole currency units actually charged, once settled. */
  charged: number | null;
  email: string;
}

/** GET /api/geo/ */
export interface GeoResponse {
  country: string | null;
  city: string | null;
  region: string | null;
  ip: string | null;
  host: string | null;
}

// What the site (apps/web) and the API (apps/api) must agree on: the catalogue, the domain rules,
// the prices, and the shape of every API reply the pages read. One copy, so the price the server
// charges and the price the page shows cannot drift apart.

import catalogJson from "../catalog.json";

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

/* ---------- the API contract ---------- */

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
}

export interface CheckoutRequest {
  items: { domain: string; term: number }[];
  registrant: Partial<CheckoutRegistrant>;
  agree: boolean;
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
  lines: { domain: string; term: number; state: LineState }[];
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

// What the checkout form and the cart must look like before anything is checked at the registry.
// NOTHING THE BROWSER SAYS ABOUT MONEY IS BELIEVED: every line is priced here from the catalogue.

import { catalog, isSellable, isValidDomain, normaliseDomain, priceCents, tldOf, type CheckoutRegistrant, type Currency } from "@cdr/shared";
import { HttpError } from "../../core/http";
import type { OrderLine } from "../orders/order.types";

export const MAX_ITEMS = 10;

export interface ValidCart {
  lines: OrderLine[];
  /** For each line, its position in the cart the browser sent, so errors point at the right row. */
  positions: number[];
  lineErrors: Record<string, string>;
}

export function validateCart(rawItems: unknown, currency: Currency, cadRate: number): ValidCart {
  const items = Array.isArray(rawItems) ? rawItems : [];
  if (!items.length) throw new HttpError(422, "empty_cart", "Your cart is empty.");
  if (items.length > MAX_ITEMS) throw new HttpError(422, "cart_too_large", `Up to ${MAX_ITEMS} domains per order. Please place a second order for the rest.`);

  const lines: OrderLine[] = [];
  const positions: number[] = [];
  const lineErrors: Record<string, string> = {};
  const seen = new Set<string>();
  items.forEach((item, i) => {
    const domain = normaliseDomain(typeof item?.domain === "string" ? item.domain : "");
    const n = Number(item?.term);
    const term = Number.isFinite(n) ? Math.trunc(n) : 0;
    if (!isValidDomain(domain)) { lineErrors[i] = "This is not a domain name we can register."; return; }
    if (!isSellable(domain)) { lineErrors[i] = `.${tldOf(domain)} domains are not sold online. Contact us to order one.`; return; }
    const amount = priceCents(term, currency, cadRate);
    if (!catalog.terms.includes(term) || amount === null) { lineErrors[i] = "Choose a registration period."; return; }
    if (seen.has(domain)) return;
    seen.add(domain);
    positions.push(i);
    lines.push({ domain, service: "register", label: "Domain registration", term, amount_cents: amount, state: "new", attempts: 0 });
  });
  return { lines, positions, lineErrors };
}

/** The registrant: one contact, the one OpenSRS copies to admin and billing. */
export function validateRegistrant(raw: unknown, agreed: unknown): { registrant: CheckoutRegistrant; errors: Record<string, string> } {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};
  const field = (name: keyof CheckoutRegistrant, max: number, required = true): string => {
    const v = typeof r[name] === "string" ? (r[name] as string).replace(/\s+/gu, " ").trim() : "";
    if (v === "" && required) { errors[name] = "Required."; return ""; }
    if ([...v].length > max) { errors[name] = `At most ${max} characters.`; return ""; }
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x1F\x7F<>]/.test(v)) { errors[name] = "Remove the special characters."; return ""; }
    return v;
  };
  const registrant: CheckoutRegistrant = {
    first_name: field("first_name", 64),
    last_name: field("last_name", 64),
    org_name: field("org_name", 64, false),
    email: field("email", 127),
    phone: field("phone", 24),
    address1: field("address1", 64),
    address2: field("address2", 64, false),
    city: field("city", 64),
    state: field("state", 32, false),
    postal_code: field("postal_code", 16),
    country: field("country", 2).toUpperCase(),
  };
  if (registrant.email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(registrant.email)) errors.email = "Enter a valid email address.";
  if (registrant.phone !== "") {
    // Stored as E.164; the Tucows client turns it into OpenSRS's +CC.NUMBER at registration.
    let digits = registrant.phone.replace(/[\s().-]/g, "");
    // North American numbers typed without the plus: 4165550123 or 14165550123.
    if (registrant.country === "CA" || registrant.country === "US") {
      if (/^\d{10}$/.test(digits)) digits = "+1" + digits;
      else if (/^1\d{10}$/.test(digits)) digits = "+" + digits;
    }
    if (!/^\+[1-9]\d{6,14}$/.test(digits)) errors.phone = "Include the country code, for example +1 416 555 0123.";
    else registrant.phone = digits;
  }
  if (registrant.country !== "" && !catalog.countries.includes(registrant.country)) errors.country = "Choose a country.";
  // OpenSRS requires a state or province for Canada and the United States, and rejects the order without one.
  if ((registrant.country === "CA" || registrant.country === "US") && registrant.state === "") {
    errors.state = "Required for " + (registrant.country === "CA" ? "Canada" : "the United States") + ".";
  }
  if (!agreed) errors.agree = "Accept the agreement to continue.";
  return { registrant, errors };
}

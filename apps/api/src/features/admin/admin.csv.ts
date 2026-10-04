// One row per domain, for a spreadsheet. Unpaid checkouts are left out.

import { plainAmount } from "../../core/money";
import type { Order } from "../orders/order.types";
import type { SalesReport } from "../reports/reports.service";

const HEADER = ["order", "created_utc", "order_status", "test", "domain", "type", "years", "domain_status", "expires_utc", "price", "currency", "order_total", "discount", "charged", "tucows_order", "first_name", "last_name", "organisation", "email", "phone", "address1", "address2", "city", "state", "postal_code", "country", "ca_legal_type", "ordered_from_ip", "stripe_payment"];

// A cell starting with = + - @ would run as a formula in a spreadsheet.
const safe = (v: unknown) => {
  const s = String(v ?? "");
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
};

const cell = (s: string) => (/[",\n\r\t ]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

const row = (values: unknown[]) => values.map((v) => cell(safe(v))).join(",") + "\n";

export function ordersCsv(orders: Order[]): string {
  // The byte-order mark makes Excel read the file as UTF-8.
  let out = "﻿" + HEADER.map(cell).join(",") + "\n";
  for (const o of orders) {
    if (o.status === "pending_payment" || o.status === "expired" || o.status === "stripe_error") continue;
    const r = o.registrant;
    const s = o.stripe;
    for (const l of o.lines) {
      out += row([
        o.id, o.created_at, o.status, o.test_mode ? "yes" : "no",
        l.domain, l.service === "renew" ? "renewal" : "registration", l.term, l.state, l.state === "registered" ? l.expires_at ?? "" : "",
        plainAmount(l.amount_cents), o.currency.toUpperCase(),
        plainAmount(o.subtotal_cents),
        s.amount_discount !== undefined ? plainAmount(s.amount_discount) : "",
        s.amount_captured !== undefined ? plainAmount(s.amount_captured) : "",
        l.opensrs?.order_id ?? "",
        r.first_name, r.last_name, r.org_name, r.email, r.phone, r.address1, r.address2, r.city, r.state, r.postal_code, r.country, r.ca_legal_type ?? "",
        o.registrant_ip ?? "",
        s.payment_intent ?? "",
      ]);
    }
  }
  return out;
}

/** The Analytics page's downloads. buyers: one row per domain ordered in the period. renewals: the
 *  domains coming up for renewal, each with its link to the renewal page, for a mailing. */
export function reportCsv(r: SalesReport, list: "buyers" | "renewals", siteUrl: string): string {
  if (list === "renewals") {
    let out = "﻿" + ["domain", "expires_utc", "name", "email", "order", "renewal_link"].map(cell).join(",") + "\n";
    for (const e of r.expiring) out += row([e.domain, e.expires_at, e.name, e.email, e.order_id, `${siteUrl}/renew/?domain=${encodeURIComponent(e.domain)}`]);
    return out;
  }
  let out = "﻿" + ["ordered_utc", "order", "name", "organisation", "email", "phone", "country", "domain", "type", "result", "years", "expires_utc"].map(cell).join(",") + "\n";
  for (const b of r.buyers) {
    for (const l of b.lines) {
      const result = l.state === "registered" ? (l.service === "renew" ? "renewed" : "registered") : l.state === "failed" ? "not completed" : "in progress";
      out += row([b.created_at, b.order_id, b.name, b.org, b.email, b.phone, b.country, l.domain, l.service === "renew" ? "renewal" : "registration", result, l.term, l.state === "registered" ? l.expires_at ?? "" : ""]);
    }
  }
  return out;
}

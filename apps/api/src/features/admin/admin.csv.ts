// One row per domain, for a spreadsheet. Unpaid checkouts are left out.

import { plainAmount } from "../../core/money";
import type { Order } from "../orders/order.types";

const HEADER = ["order", "created_utc", "order_status", "test", "domain", "years", "domain_status", "price", "currency", "order_total", "discount", "charged", "tucows_order", "first_name", "last_name", "organisation", "email", "phone", "address1", "address2", "city", "state", "postal_code", "country", "ordered_from_ip", "stripe_payment"];

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
        l.domain, l.term, l.state, plainAmount(l.amount_cents), o.currency.toUpperCase(),
        plainAmount(o.subtotal_cents),
        s.amount_discount !== undefined ? plainAmount(s.amount_discount) : "",
        s.amount_captured !== undefined ? plainAmount(s.amount_captured) : "",
        l.opensrs?.order_id ?? "",
        r.first_name, r.last_name, r.org_name, r.email, r.phone, r.address1, r.address2, r.city, r.state, r.postal_code, r.country,
        o.registrant_ip ?? "",
        s.payment_intent ?? "",
      ]);
    }
  }
  return out;
}

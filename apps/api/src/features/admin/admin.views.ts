// The admin page's HTML: plain server-rendered pages, no script, one inline stylesheet.

import { money } from "../../core/money";
import type { Order } from "../orders/order.types";

export const h = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

export function page(title: string, body: string): string {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">'
    + `<title>${h(title)} | CDR admin</title><style>`
    + "body{font:15px/1.5 system-ui,sans-serif;margin:0;padding:16px;background:#f4f5f7;color:#111}"
    + ".card{background:#fff;border:1px solid #ddd;border-radius:6px;padding:16px;max-width:1200px}"
    + "h1{margin:0 0 8px;font-size:22px}h2{font-size:17px;margin:20px 0 6px}"
    + "table{border-collapse:collapse;width:100%;margin-top:8px}th,td{text-align:left;vertical-align:top;padding:6px 8px;border-bottom:1px solid #eee}th{font-size:13px;color:#555}"
    + ".scroll{overflow-x:auto}.meta{color:#555;font-size:13px}.bad{color:#b00020}"
    + ".s{display:inline-block;font-size:12px;padding:0 6px;border-radius:3px;background:#eee}"
    + ".s-registered{background:#d7f5dd}.s-partially_registered,.s-pending,.s-fulfilling,.s-authorized,.s-registering{background:#fff1c2}"
    + ".s-failed,.s-amount_mismatch,.s-needs_review,.s-settle_error,.s-unknown,.s-payment_failed{background:#ffd9d9}"
    + "pre{white-space:pre-wrap;background:#f7f7f7;padding:8px;font-size:12px}input,select,button{font:inherit;padding:4px 8px}"
    + `</style></head><body>${body}</body></html>`;
}

export function signInPage(problem: string): string {
  return page("Sign in", '<form method="post" class="card"><h1>Orders</h1><p>Enter the admin token from the API settings file.</p>'
    + (problem ? `<p class="bad">${h(problem)}</p>` : "")
    + '<p><input type="password" name="token" autocomplete="current-password" required autofocus> <button>Sign in</button></p></form>');
}

const badge = (state: string) => `<span class="s s-${h(state)}">${h(state)}</span>`;

const amount = (cents: number | undefined, currency: string) => (cents === undefined ? "" : money(cents, currency).slice(1));

function stripeLink(o: Order): string {
  if (!o.stripe.payment_intent) return "";
  const base = o.test_mode ? "https://dashboard.stripe.com/test/payments/" : "https://dashboard.stripe.com/payments/";
  return `<a href="${h(base + o.stripe.payment_intent)}" rel="noreferrer" target="_blank">Stripe</a>`;
}

export function headerLine(opts: { live: boolean; stripeLive: boolean; balance: number | null | undefined }): string {
  let out = `<p class="meta">Tucows: <b>${opts.live ? "LIVE" : "test (Horizon)"}</b> · Stripe: <b>${opts.stripeLive ? "LIVE" : "test"}</b>`;
  if (opts.balance === undefined) out += ' · <a href="?balance=1">Show Tucows balance</a>';
  else out += " · Tucows balance: <b>" + (opts.balance === null ? "could not ask" : money(Math.round(opts.balance * 100), "usd")) + "</b>";
  return out + ' · <a href="?format=csv">Download CSV</a> · <a href="?logout=1">Sign out</a></p>';
}

export function orderPage(o: Order, head: string, self: string, csrf: string, drivable: boolean): string {
  const r = o.registrant;
  const s = o.stripe;
  const rows = o.lines.map((l) => "<tr>"
    + `<td>${h(l.domain)}</td><td>${h(l.term)}</td><td>${amount(l.amount_cents, o.currency)}</td>`
    + `<td>${badge(l.state)}${l.reason ? ` (${h(l.reason)})` : ""}</td>`
    + `<td>${h(l.opensrs?.order_id ?? "")}</td>`
    + `<td>${h(l.opensrs?.text !== undefined ? `${l.opensrs.code} ${l.opensrs.text}` : "")}</td></tr>`).join("");
  const body = head + `<p><a href="${h(self)}">All orders</a></p>`
    + `<div class="card"><h1>Order ${h(o.id)}${o.test_mode ? ' <span class="s">TEST</span>' : ""}</h1>`
    + `<p>${badge(o.status)} · created ${h(o.created_at)} · ${stripeLink(o)}</p>`
    + `<p>Total ${amount(o.subtotal_cents, o.currency)}`
    + (s.amount_discount ? ` · promotion ${amount(s.amount_discount, o.currency)}` : "")
    + (s.amount_authorized !== undefined ? ` · authorised ${amount(s.amount_authorized, o.currency)}` : "")
    + (s.amount_captured !== undefined ? ` · <b>charged ${amount(s.amount_captured, o.currency)}</b>` : "") + "</p>"
    + (drivable ? `<form method="post"><input type="hidden" name="csrf" value="${h(csrf)}"><input type="hidden" name="order" value="${h(o.id)}"><input type="hidden" name="action" value="drive"><button>Continue this order now</button></form>` : "")
    + `<table><thead><tr><th>Domain</th><th>Years</th><th>Price</th><th>State</th><th>Tucows order</th><th>Tucows said</th></tr></thead><tbody>${rows}</tbody></table>`
    + `<h2>Registrant</h2><p>${h(`${r.first_name} ${r.last_name}`)}${r.org_name !== "" ? ", " + h(r.org_name) : ""}<br>`
    + `${h(r.address1)}${r.address2 !== "" ? ", " + h(r.address2) : ""}<br>`
    + `${h(r.city + (r.state !== "" ? ", " + r.state : "") + " " + r.postal_code + ", " + r.country)}<br>`
    + `<a href="mailto:${h(r.email)}">${h(r.email)}</a> · ${h(r.phone)}</p>`
    + `<p class="meta">Ordered from ${h(o.registrant_ip || "?")}${o.visitor_country ? ` (${h(o.visitor_country)})` : ""}, agreement accepted ${h(o.agreement?.accepted_at ?? "?")}</p>`
    + `<h2>History</h2><pre>${h((o.log ?? []).join("\n"))}</pre></div>`;
  return page("Order " + o.id, body);
}

export function listPage(opts: { orders: Order[]; head: string; self: string; q: string; want: string; hideAbandoned: boolean; statuses: string[] }): string {
  const rows = opts.orders.map((o) => {
    const r = o.registrant;
    const domains = o.lines.map((l) => `${h(l.domain)} ${badge(l.state)}`).join("<br>");
    return `<tr><td><a href="?order=${h(o.id)}">${h(o.id)}</a>${o.test_mode ? ' <span class="s">TEST</span>' : ""}</td>`
      + `<td>${h(o.created_at.slice(0, 16))}</td>`
      + `<td>${badge(o.status)}</td>`
      + `<td>${h(`${r.first_name} ${r.last_name}`)}<br><small>${h(r.email)}</small></td>`
      + `<td>${domains}</td>`
      + `<td>${amount(o.subtotal_cents, o.currency)}</td>`
      + `<td>${amount(o.stripe.amount_captured, o.currency)}</td>`
      + `<td>${stripeLink(o)}</td></tr>`;
  }).join("");
  const options = '<option value="">Any status</option>' + opts.statuses.map((s) => `<option${s === opts.want ? " selected" : ""}>${h(s)}</option>`).join("");
  const body = opts.head + '<div class="card"><h1>Orders</h1>'
    + `<form method="get" class="filters"><input type="search" name="q" value="${h(opts.q)}" placeholder="Name, email, domain or order"> <select name="status">${options}</select> <button>Filter</button>`
    + (opts.hideAbandoned ? ' <a href="?all=1">Include unpaid checkouts</a>' : ` <a href="${h(opts.self)}">Hide unpaid checkouts</a>`) + "</form>"
    + `<p class="meta">${opts.orders.length} shown.</p>`
    + `<div class="scroll"><table><thead><tr><th>Order</th><th>Created (UTC)</th><th>Status</th><th>Customer</th><th>Domains</th><th>Total</th><th>Charged</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  return page("Orders", body);
}

// Proves the payment scripts' own logic against a running PHP server, WITHOUT Stripe.
//
//   php -S 127.0.0.1:8099 -t out cpanel/local-router.php
//   node scripts/probe-payment-php.mjs --orders <cdr-orders dir> --secret-file <whsec file> [--base http://127.0.0.1:8099]
//
// What it can see that a real Checkout run cannot: the refusals. It posts broken forms (each must
// come back 422 naming the field), webhooks with no signature, a wrong secret and a stale timestamp
// (each must be 400), then signs events itself with the endpoint's secret against order FIXTURES it
// writes into the order store: a paid event (order paid, one notice written, no transfer code in
// it), the same event again (no second notice), an amount Stripe did not agree with (flagged, not
// paid) and an expiry. Fixtures are removed afterwards. It ends PAYMENT PHP OK or exits 1.
//
// Proved able to fail (23 Sep 2026): with the signature check forced to accept everything, nine
// of its checks go red.
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const argOf = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const BASE = argOf("--base", "http://127.0.0.1:8099");
const ORDERS = argOf("--orders");
const SECRET = argOf("--secret-file") && readFileSync(argOf("--secret-file"), "utf8").trim();
if (!ORDERS || !SECRET) { console.error("usage: node scripts/probe-payment-php.mjs --orders <dir> --secret-file <file>"); process.exit(2); }

const failures = [];
const check = (name, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : "  " + detail}`); if (!ok) failures.push(name); };
const post = async (path, body, headers = {}) => {
  const res = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const sign = (payload, secret = SECRET, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
const outbox = () => (existsSync(join(ORDERS, "outbox")) ? readdirSync(join(ORDERS, "outbox")) : []);
const readOrder = (id) => JSON.parse(readFileSync(join(ORDERS, id + ".json"), "utf8"));

/* ---------- checkout.php refuses what it should ---------- */
{
  const r = await fetch(BASE + "/api/checkout/");
  check("checkout: GET is refused", r.status === 405, `got ${r.status}`);
}
{
  const r = await post("/api/checkout/", { items: [], registrant: {}, agree: true });
  check("checkout: an empty cart is refused", r.status === 422 && r.json?.error === "empty_cart", JSON.stringify(r));
}
{
  const r = await post("/api/checkout/", {
    items: [
      { domain: "example-probe.com", service: "register", term: 5 },
      { domain: "maplegrove.ca", service: "register", term: 1 },
      { domain: "not a domain", service: "register", term: 1 },
      { domain: "example-probe.net", service: "register", term: 11 },
    ],
    registrant: { first_name: "Ada", last_name: "Probe", email: "not-an-email", phone: "416 555", address1: "1 Test St", city: "Toronto", postal_code: "M5V 1A1", country: "US" },
    agree: false,
  });
  const f = r.json?.fields ?? {};
  const l = r.json?.lines ?? {};
  check("checkout: a bad form is 422", r.status === 422, `got ${r.status}`);
  check("checkout: names the email", Boolean(f.email));
  check("checkout: names the phone without a country code", Boolean(f.phone));
  check("checkout: a US address needs a state", Boolean(f.state));
  check("checkout: the agreement must be accepted", Boolean(f.agree));
  check("checkout: .ca is refused before payment", /\.ca/.test(l["1"] ?? ""), JSON.stringify(l));
  check("checkout: a non-domain is refused", Boolean(l["2"]));
  check("checkout: an eleven-year term is refused", Boolean(l["3"]));
  check("checkout: the good line is not flagged", !l["0"]);
}

/* ---------- stripe-webhook.php refuses what it should ---------- */
const fixture = (status, total) => {
  const id = new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + randomBytes(5).toString("hex");
  const now = new Date().toISOString();
  writeFileSync(join(ORDERS, id + ".json"), JSON.stringify({
    id, status, test_mode: true, created_at: now, updated_at: now, currency: "usd", total_cents: total,
    lines: [
      { domain: "probe-one.com", service: "register", label: "Domain Registration", term: 5, amount_cents: 26500, auth_code: "" },
      { domain: "probe-two.com", service: "transfer", label: "Domain Renewal / Transfer", term: 1, amount_cents: 6000, auth_code: "SECRET-AUTH-9x" },
    ].slice(0, total === 32500 ? 2 : 1),
    registrant: { first_name: "Ada", last_name: "Probe", org_name: "", email: "ada@example.test", phone: "+14165550123", address1: "1 Test St", address2: "", city: "Toronto", state: "ON", postal_code: "M5V 1A1", country: "CA" },
    registrant_ip: "127.0.0.1", stripe: { session_id: "cs_test_probe" }, events: [],
  }));
  return id;
};
const event = (type, orderId, session = {}) => JSON.stringify({
  id: "evt_probe_" + randomBytes(6).toString("hex"),
  type,
  data: { object: { id: "cs_test_probe", object: "checkout.session", metadata: { order_id: orderId }, client_reference_id: orderId, livemode: false, ...session } },
});

const created = [];
try {
  const paidId = fixture("pending_payment", 32500); created.push(paidId);
  const paidEvent = event("checkout.session.completed", paidId, { payment_status: "paid", amount_total: 32500, currency: "usd", payment_intent: "pi_probe", customer_details: { email: "ada@example.test", name: "Ada Probe" } });

  check("webhook: no signature is refused", (await post("/api/stripe-webhook/", paidEvent)).status === 400);
  check("webhook: a wrong secret is refused", (await post("/api/stripe-webhook/", paidEvent, { "Stripe-Signature": sign(paidEvent, "whsec_wrong") })).status === 400);
  check("webhook: a stale signature is refused", (await post("/api/stripe-webhook/", paidEvent, { "Stripe-Signature": sign(paidEvent, SECRET, Math.floor(Date.now() / 1000) - 900) })).status === 400);
  check("webhook: a tampered body is refused", (await post("/api/stripe-webhook/", paidEvent.replace("32500", "100"), { "Stripe-Signature": sign(paidEvent) })).status === 400);
  check("webhook: the refusals changed nothing", readOrder(paidId).status === "pending_payment");

  const before = outbox().length;
  const r1 = await post("/api/stripe-webhook/", paidEvent, { "Stripe-Signature": sign(paidEvent) });
  const o1 = readOrder(paidId);
  check("webhook: a signed paid event is accepted", r1.status === 200, JSON.stringify(r1));
  check("webhook: the order is marked paid", o1.status === "paid" && Boolean(o1.paid_at), o1.status);
  const mails = outbox().slice(before);
  check("webhook: one notice is written", mails.length === 1, `${mails.length}`);
  const mail = mails.length ? readFileSync(join(ORDERS, "outbox", mails[0]), "utf8") : "";
  check("notice: names the order and the total", mail.includes(paidId) && mail.includes("$325.00 USD"));
  check("notice: says TEST and that nothing is registered", mail.includes("[TEST]") && /NOTHING HAS BEEN REGISTERED/.test(mail));
  check("notice: never carries the transfer code", !mail.includes("SECRET-AUTH-9x"));

  const r2 = await post("/api/stripe-webhook/", paidEvent, { "Stripe-Signature": sign(paidEvent) });
  check("webhook: a redelivery is a no-op", r2.status === 200 && outbox().length === before + 1 && readOrder(paidId).events.length === 1);

  const mmId = fixture("pending_payment", 26500); created.push(mmId);
  const mm = event("checkout.session.completed", mmId, { payment_status: "paid", amount_total: 100, currency: "usd" });
  await post("/api/stripe-webhook/", mm, { "Stripe-Signature": sign(mm) });
  check("webhook: an amount Stripe disagrees with is flagged, not paid", readOrder(mmId).status === "amount_mismatch");

  const exId = fixture("pending_payment", 26500); created.push(exId);
  const ex = event("checkout.session.expired", exId);
  await post("/api/stripe-webhook/", ex, { "Stripe-Signature": sign(ex) });
  check("webhook: an abandoned checkout closes the order", readOrder(exId).status === "expired");

  const other = JSON.stringify({ id: "evt_probe_other", type: "customer.created", data: { object: {} } });
  const r3 = await post("/api/stripe-webhook/", other, { "Stripe-Signature": sign(other) });
  check("webhook: an unrelated event is acknowledged and ignored", r3.status === 200 && r3.json?.ignored === "customer.created");
} finally {
  const since = new Set(created);
  for (const id of created) for (const ext of [".json", ".json.lock"]) rmSync(join(ORDERS, id + ext), { force: true });
  for (const f of outbox()) if ([...since].some((id) => readFileSync(join(ORDERS, "outbox", f), "utf8").includes(id))) rmSync(join(ORDERS, "outbox", f));
}

console.log(failures.length ? `\nPAYMENT PHP FAILED: ${failures.length}` : "\nPAYMENT PHP OK");
process.exit(failures.length ? 1 : 0);

// The real round trip, on Stripe TEST keys: the registrant form, Stripe's own hosted page, a test
// card, the return to /checkout/done/, and the webhook marking the order paid.
//
//   php -S 127.0.0.1:8099 -t out cpanel/local-router.php          (an export, and a cdr-config.php
//                                                                  from scripts/local-cdr-config.mjs)
//   stripe listen --api-key <test key> --forward-to http://127.0.0.1:8099/api/stripe-webhook/ ...
//   MW_PLAYWRIGHT=C:/Users/ali/AppData/Local/Temp/p/node_modules node scripts/probe-stripe-checkout.mjs
//
// It types with click + pressSequentially, never fill(), because fill() silently loses its value
// on the kit's inputs (mother CONTEXT.md). It uses the installed Edge. It ends STRIPE CHECKOUT OK
// only when the ORDER FILE says paid, because the return page proves nothing on its own.
import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire((process.env.MW_PLAYWRIGHT || "C:/Users/ali/AppData/Local/Temp/p/node_modules").replace(/\/?$/, "/"));
const { chromium } = require("playwright-core");
const BASE = "http://127.0.0.1:8099";
const ORDERS = join(ROOT, "cdr-orders");
const HEADED = process.argv.includes("--headed");

const failures = [];
const check = (name, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : "  " + detail}`); if (!ok) failures.push(name); };
const type = async (loc, value) => { await loc.click(); await loc.pressSequentially(value, { delay: 15 }); };

const cart = [
  { id: "register:cdr-probe-" + Date.now() + ".com", domain: "cdr-probe-" + Date.now() + ".com", service: "register", term: 1, amount: 60 },
  { id: "renew:cdr-probe-held.net", domain: "cdr-probe-held.net", service: "renew", term: 2, amount: 115 },
];
const expectedCents = (60 + 115) * 100;
const outboxBefore = existsSync(join(ORDERS, "outbox")) ? readdirSync(join(ORDERS, "outbox")).length : 0;

const browser = await chromium.launch({ channel: "msedge", headless: !HEADED });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript((c) => { if (location.hostname === "127.0.0.1" && !sessionStorage.getItem("seeded")) { localStorage.setItem("domain-services-cart", JSON.stringify(c)); sessionStorage.setItem("seeded", "1"); } }, cart);
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

try {
  await page.goto(BASE + "/checkout/", { waitUntil: "networkidle" });
  await page.waitForSelector("form[aria-busy]");
  await type(page.locator("#co-first"), "Ada");
  await type(page.locator("#co-last"), "Probe");
  await type(page.locator("#co-email"), "ada.probe@example.com");
  await type(page.locator("#co-phone"), "+1 416 555 0123");
  await page.selectOption("#co-country", "CA");
  await type(page.locator("#co-address1"), "100 Mural Street");
  await type(page.locator("#co-city"), "Richmond Hill");
  await type(page.locator("#co-state"), "ON");
  await type(page.locator("#co-postal"), "L4B 1J3");
  await type(page.locator('[id^="co-auth-"]').first(), "PROBE-AUTH-CODE");
  await page.locator('label[for="co-agree"]').click();
  await Promise.all([page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 }), page.click("button[type=submit]")]);
  check("the form hands off to Stripe's hosted page", /checkout\.stripe\.com/.test(page.url()), page.url());

  // Stripe's page: the email is prefilled from the form (customer_email).
  await page.waitForSelector("#cardNumber", { timeout: 30000 });
  const bodyText = await page.locator("body").innerText();
  check("Stripe shows our total", bodyText.includes("175.00"), "no 175.00 on the page");
  await type(page.locator("#cardNumber"), "4242424242424242");
  await type(page.locator("#cardExpiry"), "1234");
  await type(page.locator("#cardCvc"), "123");
  if (await page.locator("#billingName").isVisible().catch(() => false)) await type(page.locator("#billingName"), "Ada Probe");
  if (await page.locator("#billingCountry").isVisible().catch(() => false)) await page.selectOption("#billingCountry", "CA");
  if (await page.locator("#billingPostalCode").isVisible().catch(() => false)) await type(page.locator("#billingPostalCode"), "L4B 1J3");
  // Link's "save my info" can add a required phone field; opt out when it is offered.
  const save = page.locator("#enableStripePass");
  if (await save.isVisible().catch(() => false) && (await save.isChecked())) await save.uncheck();
  await Promise.all([page.waitForURL(/127\.0\.0\.1:8099\/checkout\/done\//, { timeout: 60000 }), page.click('button[type=submit], [data-testid="hosted-payment-submit-button"]')]);
  const order = new URL(page.url()).searchParams.get("order");
  check("Stripe returns to /checkout/done/ with the order", /^\d{8}-[a-f0-9]{10}$/.test(order || ""), page.url());

  await page.waitForLoadState("networkidle");
  const cartAfter = await page.evaluate(() => localStorage.getItem("domain-services-cart"));
  check("the return page empties the cart", cartAfter === "[]", cartAfter);

  // The webhook, delivered by `stripe listen`, is what makes it true.
  let rec = null;
  for (let i = 0; i < 40; i++) {
    const f = join(ORDERS, order + ".json");
    if (existsSync(f)) { rec = JSON.parse(readFileSync(f, "utf8")); if (rec.status === "paid") break; }
    await new Promise((r) => setTimeout(r, 1500));
  }
  check("the webhook marks the order paid", rec?.status === "paid", rec?.status ?? "no order file");
  check("Stripe collected exactly our total", rec?.stripe?.amount_total === expectedCents, String(rec?.stripe?.amount_total));
  check("the order is a test-mode order", rec?.test_mode === true && rec?.stripe?.livemode === false);
  check("the registrant was recorded", rec?.registrant?.state === "ON" && rec?.registrant?.phone === "+14165550123");
  check("the transfer code was kept for fulfilment", rec?.lines?.some((l) => l.auth_code === "PROBE-AUTH-CODE"));
  const box = existsSync(join(ORDERS, "outbox")) ? readdirSync(join(ORDERS, "outbox")).sort() : [];
  const mail = box.length > outboxBefore ? readFileSync(join(ORDERS, "outbox", box[box.length - 1]), "utf8") : "";
  check("CDR's notice was written", mail.includes(order) && mail.includes("$175.00 USD"));
  check("the notice carries no transfer code", mail !== "" && !mail.includes("PROBE-AUTH-CODE"));
  check("no page errors", pageErrors.length === 0, pageErrors.join(" | "));
} catch (e) {
  check("the round trip completed", false, e.message.split("\n")[0]);
  await page.screenshot({ path: join(ROOT, ".parity", "stripe-probe-failure.png"), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}
console.log(failures.length ? `\nSTRIPE CHECKOUT FAILED: ${failures.length}` : "\nSTRIPE CHECKOUT OK");
process.exit(failures.length ? 1 : 0);

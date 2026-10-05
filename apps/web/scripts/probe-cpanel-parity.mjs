// Is the cPanel export the same site the client approved?
//
//   node scripts/probe-cpanel-parity.mjs [--base <approved site>] [--export http://127.0.0.1:8099] [--dir <shots>]
//
// Two halves, because "looks the same" and "works the same" are different claims:
//   LOOK   every page on both hosts at 1440 and 390, same theme, same region, pixel-compared
//   WORK   on the export alone: the region follows the visitor's address (Canada, United States,
//          somewhere else), the location panel opens and carries its five fields, a typed domain
//          returns a result, a deep link to a result works, the cart takes it, whois answers
//
// The visitor's address is simulated with X-Forwarded-For, which cpanel/api/geo.php reads exactly
// as it would behind a proxy. The approved site cannot be told where we are (Vercel reads the real
// connection), so LOOK is compared in whichever region the approved site reports for this laptop,
// with the export sent an address from that same country.
//
// Traps already paid for, all in the mother's CONTEXT.md and all honoured here: wait on a selector
// that only exists after hydration AND client state, not networkidle; type with pressSequentially,
// never fill(); kill transitions and force the reveals before a full-page shot; and prove the
// comparison can FAIL (a deliberately altered page is compared first and must come back different).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const requirePw = createRequire((process.env.MW_PLAYWRIGHT || "C:/Users/ali/AppData/Local/Temp/p/node_modules") + "/");
const { chromium } = requirePw("playwright-core");
const sharp = createRequire(import.meta.url)("sharp");

const args = process.argv.slice(2);
const argOf = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const BASE = argOf("--base", "https://domain-services-git-staging-magenta-web.vercel.app").replace(/\/$/, "");
const EXP = argOf("--export", "http://127.0.0.1:8099").replace(/\/$/, "");
const DIR = argOf("--dir", ".parity");
mkdirSync(DIR, { recursive: true });

const PAGES = ["/", "/search", "/register", "/transfer", "/renew", "/whois", "/cart", "/checkout", "/contact", "/tos", "/privacy", "/disclaimer", "/dispute-policy", "/expired-registration-recovery", "/registrant-resources"];
const WIDTHS = [1440, 390];
const IPS = { CA: "99.224.0.1", US: "8.8.8.8", DE: "85.214.132.117" };

const STILL = `*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}
[data-mw-reveal],[data-mw-reveal] *{opacity:1!important;transform:none!important}`;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const failures = [];
const note = (ok, label, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? "  " + detail : ""}`); if (!ok) failures.push(label + " " + detail); };

async function open(ctx, url) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  // ready = the chip has an answer from /api/geo, which only happens after hydration
  await page.waitForFunction(() => { const c = document.querySelector("[data-ds-region]"); return c && c.getAttribute("data-ds-region"); }, null, { timeout: 30000 });
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-mw-loader"), null, { timeout: 10000 }).catch(() => {});
  await page.addStyleTag({ content: STILL });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  return { page, errors };
}

async function shot(page, file) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const buf = await page.screenshot({ fullPage: true });
  writeFileSync(file, buf);
  return buf;
}

async function diff(a, b) {
  const [ma, mb] = await Promise.all([sharp(a).metadata(), sharp(b).metadata()]);
  if (ma.width !== mb.width || ma.height !== mb.height) return { sized: false, detail: `${ma.width}x${ma.height} vs ${mb.width}x${mb.height}` };
  const [ra, rb] = await Promise.all([sharp(a).ensureAlpha().raw().toBuffer(), sharp(b).ensureAlpha().raw().toBuffer()]);
  let bad = 0;
  for (let i = 0; i < ra.length; i += 4) {
    if (Math.abs(ra[i] - rb[i]) + Math.abs(ra[i + 1] - rb[i + 1]) + Math.abs(ra[i + 2] - rb[i + 2]) > 24) bad++;
  }
  return { sized: true, bad, share: bad / (ra.length / 4) };
}

/* ---------- which region does the approved site report for this laptop? ---------- */
let baseCountry;
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const { page } = await open(ctx, BASE + "/");
  baseCountry = await page.evaluate(() => fetch("/api/geo", { cache: "no-store" }).then((r) => r.json()).then((d) => d.country));
  await ctx.close();
  console.log("approved site sees this laptop in:", baseCountry);
}
const matchIp = IPS[baseCountry] || IPS.DE;

/* ---------- LOOK ---------- */
// self-test first: the comparison must be able to come back different
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", extraHTTPHeaders: { "X-Forwarded-For": matchIp } });
  const { page } = await open(ctx, EXP + "/contact/");
  const clean = await shot(page, `${DIR}/_selftest-a.png`);
  await page.evaluate(() => { const h = document.querySelector("h1"); if (h) h.textContent = "ALTERED FOR THE SELF TEST"; });
  const altered = await shot(page, `${DIR}/_selftest-b.png`);
  const d = await diff(clean, altered);
  note(!d.sized || d.bad > 50, "self-test: an altered page compares as different", d.sized ? `${d.bad}px` : d.detail);
  await ctx.close();
}
for (const w of args.includes("--work-only") ? [] : WIDTHS) {
  const bctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: "light" });
  const ectx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: "light", extraHTTPHeaders: { "X-Forwarded-For": matchIp } });
  for (const p of PAGES) {
    const name = (p === "/" ? "home" : p.slice(1)) + "-" + w;
    try {
      const b = await open(bctx, BASE + p);
      const e = await open(ectx, EXP + (p === "/" ? "/" : p + "/"));
      const [bs, es] = [await shot(b.page, `${DIR}/${name}-approved.png`), await shot(e.page, `${DIR}/${name}-export.png`)];
      const d = await diff(bs, es);
      const ok = d.sized && d.share < 0.0005 && e.errors.length === 0;
      note(ok, `look ${p} @${w}`, d.sized ? `${d.bad}px differ (${(d.share * 100).toFixed(3)}%)${e.errors.length ? " pageerrors: " + e.errors[0] : ""}` : "size " + d.detail);
      await b.page.close(); await e.page.close();
    } catch (err) { note(false, `look ${p} @${w}`, String(err).split("\n")[0]); }
  }
  await bctx.close(); await ectx.close();
}

/* ---------- WORK ---------- */
for (const [cc, ip] of Object.entries(IPS)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", extraHTTPHeaders: { "X-Forwarded-For": ip } });
  const { page, errors } = await open(ctx, EXP + "/");
  const want = cc === "CA" ? "CA" : "US";
  const got = await page.getAttribute("[data-ds-region]", "data-ds-region");
  note(got === want, `region for a ${cc} visitor is ${want}`, `got ${got}`);
  const chipText = (await page.locator("[data-ds-region]").innerText()).replace(/\s+/g, " ");
  note(chipText.includes(want === "CA" ? "CAD" : "USD"), `chip names ${want === "CA" ? "CAD" : "USD"} for ${cc}`, chipText.slice(0, 80));
  const logo = await page.locator("[data-ds-logo-full] svg").first().evaluate((s) => s.outerHTML.length + ":" + (s.getAttribute("aria-label") || s.getAttribute("data-region") || ""));
  console.log(`     ${cc} lockup signature ${logo}`);
  // the panel: HOVER the flag, which is how the client opens it (a click would toggle it shut
  // again, because the pointer arriving has already opened it), then read the five fields
  await page.locator("[data-ds-region]").hover();
  const panel = page.locator('[role="group"][aria-label="Your location"]');
  await panel.waitFor({ timeout: 5000 });
  const text = (await panel.innerText()).replace(/\s+/g, " ");
  note(text.includes(ip) && text.includes(cc), `panel for ${cc} shows the address and the country`, text.slice(0, 140));
  await page.screenshot({ path: `${DIR}/_panel-${cc}.png` });
  note(errors.length === 0, `no page errors (${cc})`, errors[0] || "");
  await ctx.close();
}
{
  // Canada and the United States must draw DIFFERENT logos
  const sig = {};
  for (const cc of ["CA", "US"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { "X-Forwarded-For": IPS[cc] } });
    const { page } = await open(ctx, EXP + "/");
    sig[cc] = await page.locator("[data-ds-logo-full] svg").first().evaluate((s) => s.outerHTML);
    await ctx.close();
  }
  note(sig.CA !== sig.US, "the Canadian lockup is not the US lockup");
}
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { "X-Forwarded-For": IPS.CA } });
  const { page, errors } = await open(ctx, EXP + "/search/");
  const input = page.locator("[data-ds-search] input").first();
  await input.click();
  await input.pressSequentially("my-new-idea-2026.com", { delay: 20 });
  await page.keyboard.press("Enter");
  await page.locator("[data-ds-result]").waitFor({ timeout: 8000 });
  const res = (await page.locator("[data-ds-result]").innerText()).replace(/\s+/g, " ");
  note(/my-new-idea-2026\.com/.test(res), "typed search returns a result", res.slice(0, 120));
  note(/CA\$|CAD|C\$/.test(res) || /\$/.test(res), "the result is priced", res.match(/[A-Z]*\$[\d.,]+/)?.[0] || "");
  // router.replace lands a beat after the result paints, on the approved site too (measured: absent
  // at 0 ms, present by 300 ms on both hosts), so wait for it rather than reading it at once
  await page.waitForURL(/domain=my-new-idea-2026.com/, { timeout: 5000 }).catch(() => {});
  note(page.url().includes("domain=my-new-idea-2026.com"), "the address bar carries the domain", page.url());
  await page.locator("[data-ds-result] button", { hasText: /add|cart|register|renew/i }).first().click();
  await page.waitForTimeout(500);
  const rail = (await page.locator("[data-ds-cart-rail]").innerText()).replace(/\s+/g, " ");
  note(/my-new-idea-2026\.com/.test(rail), "the cart rail holds the domain", rail.slice(0, 100));
  // deep link, fresh load: the read of ?domain= is the thing that moved to the browser
  const deep = await open(ctx, EXP + "/renew/?domain=example.com");
  const dres = await deep.page.locator("[data-ds-result]").innerText().catch(() => "");
  note(/example\.com/.test(dres), "a deep link to /renew/?domain= shows its result", dres.replace(/\s+/g, " ").slice(0, 80));
  const cartPage = await open(ctx, EXP + "/cart/");
  const ctext = (await cartPage.page.locator("main, body").first().innerText()).replace(/\s+/g, " ");
  note(/my-new-idea-2026\.com/.test(ctext), "the cart page still holds it after navigation");
  const who = await open(ctx, EXP + "/whois/?domain=20minutesfromhome.info");
  const wtext = (await who.page.locator("main, body").first().innerText()).replace(/\s+/g, " ");
  note(/registrar/i.test(wtext) && /20minutesfromhome\.info/.test(wtext), "whois deep link returns the record");
  note(errors.length + deep.errors.length + cartPage.errors.length + who.errors.length === 0, "no page errors in the flows");
  await ctx.close();
}

await browser.close();
console.log(failures.length ? `\nPARITY FAILED: ${failures.length}\n  ` + failures.join("\n  ") : "\nPARITY OK");
process.exit(failures.length ? 1 : 0);

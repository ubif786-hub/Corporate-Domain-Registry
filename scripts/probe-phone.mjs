// Are the two phone fixes of 21 Sep 2026 on a given host?
//
//   node scripts/probe-phone.mjs <origin> [<origin>...] [--dir <shots>]
//
// At 390, with a touch screen: the four route tabs fit the strip without scrolling (the client read
// a hidden-scrollbar overflow as "cut off"), and a tap on the flag opens the location panel inside
// the gutters, with its IP row rendered, and leaves it open (a finger used to fire enter and click,
// so one tap opened and shut it). A tap outside closes it.
//
// It ends with a SENTINEL: the old tab rule is re-injected and the strip must overflow, so a pass
// is a pass and not a probe that cannot see. Written 22 Sep 2026, when it FAILED on the client's
// host (the pre-fix upload: "Terms of service" at 322..499 in a 358 strip, the tap toggling the
// panel shut) and PASSED on staging, which is the only way a probe earns its place.
//
// Traps honoured (mother's CONTEXT.md): wait on "load" and a selector, never networkidle (the live
// host keeps a request open and networkidle never fires); the installed Edge, because the scratch
// playwright-core's own headless shell is not in the cache.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
const requirePw = createRequire((process.env.MW_PLAYWRIGHT || "C:/Users/ali/AppData/Local/Temp/p/node_modules") + "/");
const { chromium } = requirePw("playwright-core");

const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
const DIR = dirIdx >= 0 ? args[dirIdx + 1] : null;
// The first cut wrote `i !== dirIdx + 1`, which with no --dir is `i !== 0` and silently dropped the
// first origin: the run reported PHONE OK having never opened the failing host.
const origins = args.filter((a, i) => a !== "--dir" && (dirIdx < 0 || i !== dirIdx + 1)).map((o) => o.replace(/\/$/, ""));
if (origins.length !== args.length - (dirIdx >= 0 ? 2 : 0)) { console.error("origin list does not match the arguments given"); process.exit(2); }
if (!origins.length) { console.error("usage: node scripts/probe-phone.mjs <origin> [<origin>...] [--dir <shots>]"); process.exit(2); }
if (DIR) mkdirSync(DIR, { recursive: true });

const W = 390, GUTTER = 16;
const PANEL = '[role="group"][aria-label="Your location"]';
let failures = 0;
const say = (ok, msg) => { if (!ok) failures++; console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); };

const browser = await chromium.launch({ channel: "msedge", headless: true });
for (const origin of origins) {
  console.log(`\n== ${origin} at ${W}`);
  const ctx = await browser.newContext({ viewport: { width: W, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const resp = await page.goto(`${origin}/`, { waitUntil: "load", timeout: 60000 });
  console.log(`GET / -> ${resp?.status()}  ${page.url()}`);
  await page.waitForSelector("[data-ds-routetabs] ul", { timeout: 20000 });

  // 1. The tab strip.
  const tabs = await page.evaluate(() => {
    const nav = document.querySelector("[data-ds-routetabs]");
    const as = [...nav.querySelectorAll("a")].map((a) => { const r = a.getBoundingClientRect(); return { label: a.textContent.trim(), left: +r.left.toFixed(1), right: +r.right.toFixed(1) }; });
    return { count: as.length, scrollWidth: nav.scrollWidth, clientWidth: nav.clientWidth, tabs: as, fontSize: getComputedStyle(nav.querySelector("a")).fontSize };
  });
  console.log(`tabs: ${tabs.tabs.map((t) => `${t.label} [${t.left}..${t.right}]`).join("  ")}  font ${tabs.fontSize}`);
  say(tabs.count === 4, `four tabs present (${tabs.count})`);
  say(tabs.scrollWidth <= tabs.clientWidth, `the strip does not scroll (scrollWidth ${tabs.scrollWidth} <= clientWidth ${tabs.clientWidth})`);
  say(tabs.tabs.every((t) => t.right <= W && t.left >= 0), `every tab inside the ${W} viewport`);

  // 2. The location panel, by TAP. The chip is ready once /api/geo has answered.
  const btn = page.locator("button[aria-controls][data-ds-region]").first();
  await page.waitForFunction(() => { const b = document.querySelector("button[aria-controls][data-ds-region]"); return b && b.getAttribute("data-ds-region") !== ""; }, null, { timeout: 30000 })
    .catch(() => console.log("(the region never became ready; tapping anyway)"));
  const region = await btn.getAttribute("data-ds-region");
  await btn.tap();
  await page.waitForTimeout(400);
  const expanded = await btn.getAttribute("aria-expanded");
  say(expanded === "true", `a tap opens the panel and it stays open (aria-expanded=${expanded}, region ${region || "none"})`);
  const panel = await page.evaluate((sel) => {
    const p = document.querySelector(sel); if (!p) return null;
    const r = p.getBoundingClientRect();
    const rows = [...p.querySelectorAll("dt")].map((dt) => `${dt.textContent.trim()}: ${dt.nextElementSibling?.textContent.trim()}`);
    const clipped = [...p.querySelectorAll("dd")].some((dd) => dd.scrollWidth > dd.clientWidth + 1);
    return { left: +r.left.toFixed(1), right: +r.right.toFixed(1), width: +r.width.toFixed(1), rows, clipped };
  }, PANEL);
  if (!panel) say(false, "the panel is not in the DOM after the tap");
  else {
    console.log(`panel [${panel.left}..${panel.right}] width ${panel.width}; ${panel.rows.join(" | ")}`);
    say(panel.left >= GUTTER - 0.5 && panel.right <= W - GUTTER + 0.5, `the panel sits inside the gutters (${GUTTER}..${W - GUTTER})`);
    say(!panel.clipped, "no value is clipped inside the panel");
    say(panel.rows.some((r) => /^Your IP: \S+/.test(r) && !/unknown/.test(r)), "the IP row renders a value");
  }
  if (DIR) await page.screenshot({ path: path.join(DIR, `phone-${origin.replace(/[^a-z0-9]+/gi, "-")}.png`) });
  await page.touchscreen.tap(200, 700);
  await page.waitForTimeout(300);
  say((await page.locator(PANEL).count()) === 0, "a tap outside closes the panel");

  // 3. Sentinel: the old tab rule back, and the strip must overflow.
  await page.addStyleTag({ content: `@media (max-width: 639px){[data-ds-routetabs] a{padding-inline:var(--space-lg)!important;font-size:var(--type-md)!important}[data-ds-routetabs] ul{min-width:max-content!important}}` });
  await page.waitForTimeout(100);
  const old = await page.evaluate(() => { const nav = document.querySelector("[data-ds-routetabs]"); return { scrollWidth: nav.scrollWidth, clientWidth: nav.clientWidth }; });
  say(old.scrollWidth > old.clientWidth, `sentinel: the old rule overflows (${old.scrollWidth} > ${old.clientWidth}), so the tab check can fail`);
  say(errors.length === 0, `page errors: ${errors.length}${errors.length ? "  " + errors.join(" / ") : ""}`);
  await ctx.close();
}
await browser.close();
console.log(failures ? `\nPHONE FAILED: ${failures} check(s)` : "\nPHONE OK");
process.exit(failures ? 1 : 0);

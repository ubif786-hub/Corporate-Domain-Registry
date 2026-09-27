// Does the location panel fit, with a short and a long geo answer, at 320, 390 and 1440?
//
//   node scripts/probe-panel.mjs <origin> [--dir <shots>]
//
// WHY THIS EXISTS (25 Sep 2026). The panel's "Site" row overflowed the panel at 1440 on the live
// host (the hostname www.corporatedomainregistry.com ran 40px past the panel's right edge, a fixed
// 19rem set when the host was shorter) and probe-phone.mjs did not see it: that probe runs at 390
// only, and its "no value clipped" check compared each value against the wrong box. The owner
// dropped the Site row (ff34143) and the panel is sized by its content now. This probe is the
// measurement that caught it, folded in from the closing session's scratch folder so it does not
// vanish with it: the geo answer is MOCKED through page.route on **/api/geo** (the export asks for
// /api/geo/ WITH the slash), once short and once with a 39-character IPv6 address, and at each
// width the panel must open, sit inside the 15px gutters, carry no Site row, and have no
// descendant whose box runs past its inner right edge.
//
// Hover opens it on the desk (how the client uses it) and a tap on a touch screen; a click toggles
// it shut again, which is the 21 Sep lesson. Chromium here is the installed Edge (the playwright
// scratch install has no H.264 and no headless shell of its own).
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const requirePw = createRequire((process.env.MW_PLAYWRIGHT || "C:/Users/ali/AppData/Local/Temp/p/node_modules") + "/");
const { chromium } = requirePw("playwright-core");

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
if (!url) { console.error("usage: node scripts/probe-panel.mjs <origin> [--dir <shots>]"); process.exit(2); }
const dirIx = args.indexOf("--dir");
const dir = dirIx >= 0 ? args[dirIx + 1] : ".panel";
mkdirSync(dir, { recursive: true });

const CASES = {
  short: { country: "US", city: "West Palm Beach", region: "FL", ip: "63.196.101.33", host: "x" },
  ipv6: { country: "CA", city: "Saint-Jean-sur-Richelieu", region: "QC", ip: "2607:fb90:8a3c:1d40:c0a8:1f2b:9e7d:44a1", host: "x" },
};
const browser = await chromium.launch({ channel: "msedge", headless: true });
let bad = 0;
for (const [name, geo] of Object.entries(CASES)) {
  for (const [W, touch] of [[320, true], [390, true], [1440, false]]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    await page.route("**/api/geo**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(geo) }));
    await page.goto(url, { waitUntil: "load" });
    await page.waitForSelector("[data-ds-routetabs] ul");
    await page.waitForTimeout(5000);
    const chip = page.locator("button[aria-expanded]").first();
    if (touch) await chip.tap();
    else { const bb = await chip.boundingBox(); await page.mouse.move(bb.x + 2, bb.y + 2); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 5 }); }
    await page.waitForTimeout(900);
    const info = await page.evaluate(() => {
      const btn = document.querySelector("button[aria-expanded='true']");
      const panel = btn && document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return { found: false };
      const r = panel.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(panel).paddingRight);
      // any descendant whose box extends past the panel's inner right edge
      const inner = r.right - pad + 0.5;
      const over = [...panel.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > inner; }).map((e) => `${e.tagName}:${e.textContent.slice(0, 30)} right ${Math.round(e.getBoundingClientRect().right)} > ${Math.round(inner)}`);
      return { found: true, l: Math.round(r.left), r: Math.round(r.right), vw: innerWidth, over, hasSite: /\bSITE\b/i.test(panel.innerText), ip: /your ip/i.test(panel.innerText) };
    });
    const ok = info.found && info.l >= 15 && info.r <= info.vw - 15 && info.over.length === 0 && !info.hasSite && info.ip;
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${name} @${W}: ${JSON.stringify(info)}`);
    await page.screenshot({ path: `${dir}/panel-${name}-${W}.png` });
    await ctx.close();
  }
}
await browser.close();
console.log(bad ? `PANEL FAILED: ${bad}` : "PANEL OK");
process.exit(bad ? 1 : 0);

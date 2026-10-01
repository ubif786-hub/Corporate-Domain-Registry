// Builds the site as a static folder that nginx serves on the droplet (/srv/cdr/public_html).
//
//   node scripts/export-static.mjs --site https://www.example.com [--payments] [--dest <folder>]
//
// The API (apps/api) is a separate process behind /api/; nothing here copies server code. What this
// adds to `next build` with STATIC_EXPORT=1:
//   the shop      ONLY WITH --payments: NEXT_PUBLIC_PAYMENTS=1, so search, cart and checkout call
//                 the API instead of showing their placeholders
//   images        downloaded out of the Vercel image store INTO the folder, every reference rewritten
//   prefetch      each route's nested segment files copied to the dotted names the browser asks for
// and the folder is REFUSED if any Vercel address survives anywhere in it.
//
// WHAT IS MOVED ASIDE FOR THE BUILD, and put back in a `finally` whatever happens: the Node-only
// routes (api/, the two HQ manifests), the proxy and the holding page it gates, and the two
// design-system reference routes (/components and /style-guide).
//
// THE BUILD VERDICT IS READ FROM out/index.html, not the exit code: `next build` segfaults at
// teardown on some machines after a perfectly good build.
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argOf = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const SITE = (argOf("--site") || "").replace(/\/$/, "");
if (!/^https:\/\/[a-z0-9.-]+$/i.test(SITE) || /vercel/i.test(SITE)) {
  console.error("usage: node scripts/export-static.mjs --site https://www.<the client's domain> [--payments]");
  process.exit(2);
}
const DEST = argOf("--dest");
// The shop is OFF unless asked for: without --payments the pages keep their placeholders.
const PAYMENTS = args.includes("--payments");
const OUT = join(ROOT, "out");
const ASIDE = join(ROOT, ".export-aside");

const MOVE_ASIDE = [
  "src/app/assets-manifest.json",
  "src/app/brand-manifest.json",
  "src/app/project-manifest.json",
  "src/app/coming-soon",
  "src/app/(site)/components",
  "src/app/(site)/style-guide",
  "src/proxy.ts",
];

if (existsSync(ASIDE)) {
  console.error("refused: .export-aside exists, so a previous run did not restore. Move its contents back by hand first.");
  process.exit(1);
}

/* ---------- 1. build, with the server-only pieces out of the tree ---------- */
const moved = [];
const restore = () => {
  for (const [from, to] of moved.reverse()) renameSync(to, from);
  moved.length = 0;
  if (existsSync(ASIDE)) rmSync(ASIDE, { recursive: true, force: true });
};
process.on("SIGINT", () => { restore(); process.exit(130); });

let log = "";
try {
  mkdirSync(ASIDE);
  MOVE_ASIDE.forEach((rel, i) => {
    const from = join(ROOT, rel);
    if (!existsSync(from)) throw new Error("expected to move aside, not found: " + rel);
    const to = join(ASIDE, String(i));
    renameSync(from, to);
    moved.push([from, to]);
  });
  rmSync(OUT, { recursive: true, force: true });
  rmSync(join(ROOT, ".next"), { recursive: true, force: true });
  const env = { ...process.env, STATIC_EXPORT: "1", NEXT_PUBLIC_STATIC_EXPORT: "1", NEXT_PUBLIC_SITE_URL: SITE };
  if (PAYMENTS) env.NEXT_PUBLIC_PAYMENTS = "1"; else delete env.NEXT_PUBLIC_PAYMENTS;
  delete env.COMING_SOON;
  console.log(PAYMENTS ? "shop: ON (search, cart and checkout call the API at /api/)" : "shop: off (search and checkout keep their placeholders)");
  delete env.VERCEL_PROJECT_PRODUCTION_URL;
  console.log("building the static export for", SITE, "...");
  try { log = execSync("npx next build", { cwd: ROOT, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { log = (e.stdout || "") + (e.stderr || ""); }
} finally {
  restore();
}
writeFileSync(join(ROOT, ".export-build.log"), log);
if (!existsSync(join(OUT, "index.html"))) {
  console.error(log.split(/\r?\n/).filter((l) => /error|Error|failed/i.test(l)).slice(0, 12).join("\n"));
  console.error("\nFAILED: the build produced no out/index.html. Full log: .export-build.log");
  process.exit(1);
}

/* ---------- 3. images out of the Vercel store, into the folder ---------- */
const TEXT = new Set([".html", ".js", ".css", ".txt", ".json", ".xml", ".webmanifest", ".svg", ".map"]);
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
const textFiles = () => walk(OUT).filter((f) => TEXT.has(extname(f)));
const BLOB_RE = /https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[A-Za-z0-9/_.\-]+/g;
const found = new Set();
for (const f of textFiles()) for (const m of readFileSync(f, "utf8").match(BLOB_RE) || []) found.add(m);
mkdirSync(join(OUT, "assets"), { recursive: true });
const rewrite = new Map();
for (const url of found) {
  const name = url.split("/").pop();
  const res = await fetch(url);
  if (!res.ok) { console.error("FAILED: could not fetch", url, res.status); process.exit(1); }
  writeFileSync(join(OUT, "assets", name), Buffer.from(await res.arrayBuffer()));
  rewrite.set(url, `/assets/${name}`);
  console.log("image:", name);
}
if (rewrite.size) {
  for (const f of textFiles()) {
    const before = readFileSync(f, "utf8");
    let after = before;
    for (const [from, to] of rewrite) after = after.split(from).join(to);
    if (after !== before) writeFileSync(f, after);
  }
}

/* ---------- 3b. the prefetch files, under the names the browser asks for ---------- */
// FOUND ON THE LIVE HOST, 21 Sep 2026. Next writes each route's segment data NESTED
// (register/__next.!KHNpdGUp/register/__PAGE__.txt) and the browser asks for it DOTTED
// (register/__next.!KHNpdGUp.register.__PAGE__.txt). Vercel maps one to the other; a plain file server serves
// files, so every link on the page drew two 404s and Next fell back to the route's whole data file
// (index.txt). Nothing broke and a tab change stayed in-page (measured with a window marker, same
// day), which is why the parity probe passed over it; the cost was a dozen failed requests per
// page view in the client's own logs and console. Each nested file is copied to its dotted name, after the image
// rewrite so the copy carries the rewritten addresses. A copy, not a rewrite rule: it is provable
// on the laptop, and it does not depend on the web server's rewrite rules.
let flat = 0;
const nextDirs = (dir) => readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap((d) => (d.name.startsWith("__next.") ? [join(dir, d.name)] : nextDirs(join(dir, d.name))));
for (const dir of nextDirs(OUT)) {
  for (const f of walk(dir)) {
    const dotted = f.slice(dir.length + 1).split(/[\\/]/).join(".");
    cpSync(f, `${dir}.${dotted}`);
    flat++;
  }
}
if (!flat) { console.error("FAILED: no nested prefetch files were found; Next's export layout has changed, read out/search/"); process.exit(1); }
console.log("prefetch files copied to their dotted names:", flat);

/* ---------- 4. the sitemap names the folder addresses ---------- */
// Every page lives at a folder address here (/search/), and nginx redirects the bare form to it.
// The sitemap should name the address that answers 200, not the one that redirects.
{
  const sm = join(OUT, "sitemap.xml");
  const before = readFileSync(sm, "utf8");
  const LOC = new RegExp("<loc>([^<]+?)</loc>", "g");
  const isFile = (u) => /\.[a-z0-9]+$/i.test(u.slice(SITE.length));
  const after = before.replace(LOC, (m, u) => `<loc>${u.endsWith("/") || isFile(u) ? u : u + "/"}</loc>`);
  writeFileSync(sm, after);
}

/* ---------- 5. the gate: no Vercel address anywhere in what ships ---------- */
const offenders = [];
for (const f of walk(OUT)) {
  if (!TEXT.has(extname(f))) continue;
  const hits = readFileSync(f, "utf8").match(/[A-Za-z0-9./:_-]*vercel[A-Za-z0-9./:_-]*/gi);
  if (hits) offenders.push([f.slice(OUT.length + 1), [...new Set(hits)].slice(0, 4)]);
}
// The word alone may appear; addresses may not.
const real = offenders.filter(([, hits]) => hits.some((h) => /vercel\.(app|com)|vercel-storage|vercel-dns|_vercel|x-vercel/i.test(h)));
if (real.length) {
  console.error("\nFAILED: a Vercel address survives in the export:");
  for (const [f, hits] of real.slice(0, 20)) console.error("  " + f + "  " + hits.join("  "));
  process.exit(1);
}

/* ---------- 6. report, and the hand-off copy ---------- */
const files = walk(OUT);
const bytes = files.reduce((n, f) => n + statSync(f).size, 0);
const pages = files.filter((f) => f.endsWith("index.html")).map((f) => "/" + f.slice(OUT.length + 1).replace(/\\/g, "/").replace(/index\.html$/, "")).sort();
console.log(`\nexport ok: ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB, ${pages.length} pages`);
console.log(pages.join("  "));
if (DEST) {
  rmSync(DEST, { recursive: true, force: true });
  cpSync(OUT, DEST, { recursive: true });
  console.log("copied to", DEST);
}

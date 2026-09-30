// Builds the site as a folder the client uploads to his cPanel's public_html.
//
//   node scripts/export-cpanel.mjs --site https://www.example.com [--dest <folder>]
//
// WHY THIS EXISTS (20 Sep 2026). The client hosts on his own GoDaddy cPanel, which serves files and
// PHP and runs no Node. So the site ships as a static export plus the few things a server did:
//   /api/geo      answered by cpanel/api/geo.php from an IP database that ships in the folder
//   the shop      ONLY WITH --payments (off by default): domain search at Tucows, checkout,
//                 the Stripe webhook, the done page's status, the admin page and the cron job
//                 (cpanel/api/*.php and lib/), reading src/data/catalog.json (copied in) for prices
//                 and cdr-config.php ABOVE public_html for the secrets
//   redirects     written into .htaccess from redirects.json, the same list next.config.ts reads
//   images        downloaded out of the Vercel image store INTO the folder, every reference rewritten
// and the folder is REFUSED if any Vercel address survives anywhere in it, because the whole point
// is that the Vercel project can be deleted the day this is live.
//
// WHAT IS MOVED ASIDE FOR THE BUILD, and put back in a `finally` whatever happens: the Node-only
// routes (api/, the two HQ manifests), the proxy and the holding page it gates (on cPanel,
// launching is uploading), and the two design-system reference routes (/components and
// /style-guide), which are the studio's surfaces, are unlinked and noindexed, and are the only
// things that read the studio's own image store.
//
// THE BUILD VERDICT IS READ FROM out/index.html, not the exit code: `next build` segfaults at
// teardown on this machine after a perfectly good build.
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argOf = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const SITE = (argOf("--site") || "").replace(/\/$/, "");
if (!/^https:\/\/[a-z0-9.-]+$/i.test(SITE) || /vercel/i.test(SITE)) {
  console.error("usage: node scripts/export-cpanel.mjs --site https://www.<the client's domain>");
  process.exit(2);
}
const DEST = argOf("--dest");
// Payment is OFF unless asked for (PROJECT.md decision 13): it is backend work the client has not
// commissioned, so a zip for him carries no payment script, no payment route and no form.
const PAYMENTS = args.includes("--payments");
const SHOP_ROUTES = ["domain-check", "checkout", "stripe-webhook", "order-status", "admin", "cron"];
const PAYMENT_FILES = [...SHOP_ROUTES.map((r) => `${r}.php`), join("lib", "cdr.php"), join("lib", "opensrs.php"), join("lib", "fulfil.php")];
const OUT = join(ROOT, "out");
const ASIDE = join(ROOT, ".export-aside");

const MOVE_ASIDE = [
  "src/app/api",
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
  console.log(PAYMENTS ? "shop: ON (live search, checkout, webhook, order status, admin, cron)" : "shop: off (search and checkout keep their placeholders; no shop script ships)");
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

/* ---------- 2. the PHP, and the IP database it reads ---------- */
cpSync(join(ROOT, "cpanel", "api"), join(OUT, "api"), { recursive: true });
if (PAYMENTS) {
  // The price list the page renders from, so the payment script charges exactly what the page shows.
  cpSync(join(ROOT, "src", "data", "catalog.json"), join(OUT, "api", "lib", "catalog.json"));
} else {
  for (const f of PAYMENT_FILES) rmSync(join(OUT, "api", f), { force: true });
}
const dbOut = join(OUT, "api", "geo", "dbip-city-lite.mmdb");
if (!existsSync(dbOut)) {
  // Not in git (127 MB, refreshed monthly). Fetch this month's, and last month's if this month's
  // is not published yet.
  mkdirSync(dirname(dbOut), { recursive: true });
  const now = new Date();
  const months = [0, -1].map((d) => { const t = new Date(now.getFullYear(), now.getMonth() + d, 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`; });
  let got = false;
  for (const m of months) {
    const url = `https://download.db-ip.com/free/dbip-city-lite-${m}.mmdb.gz`;
    const res = await fetch(url);
    if (!res.ok) continue;
    writeFileSync(dbOut, gunzipSync(Buffer.from(await res.arrayBuffer())));
    // Keep a copy beside the script so the next export does not download 60 MB again.
    cpSync(dbOut, join(ROOT, "cpanel", "api", "geo", "dbip-city-lite.mmdb"));
    console.log("IP database:", url);
    got = true;
    break;
  }
  if (!got) { console.error("FAILED: could not download the IP database"); process.exit(1); }
}

/* ---------- 3. images out of the Vercel store, into the folder ---------- */
const TEXT = new Set([".html", ".js", ".css", ".txt", ".json", ".xml", ".webmanifest", ".svg", ".map"]);
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
const textFiles = () => walk(OUT).filter((f) => TEXT.has(extname(f)) && !f.includes(join("api", "lib")));
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
// (register/__next.!KHNpdGUp.register.__PAGE__.txt). Vercel maps one to the other; Apache serves
// files, so every link on the page drew two 404s and Next fell back to the route's whole data file
// (index.txt). Nothing broke and a tab change stayed in-page (measured with a window marker, same
// day), which is why the parity probe passed over it; the cost was a dozen failed requests per
// page view in the client's own logs and console. Each nested file is copied to its dotted name, after the image
// rewrite so the copy carries the rewritten addresses. A copy, not a rewrite rule: it is provable
// on the laptop, and it does not depend on what the host allows in .htaccess.
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

/* ---------- 4. .htaccess: what next.config.ts and the platform did, said to Apache ---------- */
const redirects = JSON.parse(readFileSync(join(ROOT, "redirects.json"), "utf8"));
const rule = ({ source, destination, permanent }) => {
  // "/legal/:path*" -> ^legal(/.*)?$ ; "/r/:code" -> ^r/[^/]+/?$ ; "/lookup" -> ^lookup/?$
  let pat = source.replace(/^\//, "");
  if (/\/:\w+\*$/.test(pat)) pat = pat.replace(/\/:\w+\*$/, "(/.*)?");
  else if (/\/:\w+$/.test(pat)) pat = pat.replace(/\/:\w+$/, "/[^/]+/?");
  else pat += "/?";
  return `RewriteRule ^${pat}$ ${destination}/ [R=${permanent ? 308 : 302},L]`;
};
const htaccess = `# Corporate Domain Registry. Generated by scripts/export-cpanel.mjs; edit redirects.json and
# re-export rather than editing this file, or the next upload undoes the change.

Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html

<IfModule mod_rewrite.c>
RewriteEngine On

# https everywhere (the certificate is cPanel's AutoSSL)
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# one address: the bare domain answers by sending the visitor to the canonical host
${(() => {
  const host = SITE.replace(/^https:\/\//, "");
  if (!host.startsWith("www.")) return "# (the canonical host is the bare domain, so there is nothing to redirect)";
  const bare = host.slice(4).replace(/\./g, "\\.");
  return `RewriteCond %{HTTP_HOST} ^${bare}$ [NC]\nRewriteRule ^ ${SITE}%{REQUEST_URI} [R=301,L]`;
})()}

# the location lookup the header chip asks for
RewriteRule ^api/geo/?$ api/geo.php [L]
${PAYMENTS ? `
# the shop: search, checkout, Stripe's webhook, the done page's status, the admin page, the cron job
${SHOP_ROUTES.map((r) => `RewriteRule ^api/${r}/?$ api/${r}.php [L,QSA]`).join("\n")}
` : ""}

# nothing under api/ but the scripts themselves is for the public: not the database, not the library
RewriteRule ^api/(geo|lib)/ - [F,L]

# retired addresses land on their successors (redirects.json)
${redirects.map(rule).join("\n")}
</IfModule>

# the build's own files are fingerprinted, so they may be cached for good; pages may not
<IfModule mod_headers.c>
<FilesMatch "\\.(html|txt|xml|json)$">
Header set Cache-Control "no-cache"
</FilesMatch>
</IfModule>
<IfModule mod_expires.c>
ExpiresActive On
ExpiresByType text/html "access plus 0 seconds"
</IfModule>
<IfModule mod_headers.c>
<If "%{REQUEST_URI} =~ m#^/_next/static/#">
Header set Cache-Control "public, max-age=31536000, immutable"
</If>
</IfModule>

# the share card is a PNG with no extension in its name, so Apache has to be told what it is
<Files "opengraph-image">
ForceType image/png
</Files>

AddType image/webp .webp
AddType font/woff2 .woff2
`;
writeFileSync(join(OUT, ".htaccess"), htaccess);

// Every page lives at a folder address here (/search/), and Apache redirects the bare form to it.
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
  if (!TEXT.has(extname(f)) && extname(f) !== ".php") continue;
  const hits = readFileSync(f, "utf8").match(/[A-Za-z0-9./:_-]*vercel[A-Za-z0-9./:_-]*/gi);
  if (hits) offenders.push([f.slice(OUT.length + 1), [...new Set(hits)].slice(0, 4)]);
}
// geo.php and .htaccess EXPLAIN the move in comments and may say the word; addresses may not appear.
const real = offenders.filter(([f, hits]) => hits.some((h) => /vercel\.(app|com)|vercel-storage|vercel-dns|_vercel|x-vercel/i.test(h)) && !/^api[\\/]geo\.php$/.test(f));
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

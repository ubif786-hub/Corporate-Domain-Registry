// Turn the client's whois CSV into a searchable domain table, WITHOUT the personal data.
//
//   node scripts/gen-domains.mjs <path-to-source.csv>
//
// WHY THIS SCRIPT EXISTS AND WHAT IT REFUSES TO CARRY.
//
// The source file is a vendor sample of a commercial whois database, 43 columns wide. Thirty of
// those columns are contact data: registrant_name, registrant_email, registrant_telephone,
// registrant_street1..4, the postal and fax fields, and the identical set again for the
// administrative contact. Measured on the file supplied 31 Aug 2026, roughly 741 of its 1000 rows
// carry a named individual's personal email address, telephone number and street address; only 86
// sit behind a privacy proxy.
//
// Everything in src/data/** is imported by client components, so it ships in the public
// JavaScript bundle and is readable by anyone who opens the site. Carrying those columns would
// publish 741 people's contact details on CDR's own website, on the same visit as CDR's Privacy
// Policy. It is also the exact thing ICANN's registration data policy redacts by default.
//
// So this script uses an ALLOW LIST, not a block list, and that direction is deliberate: a block
// list silently passes any column a future file adds, and the failure mode of getting it wrong is
// publishing personal data. A column that is not named in KEEP does not survive, ever.
//
// It also REFUSES to write if a kept field looks like contact data (an email address or a
// telephone number), so a source file that moves its columns around fails loudly instead of
// leaking. That guard is self-tested below against a known-bad row.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SOURCE = process.argv[2];
if (!SOURCE) {
  console.error("usage: node scripts/gen-domains.mjs <path-to-source.csv>");
  process.exit(2);
}

const OUT = resolve("src/data/domains.generated.ts");

/** The ONLY columns that may reach the browser. Everything else is dropped. */
const KEEP = {
  domainName: "domain",
  registrarName: "registrar",
  whoisServer: "whoisServer",
  nameServers: "nameservers",
  createdDate: "createdAt",
  updatedDate: "updatedAt",
  expiresDate: "expiresAt",
  status: "statuses",
};

/** A field that matches either of these is contact data and must never have been kept. */
const LOOKS_LIKE_EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const LOOKS_LIKE_PHONE = /^\+?\d[\d\s().-]{7,}$/;

// ---------------------------------------------------------------- CSV reading
// A quoted-field reader, not split(","). Registrar names ("Network Solutions, LLC") and status
// strings contain commas; a naive split corrupts them silently, which is the worst kind.
function parseRow(line) {
  const out = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; }
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cell); cell = ""; }
    else cell += ch;
  }
  out.push(cell);
  return out;
}

const text = readFileSync(SOURCE, "utf8");
const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
const header = parseRow(lines[0]);

const index = {};
for (const [csvCol, field] of Object.entries(KEEP)) {
  const at = header.indexOf(csvCol);
  if (at === -1) {
    console.error(`source is missing the required column "${csvCol}"`);
    process.exit(1);
  }
  index[field] = at;
}

// ---------------------------------------------------------------- normalising
const iso = (raw) => {
  if (!raw) return null;
  const t = Date.parse(raw.trim().replace(" UTC", "Z").replace(" ", "T"));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};
const pipeList = (raw) =>
  (raw || "").split("|").map((s) => s.trim()).filter(Boolean);

// The status column reads "clientTransferProhibited https://icann.org/epp#..." Keep the code and
// drop the URL: the code is the fact, the URL is a citation the UI does not render.
const statusCodes = (raw) =>
  (raw || "")
    .split(/\s+/)
    .filter((s) => s && !s.startsWith("http"))
    .filter((s, i, a) => a.indexOf(s) === i);

const seen = new Set();
const records = [];
const rejected = [];

for (let i = 1; i < lines.length; i++) {
  const cells = parseRow(lines[i]);
  const get = (f) => (cells[index[f]] ?? "").trim();

  const domain = get("domain").toLowerCase();
  if (!domain) { rejected.push(`${i + 1}: no domain`); continue; }
  if (seen.has(domain)) { rejected.push(`${i + 1}: duplicate ${domain}`); continue; }
  seen.add(domain);

  const rec = {
    domain,
    availability: "registered",
    registrar: get("registrar") || null,
    whoisServer: get("whoisServer") || null,
    createdAt: iso(get("createdAt")),
    updatedAt: iso(get("updatedAt")),
    expiresAt: iso(get("expiresAt")),
    statuses: statusCodes(get("statuses")),
    nameservers: pipeList(get("nameservers")).map((n) => n.toLowerCase()),
  };

  // THE GUARD. Nothing that looks like a person's contact detail leaves this loop.
  for (const [k, v] of Object.entries(rec)) {
    const flat = Array.isArray(v) ? v.join(" ") : v;
    if (typeof flat !== "string" || !flat) continue;
    if (k === "domain" || k === "whoisServer" || k === "nameservers") continue; // hostnames, not contacts
    if (LOOKS_LIKE_EMAIL.test(flat) || LOOKS_LIKE_PHONE.test(flat)) {
      console.error(`ABORT line ${i + 1}: field "${k}" looks like contact data: ${flat.slice(0, 60)}`);
      console.error("The source columns have moved. Fix KEEP before re-running.");
      process.exit(1);
    }
  }

  records.push(rec);
}

// ---------------------------------------------------------------- self-test
// A guard that has never been seen to fire is not a guard. Prove it catches a known-bad value
// before trusting the clean run above.
{
  const bad = "ChadBuher@gmail.com";
  const alsoBad = "13179381447";
  if (!LOOKS_LIKE_EMAIL.test(bad) || !LOOKS_LIKE_PHONE.test(alsoBad)) {
    console.error("SELF-TEST FAILED: the PII guard does not match known contact data.");
    process.exit(1);
  }
}

// ---------------------------------------------------------------- emit
const emitted = records.map((r) => ({
  d: r.domain,
  r: r.registrar,
  w: r.whoisServer,
  c: r.createdAt,
  u: r.updatedAt,
  e: r.expiresAt,
  s: r.statuses,
  n: r.nameservers,
}));

const banner = `// GENERATED by scripts/gen-domains.mjs. Do not edit by hand.
//
// Source: a whois database export supplied by the client. ${records.length} domains.
//
// THE CONTACT COLUMNS ARE NOT HERE AND MUST NEVER BE. The source carries 30 columns of registrant
// and administrative contact data (names, personal email addresses, telephone numbers, street
// addresses). The generator uses an allow list, so those columns cannot survive a regeneration,
// and it aborts if a kept field ever looks like an email address or a phone number.
//
// Field names are single letters because this table ships in the browser bundle and 1000 records
// of long keys is real weight. src/data/domains.ts is the only file that reads them; nothing else
// should touch this shape.
//
// Regenerate: node scripts/gen-domains.mjs <path-to-source.csv>
`;

const body = `${banner}
export interface RawDomain {
  d: string;
  r: string | null;
  w: string | null;
  c: string | null;
  u: string | null;
  e: string | null;
  s: string[];
  n: string[];
}

export const SOURCE_ROWS = ${records.length};

export const RAW_DOMAINS: RawDomain[] = ${JSON.stringify(emitted)};
`;

writeFileSync(OUT, body);

const bytes = Buffer.byteLength(body, "utf8");
console.log(`domains: ${records.length} kept, ${rejected.length} rejected`);
for (const r of rejected.slice(0, 5)) console.log(`   ${r}`);
console.log(`fields kept: ${Object.values(KEEP).join(", ")}`);
console.log(`contact columns dropped: ${header.length - Object.keys(KEEP).length} of ${header.length}`);
console.log(`wrote ${OUT} (${(bytes / 1024).toFixed(0)} KB)`);

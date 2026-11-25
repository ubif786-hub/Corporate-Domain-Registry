// The list supplier's WHOIS exports turned into Torpedo's mailing files (Brad, 22 Nov 2026): one
// letter per domain, up to 10 per owner (soonest expiry first), up to 5 letters per envelope, Canada
// and the U.S. apart, one file per country and letters per envelope (batch 1 to 5), an envelope code
// on every record (C20001: Canada, batch 2, envelope 1) and a six-digit reference number per letter
// that keeps counting across mailings. No database here: letters.service.ts stores the result.

import { crc32, deflateRawSync } from "node:zlib";
import { isSellable, isValidDomain, normaliseDomain, tldOf } from "@cdr/shared";
import { HttpError } from "../../core/http";
import { row } from "../admin/admin.csv";

export type Country = "CA" | "US";
const COUNTRIES: Country[] = ["CA", "US"];
const BATCHES = [1, 2, 3, 4, 5];
const PER_OWNER = 10;
const PER_ENVELOPE = 5;

export interface Letter {
  ref: number;
  country: Country;
  batch: number;
  envelope: string;
  domain: string;
  /** YYYY-MM-DD */
  expires: string;
  name: string;
  company: string;
  street: string;
  city: string;
  state: string;
  postal: string;
}

export interface MailingCounts {
  rows: number;
  /** Rows left out, by reason. */
  dropped: Record<string, number>;
  /** Letters in each file, batch 1 first. */
  CA: number[];
  US: number[];
}

export interface ListFile { name: string; text: string }

/** RFC 4180: quoted fields, doubled quotes, line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let rowNow: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") { rowNow.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      rowNow.push(field);
      rows.push(rowNow);
      rowNow = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || rowNow.length) { rowNow.push(field); rows.push(rowNow); }
  return rows;
}

const REQUIRED = [
  "domain_name", "expiry_date", "domain_registrar_name", "registrant_name", "registrant_company",
  "registrant_street", "registrant_city", "registrant_state", "registrant_zip", "registrant_country_code",
];

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

const PRIVACY = /redact|privacy|proxy|withheld|private|not disclosed|data protected|gdpr|masking|whoisguard|promo people|domain protection/i;
// Holding accounts and domains for sale never reach a real owner.
const NOT_AN_OWNER = /holding account|confiscated|for sale|newfold digital|wix\.com/i;
// A role, not a person: fine when the company is real, useless on its own.
// Not a name at all: an email, a bare phone number, a "call to buy this domain" note.
const JUNK = /@|inquir|\bcall\b|for sale|^[\d\s()+.-]{7,}$/i;
const ROLE = /^(domain (admin|administrator|manager|management|owner|registrant|contact)|contact email|support|hostmaster|webmaster|admin|administrator|registrant|n\/?a|none|unknown|test)$/i;
// Notices in the street field ("All correspondence to this registrant must be sent via...").
const NOT_A_STREET = /correspondence|registry/i;

const CA_POSTAL = /^([A-Z]\d[A-Z])[ -]?(\d[A-Z]\d)$/;
const US_ZIP = /^(\d{5})(?:-?(\d{4}))?$/;

const PROVINCES: Record<string, string> = {
  ALBERTA: "AB", "BRITISH COLUMBIA": "BC", MANITOBA: "MB", "NEW BRUNSWICK": "NB", "NEWFOUNDLAND AND LABRADOR": "NL", NEWFOUNDLAND: "NL",
  "NOVA SCOTIA": "NS", "NORTHWEST TERRITORIES": "NT", NUNAVUT: "NU", ONTARIO: "ON", "PRINCE EDWARD ISLAND": "PE", QUEBEC: "QC",
  QUÉBEC: "QC", SASKATCHEWAN: "SK", YUKON: "YT", YK: "YT",
};
const STATES: Record<string, string> = {
  ALABAMA: "AL", ALASKA: "AK", ARIZONA: "AZ", ARKANSAS: "AR", CALIFORNIA: "CA", COLORADO: "CO", CONNECTICUT: "CT", DELAWARE: "DE",
  "DISTRICT OF COLUMBIA": "DC", FLORIDA: "FL", GEORGIA: "GA", HAWAII: "HI", IDAHO: "ID", ILLINOIS: "IL", INDIANA: "IN", IOWA: "IA",
  KANSAS: "KS", KENTUCKY: "KY", LOUISIANA: "LA", MAINE: "ME", MARYLAND: "MD", MASSACHUSETTS: "MA", MICHIGAN: "MI", MINNESOTA: "MN",
  MISSISSIPPI: "MS", MISSOURI: "MO", MONTANA: "MT", NEBRASKA: "NE", NEVADA: "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM", "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", OHIO: "OH", OKLAHOMA: "OK", OREGON: "OR",
  PENNSYLVANIA: "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD", TENNESSEE: "TN", TEXAS: "TX", UTAH: "UT",
  VERMONT: "VT", VIRGINIA: "VA", WASHINGTON: "WA", "WEST VIRGINIA": "WV", WISCONSIN: "WI", WYOMING: "WY", "PUERTO RICO": "PR",
  GUAM: "GU", "VIRGIN ISLANDS": "VI", "AMERICAN SAMOA": "AS", "NORTHERN MARIANA ISLANDS": "MP",
};
const CODES: Record<Country, Set<string>> = {
  CA: new Set(Object.values(PROVINCES).filter((c) => c !== "YK")),
  US: new Set([...Object.values(STATES), "AA", "AE", "AP"]),
};

function stateCode(country: Country, raw: string): string {
  const up = raw.toUpperCase().replace(/\./g, "");
  if (CODES[country].has(up)) return up;
  const named = (country === "CA" ? PROVINCES : STATES)[up];
  return named && CODES[country].has(named) ? named : "";
}

function postalCode(country: Country, raw: string): string {
  const up = raw.toUpperCase().replace(/\s+/g, " ");
  if (country === "CA") {
    const m = CA_POSTAL.exec(up);
    return m ? `${m[1]} ${m[2]}` : "";
  }
  // Spreadsheets drop the leading zero of New England ZIPs; a broken +4 is left off.
  const zip = /^\d{4}$/.test(up) ? "0" + up : /^\d{5}-\d{1,3}$/.test(up) ? up.slice(0, 5) : up;
  const m = US_ZIP.exec(zip);
  return m ? (m[2] ? `${m[1]}-${m[2]}` : m[1]) : "";
}

const SUFFIX = /^(inc|llc|ltd|limited|corp|corporation|co|company|llp|lp|pc|pa|plc|ltee|ltée)\.?$/i;

/** "MCGILL, TIM" reads "TIM MCGILL" on a letter; "Konsulati, Inc" stays as it is. */
function personName(s: string): string {
  const m = /^([\p{L}'’-]+), ([\p{L}'’. -]+)$/u.exec(s);
  return m && !SUFFIX.test(m[2].trim()) ? `${m[2].trim()} ${m[1]}` : s;
}

type Candidate = Omit<Letter, "ref" | "batch" | "envelope">;

/** One row: a candidate letter, or the reason it is left out. */
function candidate(r: Record<string, string>, seen: Set<string>, today: string): Candidate | string {
  const domain = normaliseDomain(r.domain_name ?? "");
  if (!isValidDomain(domain) || !isSellable(domain)) return "Not a domain we can renew";
  if (seen.has(domain)) return "Listed twice";
  seen.add(domain);
  const expires = clean(r.expiry_date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || expires <= today) return "Expired or no expiry date";
  if (/tucows|opensrs/i.test(r.domain_registrar_name ?? "")) return "Already with Tucows";

  let name = personName(clean(r.registrant_name));
  let company = clean(r.registrant_company);
  const street = clean(r.registrant_street);
  const city = clean(r.registrant_city);
  if (!name && !company) return "No owner name";
  if (PRIVACY.test(`${name} ${company} ${street} ${city}`)) return "Owner hidden by a privacy service";
  if (NOT_AN_OWNER.test(`${name} ${company}`)) return "Placeholder owner";
  if (ROLE.test(name) || JUNK.test(name)) name = "";
  if (ROLE.test(company) || JUNK.test(company)) company = "";
  if (!name && !company) return "Placeholder owner";
  if (name.toLowerCase() === company.toLowerCase()) company = "";

  const zip = clean(r.registrant_zip);
  let country = clean(r.registrant_country_code).toUpperCase();
  if (!country) country = CA_POSTAL.test(zip.toUpperCase()) ? "CA" : US_ZIP.test(zip) ? "US" : "";
  if (country !== "CA" && country !== "US") return "Outside Canada and the U.S.";
  if (tldOf(domain) === "ca" && country !== "CA") return ".ca owned outside Canada";
  const state = stateCode(country, clean(r.registrant_state));
  const postal = postalCode(country, zip);
  if (!street || street.length > 100 || NOT_A_STREET.test(street) || !city || !state || !postal) return "Incomplete address";
  return { country, domain, expires, name, company, street, city, state, postal };
}

const bump = (counts: Record<string, number>, key: string, n = 1) => { counts[key] = (counts[key] ?? 0) + n; };

/** Every letter of a mailing, in file order (Canada batch 1 to 5, then the U.S.), numbered from firstRef. */
export function buildMailing(files: ListFile[], firstRef: number, today: string): { letters: Letter[]; counts: MailingCounts } {
  const counts: MailingCounts = { rows: 0, dropped: {}, CA: [0, 0, 0, 0, 0], US: [0, 0, 0, 0, 0] };
  const owners = new Map<string, Candidate[]>();
  const seen = new Set<string>();
  for (const f of files) {
    const [head, ...body] = parseCsv(f.text);
    const cols = (head ?? []).map((h) => h.trim().toLowerCase());
    const missing = REQUIRED.find((c) => !cols.includes(c));
    if (missing) throw new HttpError(422, "bad_list", `${f.name} has no ${missing} column. Upload the list as the supplier sends it (CSV).`);
    for (const cells of body) {
      if (cells.length === 1 && cells[0].trim() === "") continue;
      counts.rows++;
      const r: Record<string, string> = {};
      cols.forEach((c, i) => { r[c] = cells[i] ?? ""; });
      const c = candidate(r, seen, today);
      if (typeof c === "string") { bump(counts.dropped, c); continue; }
      // Same person or business at the same address. Different businesses at one address stay apart.
      const key = [c.country, c.name, c.company, c.street, c.city, c.postal].join("|").toLowerCase();
      const list = owners.get(key);
      if (list) list.push(c);
      else owners.set(key, [c]);
    }
  }

  const envelopes: Record<Country, Candidate[][]> = { CA: [], US: [] };
  for (const list of owners.values()) {
    list.sort((a, b) => a.expires.localeCompare(b.expires) || a.domain.localeCompare(b.domain));
    if (list.length > PER_OWNER) bump(counts.dropped, `More than ${PER_OWNER} domains for one owner`, list.length - PER_OWNER);
    const kept = list.slice(0, PER_OWNER);
    for (let i = 0; i < kept.length; i += PER_ENVELOPE) envelopes[kept[0].country].push(kept.slice(i, i + PER_ENVELOPE));
  }

  const letters: Letter[] = [];
  let ref = firstRef;
  for (const country of COUNTRIES) {
    const all = envelopes[country].sort((a, b) => a[0].expires.localeCompare(b[0].expires) || a[0].domain.localeCompare(b[0].domain));
    for (const batch of BATCHES) {
      const inBatch = all.filter((e) => e.length === batch);
      if (inBatch.length > 9999) throw new HttpError(422, "too_many", `More than 9,999 envelopes in one file. Split the list in two.`);
      inBatch.forEach((env, i) => {
        const envelope = `${country === "CA" ? "C" : "U"}${batch}${String(i + 1).padStart(4, "0")}`;
        for (const c of env) letters.push({ ref: ref++, batch, envelope, ...c });
      });
      counts[country][batch - 1] = inBatch.length * batch;
    }
  }
  if (ref - 1 > 999_999) throw new HttpError(422, "too_many", "The reference numbers would pass 999999.");
  return { letters, counts };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "January 06, 2027", as on Torpedo's proofs. */
const longDate = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(8, 10)}, ${d.slice(0, 4)}`;

export const refText = (ref: number) => String(ref).padStart(6, "0");

const HEAD: Record<Country, string[]> = {
  CA: ["Envelope ID", "Domain", "Expiry Date", "Reference Number", "Name", "Company", "Street", "City", "Province", "Postal Code", "QR Code URL"],
  US: ["Envelope ID", "Domain", "Expiry Date", "Reference Number", "Name", "Company", "Street", "City", "State", "ZIP Code", "Country", "QR Code URL"],
};

/** The ten files for Torpedo, fields in the order they appear on the letter. */
export function mailingFiles(mailing: number, letters: Letter[], siteUrl: string): ListFile[] {
  const files: ListFile[] = [];
  for (const country of COUNTRIES) {
    for (const batch of BATCHES) {
      let text = "﻿" + row(HEAD[country]);
      for (const l of letters) {
        if (l.country !== country || l.batch !== batch) continue;
        const link = `${siteUrl}/renew/?domain=${encodeURIComponent(l.domain)}&ref=${refText(l.ref)}`;
        text += row([l.envelope, l.domain, longDate(l.expires), refText(l.ref), l.name, l.company, l.street, l.city, l.state, l.postal, ...(country === "US" ? ["USA"] : []), link]);
      }
      files.push({ name: `CDR-mailing-${mailing}-${country === "CA" ? "Canada" : "USA"}-batch-${batch}.csv`, text });
    }
  }
  return files;
}

/** The files as one .zip (deflate), so a mailing is a single download. */
export function zipFiles(files: ListFile[], when = new Date()): Buffer {
  const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
  const date = ((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  const parts: Buffer[] = [];
  const dir: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const raw = Buffer.from(f.text, "utf8");
    const data = deflateRawSync(raw);
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(date, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(raw.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    parts.push(local, name, data);
    dir.push(entry, name);
    offset += 30 + name.length + data.length;
  }
  const central = Buffer.concat(dir);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, central, end]);
}

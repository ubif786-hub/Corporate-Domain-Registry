// The searchable domain table: the only module anything outside src/data reads.
//
// WHAT THIS IS. A whois database export the client supplied, 1000 real domains, put behind the
// lookup so /whois and /search answer with real records instead of a handful of fixtures. The
// client wanted to see the thing working before commissioning a live feed, and this is what makes
// that honest rather than staged.
//
// WHAT IT IS NOT. It is not a live lookup, and it is not stock. There is no registry behind this
// site, so every record here is a SNAPSHOT taken when the export was cut, and every record says so
// through `checkedAt`. It carries no prices and no availability signal, because the source has
// neither column.
//
// THE PERSONAL DATA IS GONE, AND CANNOT COME BACK BY ACCIDENT. The source is 43 columns wide and
// 30 of them are registrant and administrative contact fields, with roughly 741 of the 1000 rows
// carrying a named individual's personal email, telephone and street address. Everything in
// src/data ships in the public browser bundle, so those columns would have been published on the
// client's own site alongside the client's own privacy policy. scripts/gen-domains.mjs works from
// an ALLOW LIST (a block list silently passes whatever a future file adds) and aborts if a kept
// field ever looks like an email address or a phone number. 35 of 43 columns are dropped.
//
// THE DATES ARE OLD AND THAT IS NOT HIDDEN. The export was cut in 2016 and every record in it has
// since expired. The site does not pretend otherwise: `isExpired` reads each record against its
// own `checkedAt`, the badge shows Expired rather than Registered, and the record carries the date
// it was checked. A stale record presented as current is the one thing this page must never do.

import type { Availability, DomainRecord } from "./lookup";
import { RAW_DOMAINS, SOURCE_ROWS, type RawDomain } from "./domains.generated";

export { SOURCE_ROWS };

/**
 * When the export was cut, and therefore what every record here is true AS AT. Taken from the
 * source's own audit column rather than invented, and it is what `isExpired` compares against, so
 * the site can never re-date a record by reading the clock instead.
 */
export const SNAPSHOT_AT = "2016-09-30T00:00:00Z";

function toRecord(r: RawDomain): DomainRecord {
  return {
    domain: r.d,
    availability: "registered" as Availability,
    registrar: r.r,
    createdAt: r.c,
    expiresAt: r.e,
    statuses: r.s,
    nameservers: r.n,
    checkedAt: SNAPSHOT_AT,
    sample: true,
  };
}

/** Exact-match index, built by reference so the 1000 records are not duplicated in memory. */
const INDEX: Map<string, RawDomain> = new Map(RAW_DOMAINS.map((r) => [r.d, r]));

export function findDomain(domain: string): DomainRecord | null {
  const hit = INDEX.get(domain.toLowerCase());
  return hit ? toRecord(hit) : null;
}

/**
 * Prefix search over the second-level label, for suggestions. Capped, because this runs on every
 * keystroke in the browser over a thousand rows and an uncapped scan of a growing table is the
 * kind of thing that is fine until the table grows.
 */
export function searchDomains(query: string, limit = 20): DomainRecord[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: DomainRecord[] = [];
  for (const r of RAW_DOMAINS) {
    if (r.d.startsWith(q)) {
      out.push(toRecord(r));
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** A few real domains from the table, so the page can offer something that will actually resolve. */
export const EXAMPLE_DOMAINS: string[] = RAW_DOMAINS.slice(0, 6).map((r) => r.d);

// The sample lookup. The front end has no registry behind it yet (TRIAGE, draft 2), so a
// search resolves from this table and everything else returns "unable to verify" rather than an
// invented answer. The shape is the normalised RDAP record the real lookup will return.

import { WHOIS_FIXTURES } from "./whois-fixtures";
import { findDomain } from "./domains";

export type Availability = "available" | "registered" | "unknown";

export interface DomainRecord {
  domain: string;
  availability: Availability;
  registrar: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  statuses: string[];
  nameservers: string[];
  /** When the lookup ran. Never show expiry data without it. */
  checkedAt: string;
  /** True for every record the site can currently return: there is no registry behind it yet. */
  sample: boolean;
  /**
   * True when the domain was simply not in the snapshot, as opposed to a lookup that ran and
   * could not verify.
   *
   * THESE ARE DIFFERENT FACTS AND THE PAGE MUST NOT CONFLATE THEM. Until 18 Sep 2026 every miss
   * rendered "We could not reach the registry just now. Try again in a moment.", which claims an
   * outage that is not happening: there is no registry connection to fail. The client tested the
   * page against a domain they cared about, got that sentence, and reported the search as broken.
   * It was not broken; it was lying about why it had nothing.
   */
  notInSnapshot?: boolean;
}

const CHECKED_AT = "2026-08-23T14:00:00Z";

export const SAMPLE_DOMAINS: Record<string, DomainRecord> = {
  "available-example.com": {
    domain: "available-example.com",
    availability: "available",
    registrar: null,
    createdAt: null,
    expiresAt: null,
    statuses: [],
    nameservers: [],
    checkedAt: CHECKED_AT,
    sample: true,
  },
  "registered-example.com": {
    domain: "registered-example.com",
    availability: "registered",
    registrar: "Example Registrar, Inc.",
    createdAt: "2019-03-12T00:00:00Z",
    expiresAt: "2027-03-12T00:00:00Z",
    statuses: ["clientTransferProhibited", "clientUpdateProhibited"],
    nameservers: ["ns1.example-dns.net", "ns2.example-dns.net"],
    checkedAt: CHECKED_AT,
    sample: true,
  },
  "unverifiable-example.com": {
    domain: "unverifiable-example.com",
    availability: "unknown",
    registrar: null,
    createdAt: null,
    expiresAt: null,
    statuses: [],
    nameservers: [],
    checkedAt: CHECKED_AT,
    sample: true,
  },
};

/** Lower-cases, trims, strips a scheme or path, so "HTTPS://Example.com/" looks up "example.com". */
export function normaliseDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
}

export function isPlausibleDomain(domain: string): boolean {
  return /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{2,63})+$/.test(domain);
}

/**
 * True when the record's own expiry has passed as at the moment it was checked.
 *
 * This is the one guard that has to exist before any real feed is wired in. The 1000-row file
 * offered on 31 Aug 2026 was entirely expired records, some of them nine years old, and rendering
 * one of those beside a registrar and a nameserver list makes a dead registration look like a live
 * one. Comparing against `checkedAt` rather than the clock is deliberate: a record is only ever as
 * true as the moment it was read, and comparing a stored record to "now" would quietly re-date it.
 */
export function isExpired(record: DomainRecord): boolean {
  if (!record.expiresAt) return false;
  return Date.parse(record.expiresAt) < Date.parse(record.checkedAt);
}

export function lookup(raw: string): DomainRecord {
  const domain = normaliseDomain(raw);
  // Fixtures first, then the client's 1000-domain export, then the three originals, then an
  // honest miss. Fixtures win on a collision because they are the ones that demonstrate a
  // specific state (near-expiry, redemption, a transfer lock) and a real row would mask them.
  return (
    WHOIS_FIXTURES[domain] ??
    findDomain(domain) ??
    SAMPLE_DOMAINS[domain] ?? {
      domain,
      availability: "unknown",
      registrar: null,
      createdAt: null,
      expiresAt: null,
      statuses: [],
      nameservers: [],
      checkedAt: CHECKED_AT,
      sample: true,
      // The fallthrough, and the ONLY place this flag is set. `unverifiable-example.com` is a
      // fixture that deliberately demonstrates a real unable-to-verify, so it must keep reading
      // as one; everything else that lands here is simply absent from the snapshot.
      notInSnapshot: true,
    }
  );
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

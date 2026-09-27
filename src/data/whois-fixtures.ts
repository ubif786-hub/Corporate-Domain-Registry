// The demonstration whois records.
//
// WHY THESE ARE INVENTED, AND WHY THAT IS THE CORRECT ANSWER RATHER THAN A COMPROMISE.
//
// On 31 Aug 2026 a 1000-row CSV arrived to populate this page. It turned out to be a vendor
// SAMPLE of a commercial whois database, not CDR's own data, and it could not be used. Measured,
// not assumed: every one of the 1000 domains is a .info, every registrant country is the United
// States, every single row's expiry date is already in the past, there is no price column and no
// availability column, and roughly 741 rows carry a named individual's personal email address,
// telephone number and street address.
//
// The plan those rows were for compiles the data into a module imported by CLIENT components,
// which means every byte ships in the public JavaScript bundle and is readable by anyone who
// opens the site. Applied to that file it would publish some 741 people's contact details on
// CDR's own website, on the same visit as CDR's Privacy Policy, which promises the opposite. It
// would also present nine-year-old records as current answers.
//
// So the file stays out of the repo, and the page is demonstrated with records invented here.
// Every registrant, registrar, address and nameserver below is fictional. The SHAPE is real: it
// is the normalised record a live RDAP feed will return, and the field names were taken from that
// CSV's own 43 columns, which is the one thing it was genuinely good for.
//
// WHAT THEY COVER, deliberately, because a demo of only the happy path hides the states that
// matter: a plain registered domain, an available one, a domain expiring within the month, one
// already expired, one in redemption, a .ca (CIRA appears in four of the client's six legal
// documents and .ca is not yet in EXTENSIONS, which is a real gap this puts on screen), a domain
// behind a privacy proxy, one locked against transfer, and one the lookup cannot verify.
//
// DATES ARE OFFSETS FROM A FIXED EPOCH, never absolute. A fixture written with a hardcoded 2027
// expiry silently becomes an expired-domain fixture in 2027, and the near-expiry case stops
// demonstrating anything the moment it passes. Offsets keep meaning what they say.

import type { DomainRecord } from "./lookup";

/** The day the fixtures describe. Fixed, so a record is reproducible and a probe can assert it. */
export const FIXTURE_EPOCH = "2026-08-31T00:00:00Z";

const DAY = 86_400_000;
const at = (days: number): string =>
  new Date(Date.parse(FIXTURE_EPOCH) + days * DAY).toISOString();

interface Fixture extends Omit<DomainRecord, "checkedAt" | "sample"> {
  /** One line explaining what this record is here to show. Not rendered; it is for whoever edits. */
  demonstrates: string;
}

const FIXTURES: Fixture[] = [
  {
    domain: "brightpath.com",
    availability: "registered",
    registrar: "Example Registrar, Inc.",
    createdAt: at(-2870),
    expiresAt: at(214),
    statuses: ["clientTransferProhibited"],
    nameservers: ["ns1.example-dns.net", "ns2.example-dns.net"],
    demonstrates: "The ordinary case: registered, healthy, renewing in seven months.",
  },
  {
    domain: "northharbour.com",
    availability: "available",
    registrar: null,
    createdAt: null,
    expiresAt: null,
    statuses: [],
    nameservers: [],
    demonstrates: "Available, so the result offers to register it.",
  },
  {
    domain: "quietwater.org",
    availability: "registered",
    registrar: "Example Registrar, Inc.",
    createdAt: at(-1460),
    expiresAt: at(19),
    statuses: ["ok"],
    nameservers: ["ns1.example-dns.net", "ns2.example-dns.net"],
    demonstrates: "Expiring inside a month: the renewal prompt has to be visible without alarm.",
  },
  {
    domain: "lapsedledger.net",
    availability: "registered",
    registrar: "Example Registrar, Inc.",
    createdAt: at(-2200),
    expiresAt: at(-24),
    statuses: ["clientHold", "autoRenewPeriod"],
    nameservers: [],
    demonstrates: "Already expired, in the grace period. Must never read as a current registration.",
  },
  {
    domain: "redemptioncase.net",
    availability: "registered",
    registrar: "Example Registrar, Inc.",
    createdAt: at(-3300),
    expiresAt: at(-58),
    statuses: ["redemptionPeriod"],
    nameservers: [],
    demonstrates: "In redemption, which is what the Expired Registration Recovery Policy governs.",
  },
  {
    domain: "maplegrove.ca",
    availability: "registered",
    registrar: "Example Canadian Registrar Ltd.",
    createdAt: at(-1100),
    expiresAt: at(160),
    statuses: ["ok"],
    nameservers: ["ns1.example-dns.ca", "ns2.example-dns.ca"],
    demonstrates:
      "A .ca, and therefore CIRA's Canadian Presence Requirements. Named in four of the six client documents, and .ca is NOT in EXTENSIONS yet: this fixture exists to keep that gap visible.",
  },
  {
    domain: "shieldedname.com",
    availability: "registered",
    registrar: "Example Registrar, Inc.",
    createdAt: at(-900),
    expiresAt: at(95),
    statuses: ["ok", "clientTransferProhibited"],
    nameservers: ["ns1.example-privacy.net", "ns2.example-privacy.net"],
    demonstrates:
      "Behind a privacy service, which is the normal modern answer and the reason the page must not promise registrant contact details.",
  },
  {
    domain: "lockedtransfer.org",
    availability: "registered",
    registrar: "Example Registrar, Inc.",
    createdAt: at(-1800),
    expiresAt: at(300),
    statuses: ["clientTransferProhibited", "clientUpdateProhibited", "clientDeleteProhibited"],
    nameservers: ["ns1.example-dns.net", "ns2.example-dns.net"],
    demonstrates: "Locked three ways: a transfer in would fail until the owner unlocks it.",
  },
  {
    domain: "unverifiable-example.com",
    availability: "unknown",
    registrar: null,
    createdAt: null,
    expiresAt: null,
    statuses: [],
    nameservers: [],
    demonstrates: "The honest miss, kept from the original sample table.",
  },
  {
    domain: "available-example.com",
    availability: "available",
    registrar: null,
    createdAt: null,
    expiresAt: null,
    statuses: [],
    nameservers: [],
    demonstrates: "Kept: it is the domain every existing note, probe and link uses.",
  },
  {
    domain: "registered-example.com",
    availability: "registered",
    registrar: "Example Registrar, Inc.",
    createdAt: at(-2700),
    expiresAt: at(190),
    statuses: ["clientTransferProhibited", "clientUpdateProhibited"],
    nameservers: ["ns1.example-dns.net", "ns2.example-dns.net"],
    demonstrates: "Kept for the same reason as the one above.",
  },
];

/** Every fixture as a record, keyed by domain. `sample` is true: none of this is a real lookup. */
export const WHOIS_FIXTURES: Record<string, DomainRecord> = Object.fromEntries(
  FIXTURES.map((f) => {
    const { demonstrates: _demonstrates, ...rest } = f;
    return [rest.domain, { ...rest, checkedAt: FIXTURE_EPOCH, sample: true as const }];
  }),
);

/** The domains a visitor can actually try, for the page's own "try one of these" line. */
export const FIXTURE_DOMAINS: string[] = FIXTURES.map((f) => f.domain);

// The site's content in one place: the name, the navigation, the extensions sold, the price
// ladder, the fees, the contact details. Pages render from here and nowhere else, so when the
// client sends the real material (see TRIAGE.md) it lands in one file.
//
// HOW TO LAND THE CLIENT'S DATA. Every outstanding item is one entry in SUPPLIED below. The
// paste is: replace the values, flip the flag. Nothing outside this file needs an edit:
//
//   1. The business name and mark    -> SITE.name, then scripts/rename-fork.sh in the mother.
//   2. The prices                    -> `ladder` in packages/shared/catalog.json, ten numbers, flat across every extension and
//      every service. This is the reference site's ladder, copied on the client's instruction
//      (18 Sep 2026). If CDR ever prices by extension instead, that is a shape change here and
//      in priceForTerm(), not a second table bolted alongside: the per-extension table that
//      stood until 18 Sep is exactly how the site ended up able to look a domain up and then
//      refuse to sell it.
//   3. The extension list            -> EXTENSIONS. One row per extension, tier sorts it into
//      the two lists on /search. POPULAR_TLDS and NEW_TLDS are derived from it.
//   4. The currency                  -> SITE.currency, an ISO 4217 code. Symbol and grouping
//      follow from it; nothing hardcodes a dollar sign. Canada sees CAD (src/data/regions.ts).
//   5. Contact details               -> CONTACT.
//   6. Legal wording                 -> src/app/(site)/tos/page.tsx, which is a shell.
//
// THE PRICES ARE THE ONE EXCEPTION: they live in packages/shared/catalog.json, which the API
// (apps/api) reads too, so the price charged is the price shown.

import catalog from "@cdr/shared/catalog.json";

/**
 * What the client still owes, and whether it has arrived. Flip a flag with the value it
 * describes, in the same edit: the flags are what the site reads to decide whether to caveat
 * itself, so a flag left false on real data understates the site and a flag flipped early
 * publishes a sample as fact.
 */
export const SUPPLIED = {
  /** The business name. Supplied 31 Aug 2026 by the client's six legal documents. The MARK is
   *  still outstanding: the fork wears the studio icon (assets audit AS-6). */
  name: true,
  /** The price ladder. Confirmed by the client 27 Sep 2026: keep the current ladder. */
  prices: true,
  /** USD, and CAD for Canada at the same figures (client, 28 Sep 2026: "dollar for dollar"). */
  currency: true,
  /** Email, phone, hours, postal address. */
  contact: false,
  /** The terms of service wording. */
  legal: false,
} as const;

export type SuppliedKey = keyof typeof SUPPLIED;

const OUTSTANDING_LABEL: Record<SuppliedKey, string> = {
  name: "Business name and mark",
  prices: "Extension list and prices",
  currency: "Trading currency",
  contact: "Contact details",
  legal: "Terms of service wording",
};

/** The outstanding items, in the order a client would send them. Empty means nothing is pending. */
export function outstanding(): { key: SuppliedKey; label: string }[] {
  return (Object.keys(SUPPLIED) as SuppliedKey[])
    .filter((k) => !SUPPLIED[k])
    .map((k) => ({ key: k, label: OUTSTANDING_LABEL[k] }));
}

const NAME = "Corporate Domain Registry";

export const SITE = {
  /** Decision 3 in TRIAGE: the brief never names the company. Neutral until SUPPLIED.name. */
  name: NAME,
  /**
   * The accessible name of the header's logo link. ONE NAME SINCE 19 SEP 2026 (owner, after the
   * client's team met): the business is "Corporate Domain Registry" everywhere a person reads it.
   * This read "Domain registry" from 31 Aug, a shorter header wordmark the owner chose while the
   * mark was still type; the client's new lockups spell the full name, so the two strings are
   * the same again. The REPO, the Vercel project and the Blob store stay `domain-services`:
   * that is infrastructure nobody visits, and renaming it (scripts/rename-fork.sh in the
   * mother) moves URLs, the HQ card and the store, so it is its own job, not a copy edit.
   */
  wordmark: NAME,
  tagline: "A boutique domain provider for secure registrations, renewals, transfers and everything around a domain.",
  /** ISO 4217. Drives every price on the site; see SUPPLIED.currency. */
  currency: "USD",
  /**
   * Copyright line, the footer's one sentence. Reads the name so a rename carries here too.
   *
   * THE RANGE OPENS AT 2011 ON THE CLIENT'S INSTRUCTION (feedback sheet, 9 Sep 2026: "let's put
   * 2011-2026 to show legitimacy that we are old"). A copyright range states when the work was
   * first published, so this is the client asserting the business has been trading since 2011,
   * not a design choice. It is theirs to assert and theirs to be right about; the six legal
   * documents supplied on 31 Aug do not give an incorporation date either way.
   *
   * The closing year is DERIVED, never typed. A hardcoded "2026" is correct for eleven weeks and
   * then quietly ages the site it was meant to make look current.
   */
  copyright: `© 2011-${new Date().getFullYear()} ${NAME}. All rights reserved.`,
} as const;

/** The primary navigation: a route tab strip, the whole site in five words. */
export const NAV_TABS = [
  { label: "Search", href: "/search" },
  { label: "Whois", href: "/whois" },
  { label: "Contact", href: "/contact" },
  { label: "Terms of service", href: "/tos" },
] as const;

export type Service = "register" | "transfer" | "renew";

/** The cards under the home page search: REGISTER AND RENEW ONLY (owner call, 4 Sep 2026).
 *
 * There were three, one per service. The reference site carries exactly two, Register and Renew,
 * and does not surface transfer as a card at all -- verified in a real browser and confirmed by
 * the owner independently. Two is also the honest count now that renewal and transfer are ONE
 * action at the search result (see SearchPanel's header): a third card would advertise a choice
 * the flow no longer asks anyone to make.
 *
 * TRANSFER IS NOT RETIRED. /transfer is still a real page with its own heading, still reachable,
 * and a taken domain still offers transfer at the result. It simply stops being a front-door
 * card, exactly as on the reference. CDR sells the service; the home page just does not ask a
 * visitor to self-classify before they have searched anything.
 */
export const SERVICES: { id: Service; title: string; copy: string; action: string }[] = [
  {
    id: "register",
    title: "Register a domain",
    copy: "Grab a new domain for that project you have been working on, and secure your online presence.",
    action: "Register",
  },
  {
    id: "renew",
    title: "Renew your domain",
    copy: "Renew the domains you already hold to keep your website online and available to everyone.",
    action: "Renew",
  },
];

/* THE PRICE LADDER, one to ten years, FLAT ACROSS EVERY EXTENSION AND EVERY SERVICE.
 *
 * These are the reference site's own published figures ($60 / 115 / 165 / 215 / 265 / 305 / 345 /
 * 375 / 405 / 430), and copying them is the client's instruction, relayed 18 Sep 2026: "we need to
 * copy those same prices". An earlier pass measured the same ladder off bltz.com and deliberately
 * did NOT copy it, on the reasoning that CDR's prices are the client's to set. The client has now
 * set them, by pointing at these.
 *
 * FLAT IS THE WHOLE POINT, not a simplification. The table this replaced priced each extension
 * separately, which meant an extension absent from the table had NO price, which meant the site
 * could show a visitor a real registration record for maplegrove.ca and then refuse to sell them
 * anything, because .ca was not a row. That was the client's "the search isn't working" in its
 * actual mechanical form. A flat ladder cannot produce it: every domain a visitor can type has a
 * price, which is exactly how the reference can quote nike.com without a registry feed.
 *
 * EXTENSIONS below keeps the LIST and loses the prices, because the list is still real content
 * (the two cards on /search) and the per-extension prices no longer exist anywhere.
 */
export const TERMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type Term = (typeof TERMS)[number];

/* THE FIGURES LIVE IN catalog.json (packages/shared), because the API prices every cart line itself and must read the same numbers this page shows. */
export const LADDER = Object.fromEntries(
  TERMS.map((t) => [t, catalog.ladder[String(t) as keyof typeof catalog.ladder]]),
) as Record<Term, number>;

/** Extensions the checkout refuses before payment; see catalog.json for why. */
export const NOT_SOLD_ONLINE: readonly string[] = catalog.notSoldOnline;

/** What the card is charged in, whatever the page displays (decision 12 D2). */
export const CHARGE_CURRENCY: string = catalog.chargeCurrency;

/** Five years, the reference's own default selection. */
export const DEFAULT_TERM: Term = 5;

/** What a line costs, in USD, before the region conversion. Never null: every term has a price. */
export function priceForTerm(term: Term): number {
  return LADDER[term];
}

/** Which of the two lists on /search an extension appears in. */
export type Tier = "popular" | "new";

export interface Extension {
  tld: string;
  tier: Tier;
}

/** Every extension the site names on /search. The price no longer lives here; see LADDER. */
export const EXTENSIONS: Extension[] = [
  { tld: ".com", tier: "popular" },
  { tld: ".net", tier: "popular" },
  { tld: ".org", tier: "popular" },
  { tld: ".info", tier: "popular" },
  { tld: ".biz", tier: "popular" },
  { tld: ".guru", tier: "new" },
  { tld: ".club", tier: "new" },
  { tld: ".expert", tier: "new" },
  { tld: ".world", tier: "new" },
  { tld: ".forsale", tier: "new" },
  { tld: ".delivery", tier: "new" },
  { tld: ".rocks", tier: "new" },
  { tld: ".band", tier: "new" },
  { tld: ".nyc", tier: "new" },
];

const byTier = (tier: Tier): string[] => EXTENSIONS.filter((e) => e.tier === tier).map((e) => e.tld);

export const POPULAR_TLDS: string[] = byTier("popular");
export const NEW_TLDS: string[] = byTier("new");

/**
 * What a cart line is FOR. The shop sells registrations and, since Oct 2026, renewals of domains in
 * CDR's own Tucows account (/renew/). Transfers are still arranged by email; their label stays.
 */
export const SERVICE_LABELS: Record<Service, string> = {
  register: "Domain Registration",
  renew: "Domain Renewal",
  transfer: "Domain Renewal / Transfer",
};

/**
 * A money figure with the cents ALWAYS shown, which is what every surface in the checkout flow
 * wants: a running total that flips between "$0" and "$0.00" as items go in reads as a glitch, and
 * the duration options ("5 Years - $265.00") are a price list, where dropping ".00" off some rows
 * and not others makes the column ragged.
 *
 * narrowSymbol so CAD reads "$265.00" rather than "CA$265.00"; the ISO code is appended by the
 * caller where the currency has to be stated, so it is never said twice.
 */
export function money(amount: number, currency: string = SITE.currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** "$18" for a button label, where PriceLabel's muted affix would fight the fill. */
export function formatMoney(amount: number, currency: string = SITE.currency): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

export const FEES = [
  { label: "Redemption fee", amount: 150, note: "Restoring a domain after it has expired and entered redemption." },
  { label: "Transfer", amount: 0, note: "Transfers in are priced as a one year registration of the extension, which extends the domain by a year." },
] as const;

/**
 * The pricing caveat, or null once the client ratifies the ladder as their own. The figures are no
 * longer invented, so the old wording ("sample figures") is no longer true; what is still true is
 * that they were copied from the reference site on the client's say-so and CDR has not sent a
 * price list of its own. Reading the flag rather than a hand-deleted string is the point: nobody
 * has to remember to remove the caveat.
 */
export const PRICES_NOTE: string | null = SUPPLIED.prices
  ? null
  : "Prices follow the ladder the client asked us to match, pending their own price list.";

/**
 * How to reach CDR. Every field here is either the client's own or null: the placeholders that
 * stood before 31 Aug 2026 are gone rather than left in place, because a placeholder is more
 * conspicuous, and more damaging, once it sits under the client's real name. The invented ones
 * were a tel: link to +1 (000) 000-0000 that a visitor could actually tap, and a support-hours
 * commitment the client has never made.
 *
 * TWO ADDRESSES, TWO SCOPES. The documents name them separately and routing between them is not
 * cosmetic: Privacy s.12 makes privacy@ the channel for rights requests, so sending one to
 * support@ contradicts the policy the site is publishing on the same visit.
 */
export const CONTACT = {
  /** Agreement s.22 (customer service and legal notices), Expiry s.7, and the ICANN sheet. */
  email: "support@corporatedomainregistry.com",
  /** Privacy s.12. Privacy and data-rights requests only. */
  privacyEmail: "privacy@corporatedomainregistry.com",
  /** Not in any of the six documents. Null until the client supplies one. */
  phone: null as string | null,
  /** Not in any of the six documents. No hours, no SLA, no response-time commitment anywhere. */
  hours: null as string | null,
} as const;

export interface CorporateAddress {
  /** The country heading, as the reference site prints it. */
  country: string;
  /**
   * The legal entity at this address. Null for now: six documents supply no Inc., Ltd., LLC or
   * numbered company, and inventing one under a real business name is not ours to do. The
   * reference site prints an entity above each street address, so this is a real gap.
   */
  entity: string | null;
  /** One line per printed line. */
  lines: string[];
}

/**
 * The corporate addresses, supplied by the client 31 Aug 2026. They render on /tos under the
 * accordion, which is where the reference site puts them, and not on /contact.
 *
 * TWO COUNTRIES IS THE POINT, and it is why the region chip is substantive rather than
 * decorative: the business operates on both sides of the border, which is also why CIRA and .ca
 * appear throughout the legal documents. Order is Canada first, matching the reference.
 */
export const CORPORATE_ADDRESSES: CorporateAddress[] = [
  {
    country: "Canada",
    entity: null,
    lines: ["100 Mural Street, Suite 100", "Richmond Hill, ON L4B 1J3"],
  },
  {
    country: "United States of America",
    entity: null,
    lines: ["1013 Centre Road, Suite 403S", "Wilmington, DE 19805"],
  },
];

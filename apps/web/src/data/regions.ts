// Where the visitor is, as far as this site cares. TWO rows: Canada, and everybody else.
//
// IT WAS THREE UNTIL 19 SEP 2026. The third row, International, existed because the reference
// (bltz.com) ships CA.png and US.png and nothing else, falls back to an American flag captioned
// with the real country code, and so shows a German visitor an American flag labelled DE. An
// honest globe and the word International avoided that. The client's team met and decided the
// opposite on purpose: a visitor in Canada gets the Canadian lockup, the Canadian flag and CAD,
// and EVERY other visitor gets the American lockup, the American flag and USD. That is not the
// reference's bug, because nothing here is captioned with a country it does not match: the chip
// says United States and USD because that is the storefront the visitor is being served, and
// the location panel still reports the country the edge actually saw.
//
// THE CURRENCY CHANGES WITH IT: Canada sees CAD, everyone else USD (owner, 18 Sep 2026). bltz
// labels its chip CAD and then shows byte-identical dollar figures a click later, a currency
// label over unconverted numbers; that is the failure to avoid, not the feature.
//
// SO THE CONVERSION IS REAL AND STATED. FX_RATE below is a single declared rate with the date it
// was set, prices are held in USD and converted at render, and the panel says what rate was used.
//
// SETTLED 28 SEP 2026: Canada is charged in CAD, at the same figures (see FX_RATE).
//
// NOBODY IS BLOCKED. Considered and rejected on the owner's own question, 31 Aug 2026: the site
// sells gTLDs with no residency requirement anywhere, geo-IP is wrong often enough (VPNs, mobile
// carriers, hotel NAT) to turn away real customers with no error they can act on, bltz itself
// answers 200 to every country probed, and the owner is travelling on shared NAT and would be
// blocked by his own site. Where the business operates is a sentence on /contact, not a gate.

export type RegionCode = "US" | "CA";

export interface Region {
  code: RegionCode;
  /** The label in the chip and in the picker. */
  label: string;
  /** ISO 4217. All three are USD today; see the header. */
  currency: string;
  /** ISO 3166-1 alpha-2 codes that resolve to this region. Empty for the fallback. */
  countries: string[];
}

export const REGIONS: Region[] = [
  { code: "US", label: "United States", currency: "USD", countries: ["US"] },
  { code: "CA", label: "Canada", currency: "CAD", countries: ["CA"] },
];

/**
 * USD to CAD, declared once, with the day it was set.
 *
 * DOLLAR FOR DOLLAR IS THE CLIENT'S RULE (Iqbal, 28 Sep 2026): a Canadian pays the same number in
 * CAD that an American pays in USD ($60 US = $60 CAD). So the rate is 1, the page shows the ladder
 * in CAD for Canada, and the checkout charges the card in CAD (the API's checkout). It is a price
 * list in two currencies, not a conversion, and the page does not describe it as one.
 */
export const FX_RATE: Record<string, number> = { USD: 1, CAD: 1 };
export const FX_RATE_SET = "28 Sep 2026";

/** True while a currency is priced at the same figures as USD (the client's rule for CAD). */
export const isAtParity = (currency: string): boolean => (FX_RATE[currency] ?? 1) === 1;

/** A USD figure in the region's currency. Prices are stored in USD; this is a render-time step. */
export function inRegionCurrency(amountUsd: number, currency: string): number {
  const rate = FX_RATE[currency] ?? 1;
  // Rounded to the cent, not to the dollar: a converted price that ends in .00 reads as a native
  // price, and this one is not.
  return Math.round(amountUsd * rate * 100) / 100;
}

// Everybody who is not in Canada, and everybody the edge could not place.
export const DEFAULT_REGION: RegionCode = "US";

/** The key the visitor's own choice is stored under. A manual pick beats geo, permanently. */
export const REGION_STORAGE_KEY = "domain-services-region";

export function regionOf(code: RegionCode): Region {
  return REGIONS.find((r) => r.code === code) ?? REGIONS[0];
}

/** Maps an ISO country from the edge to one of the three rows. Unknown and null both fall to INT. */
export function regionForCountry(country: string | null | undefined): RegionCode {
  if (!country) return DEFAULT_REGION;
  const upper = country.toUpperCase();
  const hit = REGIONS.find((r) => r.countries.includes(upper));
  return hit ? hit.code : DEFAULT_REGION;
}

export function isRegionCode(value: unknown): value is RegionCode {
  return typeof value === "string" && REGIONS.some((r) => r.code === value);
}

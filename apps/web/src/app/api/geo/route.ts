import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* Where the visitor appears to be, for the header chip and its location panel.
 *
 * WHY A ROUTE AND NOT headers() IN A PAGE. Reading this inside a page component would opt that
 * route out of prerendering and, worse, put one visitor's location into cacheable HTML: cache a
 * Canadian visitor's page at the edge and the next American is served it. Isolating the facts in
 * their own uncached endpoint keeps every page location-free and statically cached, so that
 * failure is structurally impossible rather than merely unlikely.
 *
 * IT RETURNS THE IP NOW, AND THE PREVIOUS COMMENT HERE WAS WRONG ABOUT WHY NOT (18 Sep 2026).
 * It read: "bltz shows one in its chip, which is a privacy smell with no user value, and it gets
 * it wrong anyway: the value there is constant across visitors because it is bltz's own host
 * address." The reference's panel, captured this day, reads HOST bltz.com, IP 50.100.225.148,
 * City Thornhill, State ON, Country CA. Thornhill is adjacent to the client's own Richmond Hill
 * office, so that is the VISITOR being detected correctly, not the host. The claim was asserted,
 * never measured, and it was used to justify withholding a field the client had asked for.
 *
 * HOST is the SITE's hostname, not the visitor's. The reference labels it in a way that reads as
 * though it were part of "Your Location"; it is the domain you are looking at, which is the
 * legitimacy point the client is making ("to show legitimacy"). Kept, because that is the design
 * being copied, and named honestly in the panel rather than implied.
 *
 * SHOWING SOMEBODY THEIR OWN IP IS NOT A DISCLOSURE. It is their own data, handed back to the
 * browser that sent it. What would be a disclosure is keeping it, so: no logging, no storage, no
 * analytics, and `no-store` so it never sits in a cache. The beacon in this fork does not receive
 * it and must not be changed to.
 *
 * NOTHING IS PRICED OR GATED ON THE COUNTRY. It selects a currency for DISPLAY; a spoofed header
 * changes which figure a visitor reads, not what anything costs.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET(request: NextRequest) {
  // x-forwarded-for is a comma-separated chain; the visitor is the FIRST entry. Taking the last,
  // or the whole string, yields a proxy address and a panel that is confidently wrong.
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;

  return NextResponse.json(
    {
      country: request.headers.get("x-vercel-ip-country") || null,
      // Vercel percent-encodes these, because a city name can carry a non-ASCII character that is
      // not legal in a header value. Decoding failure is survivable: show the raw value.
      city: decodeOrRaw(request.headers.get("x-vercel-ip-city")),
      region: decodeOrRaw(request.headers.get("x-vercel-ip-country-region")),
      ip,
      host: request.headers.get("host") || null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

function decodeOrRaw(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

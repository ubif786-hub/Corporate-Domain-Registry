import type { MetadataRoute } from "next";

// Generated once at build time, so the static export can carry it as a file.
export const dynamic = "force-static";
import { comingSoonRobots, isComingSoonGated } from "@/comingSoon";

// The kit routes (/components, /style-guide) already carry a page-level noindex, so this stays
// permissive rather than repeating them as disallow rules: a noindex a crawler can read beats a
// disallow that only stops it looking.
//
// /cart and /login are disallowed here instead, because those are the two surfaces where
// crawling costs something: a crawler in the cart burns budget on a dead end, and /login is a
// signed-out form that is never an answer to a search.
import { SITE_URL as BASE } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  // While the holding page is up it is the only page a crawler is told about, and no sitemap is
  // published: a sitemap whose every entry redirects says the site is broken, not unlaunched.
  if (isComingSoonGated()) return comingSoonRobots(BASE);
  return {
    rules: [
      // The wildcard first, then the answer-engine crawlers BY NAME. The wildcard already
      // allows them; naming them means a later decision to disallow some other bot cannot
      // catch these by accident (the zafiro pattern, adopted fleet-wide 17 Sep 2026).
      { userAgent: "*", allow: "/", disallow: ["/cart", "/login"] },
      { userAgent: "GPTBot", allow: "/", disallow: ["/cart", "/login"] },
      { userAgent: "ClaudeBot", allow: "/", disallow: ["/cart", "/login"] },
      { userAgent: "PerplexityBot", allow: "/", disallow: ["/cart", "/login"] },
      { userAgent: "Google-Extended", allow: "/", disallow: ["/cart", "/login"] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}

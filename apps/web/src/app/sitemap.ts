import type { MetadataRoute } from "next";

// Generated once at build time, so the static export can carry it as a file.
export const dynamic = "force-static";
import { LEGAL_DOCS } from "@/data/legal";

// The sitemap, DERIVED rather than typed where anything drives it.
//
// The six legal instruments come from LEGAL_DOCS, which is already the one list /tos renders its
// panels from and the footer reads. A registrar adds and retires those documents as ICANN policy
// moves, and a hand-typed copy here would be wrong the first time that happened.
//
// WHAT IS DELIBERATELY ABSENT.
//   /cart, /login          transactional surfaces; a crawler landing on either finds a dead end
//                          and a signed-out state, and neither is an answer to a search.
//   /components, /style-guide  the design-system kit routes, dev surfaces that carry a page-level
//                          noindex. A glob over app/ would sweep them, which is why the static
//                          list is written out.
//   /coming-soon           while the gate is up it is the only reachable page, and a sitemap is a
//                          set of pages worth indexing on a finished site. robots.ts declines to
//                          publish this file at all while gated, for the same reason: a sitemap
//                          whose every entry redirects is a set of promises the site is not
//                          keeping.
//
// /register and /transfer ARE listed. They are two named doors onto one search experience, but
// each carries its own canonical and its own title, so each is a real address and the one a person
// searching "transfer a domain" should land on. /renew is NOT: it is hidden (owner, 3 Oct 2026),
// reached only by the link sent to past buyers, and carries a noindex.
//
// BASE is derived (18 Sep 2026); this fork has no custom domain yet (the HQ card carries none).
// When one lands it is NEXT_PUBLIC_SITE_URL and nothing here changes. This used to be a literal,
// and the literal in the llms.txt route named a DIFFERENT host.
import { SITE_URL as BASE } from "@/lib/site-url";

const STATIC_PATHS = [
  { path: "/", priority: 1.0 },
  { path: "/search", priority: 0.9 },
  { path: "/register", priority: 0.9 },
  { path: "/transfer", priority: 0.8 },
  { path: "/whois", priority: 0.8 },
  { path: "/contact", priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...STATIC_PATHS.map(({ path, priority }) => ({ url: `${BASE}${path}`, priority })),
    // Every legal instrument has an address of its own because a legal document gets cited,
    // linked and quoted, and a fragment on a page titled "Terms of service" is not an address.
    ...LEGAL_DOCS.map((doc) => ({ url: `${BASE}${doc.href}`, priority: 0.4 })),
  ];
}

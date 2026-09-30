// The pre-launch gate, in one place because THREE files have to agree about it and a
// disagreement between them is worse than either posture on its own: src/proxy.ts (the
// redirect), src/app/robots.ts (the crawl rule) and src/app/coming-soon/page.tsx (its own
// metadata). Scaffolded by fork-project.sh (promoted from a one-off on a client fork,
// 3 Sep 2026; backfilled to every existing fork 5 Sep 2026). Pattern: FORK_PROTOCOL.md,
// "Coming soon: pre-launch holding page".
//
// OFF BY DEFAULT, AND THAT IS THE WHOLE SAFETY PROPERTY. With no COMING_SOON env var set on
// this fork's Vercel project, isComingSoonGated() returns false and every route below behaves
// exactly as if this file did not exist. Adding this scaffold to an existing live client site
// must never change what that site currently shows.
//
// WHY A FLAG AND NOT A DELETED ROUTE. Launching is then removing one environment variable
// (`vercel env rm COMING_SOON production` from the fork, or the dashboard) and redeploying,
// not a code change, a review and a deploy.
//
// WHERE IT IS SET (5 Sep 2026, the staging model; FORK_PROTOCOL.md, "Staging and production").
// Every fork's Vercel project carries COMING_SOON=1 and a COMING_SOON_PREVIEW_TOKEN on the
// PREVIEW scope permanently: the `staging` branch is where work lands and the client reviews it
// through the preview link, so it is never public. The PRODUCTION scope carries the same pair
// until launch day, then loses COMING_SOON. Development is never set, so localhost is never
// gated.
//
// CHANGING THE VARIABLE NEEDS A REDEPLOY. The proxy reads it per request, but robots.ts and this
// page's metadata are generated at build time, so flipping the variable alone leaves the
// redirect off while robots.txt still says disallow (or the reverse). Redeploy after every
// change (`vercel redeploy <url>`, or a push), do not just edit the variable.
import type { MetadataRoute } from "next";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Is the site behind the holding page? Reads COMING_SOON=1; anything else (unset included) is off. */
export function isComingSoonGated(): boolean {
  return process.env.COMING_SOON === "1";
}

/** The cookie a preview link sets, so the whole site can be walked while gated. */
export const COMING_SOON_PREVIEW_COOKIE = "mw-coming-soon-preview";

/**
 * The query parameter that grants preview access: `?preview=<token>`.
 *
 * The token is a shared secret in the environment rather than a hardcoded string, because a
 * hardcoded one lives in a repo and grants anyone who reads it a walk of an unfinished client
 * site. With no token configured the bypass is OFF, which is the correct failure direction: a
 * misconfigured gate stays shut rather than opening.
 */
export const COMING_SOON_PREVIEW_PARAM = "preview";

export function comingSoonPreviewToken(): string | null {
  const t = process.env.COMING_SOON_PREVIEW_TOKEN;
  return t && t.length >= 8 ? t : null;
}

/**
 * The proxy's matcher, FOR COPYING: everything except Next's own assets, the icons, the OG
 * image and robots.txt. Next reads `config.matcher` statically, so a proxy cannot import this
 * value; it is kept here so the literal in src/proxy.ts has one source to be checked against.
 * Written as a negative lookahead because listing every route goes stale the first time a page
 * is added and fails OPEN when it does.
 */
export const COMING_SOON_MATCHER = "/((?!_next/|.*\\..*).*)";

/**
 * The gate as ONE CALL, so a fork that already runs its own proxy (an admin door, an app
 * login) composes it at the top of its function instead of copying the logic:
 *
 *   const held = comingSoonGateResponse(request);
 *   if (held) return held;
 *   // ...the fork's own checks follow, routed by pathname...
 *
 * Returns the response that ENDS the request while gated (the 307 to /coming-soon, or the
 * cookie-setting redirect that grants a preview), and null when the request may proceed: gate
 * off, already holding, robots.txt, or a valid preview cookie.
 *
 * A composing proxy's `config.matcher` must then cover the whole site (COMING_SOON_MATCHER's
 * value, literally), and its own checks must test the pathname themselves, because the matcher
 * no longer does it for them. See FORK_PROTOCOL.md, "Coming soon: pre-launch holding page".
 */
export function comingSoonGateResponse(request: NextRequest): NextResponse | null {
  if (!isComingSoonGated()) return null;

  const { pathname, searchParams } = request.nextUrl;

  // Already holding, or asking for the machine-readable rule about it.
  if (pathname === "/coming-soon" || pathname === "/robots.txt") return null;

  const token = comingSoonPreviewToken();
  const offered = searchParams.get(COMING_SOON_PREVIEW_PARAM);

  // A valid ?preview=<token> grants the walk and remembers it, then strips the parameter so
  // the address bar and any copied link stay clean.
  if (token && offered === token) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete(COMING_SOON_PREVIEW_PARAM);
    const res = NextResponse.redirect(clean, 307);
    res.cookies.set(COMING_SOON_PREVIEW_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  if (token && request.cookies.get(COMING_SOON_PREVIEW_COOKIE)?.value === token) return null;

  // 307, not 308: this redirect is temporary by definition and must not be cached by a browser
  // past launch. A permanent redirect here would outlive the gate in caches nobody can clear.
  return NextResponse.redirect(new URL("/coming-soon", request.url), 307);
}

/**
 * The crawl rule while gated, for a fork that carries its own src/app/robots.ts: the holding
 * page is the only page that exists to a crawler. First line of `robots()`:
 *
 *   if (isComingSoonGated()) return comingSoonRobots(SITE_URL);
 *
 * No sitemap while gated, deliberately: a sitemap whose every entry redirects tells a crawler
 * the site is broken, not that it is unlaunched.
 */
export function comingSoonRobots(host?: string): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/coming-soon", disallow: "/" }],
    ...(host ? { host } : {}),
  };
}

/**
 * The canonical origin, without a trailing slash. ONE source for every file that names it.
 *
 * This fork carried the origin as a `BASE` constant in THREE files and two of them disagreed:
 * robots.ts and sitemap.ts said domain-services-magenta-web, the llms.txt route said
 * domain-services-pearl. So the two files whose entire job is telling a crawler where the site
 * lives were pointing it at two different hosts. Derived here 18 Sep 2026, the shape zafiro and
 * aicf use.
 *
 * Connecting the client's own domain is now one environment variable, NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://domain-services-magenta-web.vercel.app")
).replace(/\/$/, "");

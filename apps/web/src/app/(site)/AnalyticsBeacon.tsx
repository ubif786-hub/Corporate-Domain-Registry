"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// First-party pageview beacon (reference implementation, 9 Jul 2026).
//
// FORK-OWNED, NOT SYNC UNIT: deploy this file into each fork as
// src/app/(site)/AnalyticsBeacon.tsx, set PROJECT to the fork's hq-data slug,
// and mount <AnalyticsBeacon /> once in the fork's (site)/layout.tsx. One
// mount per root site layout is enough; nested locale segments (e.g. the GMS
// /ar tree) inherit it.
//
// What it does: on every route change, fire-and-forget POST the pathname to
// the mother's central collector. The collector derives country, device, and
// the daily-salted unique hash at the edge; the beacon itself sends nothing
// identifying. No cookies, no localStorage, no persistent identifiers, and it
// respects the browser's Do Not Track signal. While the central store is
// unprovisioned the collector answers 204 and drops the event (dormant).

// OFF IN THE cPANEL BUILD (20 Sep 2026): the collector is the studio's dashboard, and the client's
// hosted copy reports to nobody but the client. The flag is inlined at build time, so the
// exported bundle carries no collector address at all.
const COLLECTOR = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1" ? "" : "https://magentaweb-starter.vercel.app/api/beacon";
const PROJECT = "domain-services";

export function AnalyticsBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    // Analytics opt-out: honor Do Not Track, full stop.
    if (!COLLECTOR) return;
    if (navigator.doNotTrack === "1") return;
    try {
      void fetch(COLLECTOR, {
        method: "POST",
        keepalive: true,
        // Cross-origin fire-and-forget (readilyhome fork day, 14 Jul 2026):
        // an application/json header forces a CORS preflight the collector
        // does not answer, spamming the console on every route change.
        // no-cors plus a simple content type sends the beacon preflight-free;
        // the opaque response is fine, fire-and-forget never reads it.
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          project: PROJECT,
          path: pathname,
          referrer: document.referrer || null,
        }),
      }).catch(() => {
        // Fire-and-forget: a failed beacon is nobody's problem.
      });
    } catch {
      // Analytics never breaks the site.
    }
  }, [pathname]);
  return null;
}

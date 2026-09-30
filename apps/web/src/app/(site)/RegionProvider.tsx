"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_REGION,
  REGION_STORAGE_KEY,
  regionForCountry,
  regionOf,
  type Region,
  type RegionCode,
} from "@/data/regions";

/* Which of the two regions the visitor is in, resolved in the browser.
 *
 * IT ALWAYS ASKS, because there is no longer anything to remember (18 Sep 2026). This used to read
 * a stored manual choice first and skip geo entirely when it found one, which was right while the
 * chip was a picker: a visitor detected wrongly could correct it, and the correction had to stick.
 * The picker came out on the client's instruction the same day, and the early return became a
 * trap. A value written by a feature that no longer exists overrode live detection permanently,
 * with no interface left to clear it, and the first symptom was the new location panel reporting
 * "no location detected" to exactly the people who had used the old picker.
 *
 * So the read is gone and the key is DELETED on sight, because a fork that carries dead state
 * quietly forever is how this recurs the next time somebody reads localStorage.
 *
 * RESOLVED CLIENT SIDE, DELIBERATELY. The alternative is reading the country in a server
 * component, which opts the route out of prerendering and puts a country into cacheable HTML, so
 * one Canadian visitor's cached page can be served to every American behind the same edge node.
 * Keeping the fact in the browser means the HTML is country-free and every page stays statically
 * cached. The cost is that the chip is absent for a beat on first paint, which `ready` hides the
 * same way cart.ready stops the cart flashing 0 then N. That is the right trade.
 */

interface RegionValue {
  code: RegionCode;
  region: Region;
  /** False until the region is resolved, so neither the chip nor the header logo flashes the American form then the Canadian one. */
  ready: boolean;
  /**
   * What the edge saw, for the chip's location panel: city, province, IP, and the site's own
   * host. Null until the fetch lands, and null forever off Vercel, which the panel says plainly
   * rather than rendering blanks.
   *
   * IT IS NEVER PERSISTED. It lives for the life of the page and is asked for again on the next
   * one, because it is the visitor's own data and this site has no reason to keep it.
   *
   * Null off Vercel, where there are no edge headers, and null if the request fails. The panel
   * says that in a sentence rather than rendering five rows of "unknown".
   */
  place: GeoPlace | null;
}

export interface GeoPlace {
  city: string | null;
  region: string | null;
  country: string | null;
  ip: string | null;
  host: string | null;
}

const RegionContext = createContext<RegionValue | null>(null);

export function RegionProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<RegionCode>(DEFAULT_REGION);
  const [ready, setReady] = useState(false);
  const [place, setPlace] = useState<GeoPlace | null>(null);

  useEffect(() => {
    let live = true;

    // Clear the retired picker's key. Nothing reads it any more; leaving it behind means a
    // browser that used the old chip carries a dead value indefinitely.
    try {
      localStorage.removeItem(REGION_STORAGE_KEY);
    } catch {
      /* a private window or a blocked store: nothing to clear */
    }

    // Ask the edge, every time. Every failure path lands on the default region rather than leaving the
    // chip pending forever: an unanswered geo is not an error the visitor can fix.
    // The API (apps/api) answers both forms; the slashed one is what nginx and the static export
    // use everywhere, so it is the one asked for.
    fetch("/api/geo/", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!live) return;
        setCode(regionForCountry(data?.country));
        if (data) {
          setPlace({
            city: data.city ?? null,
            region: data.region ?? null,
            country: data.country ?? null,
            ip: data.ip ?? null,
            host: data.host ?? null,
          });
        }
      })
      .catch(() => {
        /* offline, blocked, or not on Vercel: the default region */
      })
      .finally(() => {
        if (live) setReady(true);
      });

    return () => {
      live = false;
    };
  }, []);

  const value = useMemo<RegionValue>(
    () => ({ code, region: regionOf(code), ready, place }),
    [code, ready, place],
  );
  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion(): RegionValue {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion needs a RegionProvider above it");
  return ctx;
}

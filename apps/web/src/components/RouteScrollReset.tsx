"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSmoothScroll } from "@/components/motion/SmoothScroll";

/* ============================================================
   RouteScrollReset — resets the scroll position to the top on every
   client-side route change. Mount ONCE, in the root layout, inside the
   SmoothScroll provider.

   Why it exists: the app runs ONE window-scoped Lenis instance, created
   once in the root layout's SmoothScroll and never remounted across
   navigations. On a route change Next resets the window to the top, but
   Lenis keeps its internal targetScroll / animatedScroll from the
   previous page and its rAF loop immediately drives the window back to
   that stale offset. The destination page is a different height, so the
   stale offset lands it partway down (or at the bottom when the new page
   is shorter). Telling the window alone to scroll is not enough: Lenis
   owns the scroll and would override it, so the reset goes through
   useSmoothScroll(), which resets Lenis itself and falls back to a
   native window scroll when Lenis is disabled (still dial / reduced
   motion). A URL with a hash is left alone, so in-page anchor deep links
   still land on their section.

   Promoted from the docs-scoped DocsScrollReset (queue: "promote the
   same reset into those layouts") once the stale-scroll surfaced on the
   (site) group too.

   Known trade: the reset also fires on browser back/forward, where
   native behavior would restore the prior scroll. Accepted: Lenis
   already overrides native back-restoration, so there is no working
   restoration to preserve.
   ============================================================ */
export function RouteScrollReset() {
  const pathname = usePathname();
  const { scrollTo } = useSmoothScroll();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) return;
    scrollTo(0, { immediate: true });
  }, [pathname, scrollTo]);

  return null;
}

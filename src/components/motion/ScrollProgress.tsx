"use client";

import {
  CSSProperties,
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { tokenNumber } from "@/components/internal/styles";
import { subscribeMotionActive } from "@/components/internal/motion-active";

/* ============================================================
   ScrollProgress — two scroll-driven exports.

   <ScrollProgressBar /> is a 2px accent bar pinned to the top of the
   viewport that fills left-to-right as the page scrolls. It animates a
   scaleX transform (cheap, compositor-only) written straight to the
   node from a rAF-throttled passive scroll listener, so it never
   triggers a React render. Hidden under prefers-reduced-motion or the
   `still` dial, both read live.

   useScrollProgress(ref?) returns a clamped 0–1 number. With no ref it
   reports whole-page progress (scrollTop over scrollable height). With
   a ref it reports how far that element has travelled through the
   viewport: 0 as its top reaches the viewport bottom, 1 as its bottom
   clears the viewport top. Drive any opacity/transform off the value.
   Under prefers-reduced-motion OR the `still` dial the hook settles at 1
   (the revealed resting state) and never attaches a scroll listener, so
   anything driven off it renders fully visible and still. Both are read
   LIVE (subscribeMotionActive), so flipping the dial settles a mounted
   consumer instead of leaving it scrubbing. The hook honoured PRM but not
   the dial until then, the last member of that class (audit A-059 line,
   carried into the 9 Aug report's section 3, closed with A-107).
   ============================================================ */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/* ---------- ScrollProgressBar ---------- */

const barCss = `
[data-mw-scroll-progress] {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  z-index: var(--z-sticky);
  background: var(--accent-base);
  transform: scaleX(0);
  transform-origin: left center;
  will-change: transform;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  [data-mw-scroll-progress] {
    display: none;
  }
}
/* The still dial hides the bar exactly as reduced motion does. A decorative
   scrub is the clearest thing the dial is supposed to govern, and this was the
   last member of that class still disobeying it (A-107 census). The CSS half
   carries the visual contract on its own, so the hide is right even before
   hydration; the effect below skips the work as well. */
html[data-motion="still"] [data-mw-scroll-progress] {
  display: none;
}
`;

export function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Own ref, not a document query: the query bound to the first match in the
    // document, so a second mounted bar silently drove the wrong node (audit).
    const el = barRef.current;
    if (!el) return;

    // The CSS above hides the bar under reduced motion or the still dial, so
    // skip the scroll wiring rather than drive a display:none node (audit), and
    // pick the change up live rather than only at mount.
    return subscribeMotionActive((active) => {
      if (!active) {
        // The bar is hidden either way; resetting means a flip back starts from
        // the resting scale instead of a stale one for the first frame.
        el.style.transform = "scaleX(0)";
        return;
      }

      let raf: number | null = null;

      const update = () => {
        raf = null;
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        const p = max > 0 ? doc.scrollTop / max : 0;
        el.style.transform = `scaleX(${clamp01(p).toFixed(4)})`;
      };

      const onScroll = () => {
        if (raf !== null) return;
        raf = requestAnimationFrame(update);
      };

      update();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);

      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (raf !== null) cancelAnimationFrame(raf);
      };
    });
  }, []);

  return (
    <>
      <style href="magentaweb-scroll-progress" precedence="default">{barCss}</style>
      <div ref={barRef} data-mw-scroll-progress="" style={barInlineStyle} aria-hidden="true" />
    </>
  );
}

// Inline mirror of the key CSS props so the bar paints correctly on the very
// first frame before the hoisted stylesheet applies (avoids a flash at full
// width). The hoisted CSS owns the reduced-motion hide.
const barInlineStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "2px",
  zIndex: tokenNumber("var(--z-sticky)"),
  background: "var(--accent-base)",
  transform: "scaleX(0)",
  transformOrigin: "left center",
  pointerEvents: "none",
};

/* ---------- useScrollProgress ---------- */

export function useScrollProgress(ref?: RefObject<HTMLElement | null>): number {
  // The resting state resolves in the initializer, not the effect: the old
  // synchronous setProgress(1) in the effect body forced an immediate second
  // render pass (react-hooks/set-state-in-effect). Both conditions are read
  // here, so a page loaded at the still dial starts revealed rather than
  // flashing through 0. The reads are guarded because this client component
  // still renders on the server, where there is no window; the server render
  // starts at 0 either way.
  const [progress, setProgress] = useState(() =>
    typeof window !== "undefined" &&
    (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.getAttribute("data-motion") === "still")
      ? 1
      : 0,
  );

  useEffect(() => {
    return subscribeMotionActive((active) => {
      if (!active) {
        // Settle at the revealed resting state and attach nothing, matching
        // ScrollProgressBar/Parallax/ScrollScene. At mount this agrees with the
        // initializer above, so React bails on the identical value and no
        // second render pass happens; it only does real work on a live flip.
        setProgress(1);
        return;
      }

      let raf: number | null = null;

      const compute = () => {
        raf = null;
        const target = ref?.current;
        if (target) {
          const rect = target.getBoundingClientRect();
          const vh = window.innerHeight || document.documentElement.clientHeight;
          const denom = vh + rect.height;
          setProgress(clamp01(denom > 0 ? (vh - rect.top) / denom : 0));
        } else {
          const doc = document.documentElement;
          const max = doc.scrollHeight - doc.clientHeight;
          setProgress(clamp01(max > 0 ? doc.scrollTop / max : 0));
        }
      };

      const onScroll = () => {
        if (raf !== null) return;
        raf = requestAnimationFrame(compute);
      };

      compute();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);

      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (raf !== null) cancelAnimationFrame(raf);
      };
    });
  }, [ref]);

  return progress;
}

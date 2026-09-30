"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import Lenis from "lenis";

/* ============================================================
   SmoothScroll — the page-level smooth-scroll primitive. Wraps the
   app and runs a single Lenis instance against window scroll, so the
   wheel and trackpad glide with inertia instead of jumping.

   Tied into the system rather than bolted on:
   - prefers-reduced-motion: Lenis is never initialized. The page uses
     native scroll, matching the global reduced-motion contract.
   - motion dial: "still" disables smooth scroll entirely; "gentle" and
     "sharp" tune the lerp (damping) from --mw-scroll-lerp in tokens.css,
     read at runtime. Flip the dial and the instance re-inits live.
   - autoRaf: Lenis owns its own requestAnimationFrame loop; no manual
     rAF wiring here.

   Escape hatch: any scroll container that should keep native scrolling
   (a modal body, a dropdown list, a code block) carries
   data-lenis-prevent. Lenis honors it out of the box; lenis.css adds
   overscroll containment.

   Exposes useSmoothScroll() for programmatic scrollTo. The hook falls
   back to native window scrolling when Lenis is disabled, so callers
   never branch on whether smooth scroll is active.
   ============================================================ */

type ScrollTarget = number | string | HTMLElement;
interface ScrollToOptions {
  offset?: number;
  immediate?: boolean;
  duration?: number;
}

interface SmoothScrollContextValue {
  scrollTo: (target: ScrollTarget, options?: ScrollToOptions) => void;
}

const SmoothScrollContext = createContext<SmoothScrollContextValue | null>(null);

// No provider (or rendered in isolation): degrade to native scrolling so
// callers can use scrollTo unconditionally. Module-level so the hook returns a
// stable identity render-to-render (a fresh object per render re-fired any
// effect depending on it; audit).
const nativeFallback: SmoothScrollContextValue = {
  scrollTo: (target, options) => nativeScrollTo(target, options),
};

export function useSmoothScroll(): SmoothScrollContextValue {
  const ctx = useContext(SmoothScrollContext);
  return ctx ?? nativeFallback;
}

// Native fallback used both by the hook outside a provider and by the provider
// itself whenever Lenis is disabled (still / reduced motion). AUD-10 (1 Sep 2026):
// this branch used behavior:"auto", which DEFERS to the html/body scroll-behavior
// rule — under the still dial that rule was still "smooth", so the reduce path here
// was a measured no-op (>900ms glides) for as long as it existed; the old comment
// claimed the checks "live HERE" and they effectively lived nowhere. Two halves fix
// it: tokens.css now guards html[data-motion="still"] { scroll-behavior: auto }
// (the only thing that can reach native anchor links), and this branch passes
// "instant", which bypasses the CSS rule outright — belt and braces.
function nativeScrollTo(target: ScrollTarget, options?: ScrollToOptions) {
  if (typeof window === "undefined") return;
  const reduce =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.getAttribute("data-motion") === "still";
  const behavior: ScrollBehavior =
    options?.immediate || reduce ? "instant" : "smooth";
  let top = 0;
  if (typeof target === "number") {
    top = target;
  } else {
    const el =
      typeof target === "string"
        ? document.querySelector<HTMLElement>(target)
        : target;
    if (!el) return;
    top = el.getBoundingClientRect().top + window.scrollY;
  }
  window.scrollTo({ top: top + (options?.offset ?? 0), behavior });
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const stop = () => {
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };

    const start = () => {
      // Honor the global reduced-motion contract and the "still" dial: no Lenis,
      // plain native scroll. Re-checked on every (re)start.
      if (reduceQuery.matches) return;
      if (root.getAttribute("data-motion") === "still") return;

      const lerpRaw = getComputedStyle(root)
        .getPropertyValue("--mw-scroll-lerp")
        .trim();
      const lerp = Number.parseFloat(lerpRaw);

      lenisRef.current = new Lenis({
        autoRaf: true,
        lerp: Number.isFinite(lerp) && lerp > 0 ? lerp : 0.1,
      });
    };

    const restart = () => {
      stop();
      start();
    };

    start();

    // Re-init live when the motion dial flips (the MasterControls dials toggle
    // data-motion on <html>) or the OS reduced-motion preference changes.
    const observer = new MutationObserver(restart);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-motion"],
    });
    reduceQuery.addEventListener("change", restart);

    return () => {
      observer.disconnect();
      reduceQuery.removeEventListener("change", restart);
      stop();
    };
  }, []);

  const scrollTo = useCallback(
    (target: ScrollTarget, options?: ScrollToOptions) => {
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(target, options);
      } else {
        nativeScrollTo(target, options);
      }
    },
    [],
  );

  const value = useMemo<SmoothScrollContextValue>(() => ({ scrollTo }), [scrollTo]);

  return (
    <SmoothScrollContext.Provider value={value}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

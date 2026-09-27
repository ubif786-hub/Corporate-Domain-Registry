"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "@carbon/icons-react";
import { useSmoothScroll } from "@/components/motion/SmoothScroll";

/* ============================================================
   BackToTop — the floating return affordance (promoted from the docs-only
   FAB to the system). A fixed accent disc in the bottom-right corner that
   fades and lifts in once the page has scrolled past the threshold, and
   scrolls back to the top on click.

   Tied into the system rather than bolted on:
   - Scrolling rides useSmoothScroll(), so it glides through the live Lenis
     instance when smooth scroll is on and falls back to native scrolling
     when it is not. Under the still dial or prefers-reduced-motion the
     jump is immediate (no animated scroll is ever requested). True since
     AUD-10 (1 Sep 2026): before it, immediate mapped to behavior:"auto",
     which deferred to the un-guarded smooth CSS and glided anyway.
   - The entrance transition reads the motion tokens (duration, ease, and
     the reveal distance for the lift), so the still dial and reduced
     motion collapse it to an instant toggle.
   - Sizing is the AAA touch target (--control-size-touch); colors, shadow,
     and z-order are all semantic tokens.

   Self-contained (own style emission), works in any route group and in
   forks. Chrome that mounts once per surface: layouts (docs, HQ) or the
   kit pages own it; a page never mounts a second one.
   ============================================================ */

export interface BackToTopProps {
  /** Scroll depth in px before the button appears. */
  threshold?: number;
}

export function BackToTop({ threshold = 400 }: BackToTopProps) {
  const [visible, setVisible] = useState(false);
  const { scrollTo } = useSmoothScroll();

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const handleClick = () => {
    // An animated scroll is a motion request: honor the still dial and the
    // OS preference by jumping instead. Lenis is already off in both states,
    // and this keeps the native fallback honest too.
    const immediate =
      document.documentElement.getAttribute("data-motion") === "still" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollTo(0, { immediate });
  };

  return (
    <>
      <style href="magentaweb-back-to-top" precedence="default">{backToTopCss}</style>
      <button
        type="button"
        aria-label="Back to top"
        data-mw-back-to-top=""
        data-visible={visible ? "true" : "false"}
        onClick={handleClick}
      >
        <ChevronUp size={20} aria-hidden="true" />
      </button>
    </>
  );
}

const backToTopCss = `
[data-mw-back-to-top] {
  position: fixed;
  bottom: var(--space-lg);
  /* AUD-2 (4 Sep 2026): a flat --space-lg inset sat inside a Container lg
     page's content edge and landed on body copy, not in a margin. Read from
     --container-width (the same token Container's own "lg" size resolves)
     rather than a hardcoded px: on a viewport wider than the container this
     places the disc in the margin outside the content edge, at a token
     inset from it; once the viewport is narrower than the container the
     first term goes negative and max() falls back to the plain --space-lg
     inset from the viewport edge, so it stays reachable on a phone exactly
     as before. */
  right: max(var(--space-lg), calc((100vw - var(--container-width)) / 2 + var(--space-lg)));
  width: var(--control-size-touch);
  height: var(--control-size-touch);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-full);
  background: var(--accent-base);
  color: var(--text-on-accent);
  box-shadow: var(--shadow-raised);
  cursor: pointer;
  z-index: var(--z-raised);
  opacity: 0;
  transform: translateY(var(--motion-reveal-distance));
  pointer-events: none;
  /* visibility keeps the hidden button out of the tab order; as a discrete
     property it flips after the fade-out and before the fade-in. */
  visibility: hidden;
  transition:
    opacity var(--motion-duration) var(--motion-ease),
    transform var(--motion-duration) var(--motion-ease),
    visibility var(--motion-duration),
    background var(--motion-transition);
}
[data-mw-back-to-top][data-visible="true"] {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
  visibility: visible;
}
[data-mw-back-to-top]:hover {
  /* --accent-hover, not emphasis: emphasis flips to a pale wash in dark and
     turned the white glyph invisible (mirroring audit, 9 Jul). */
  background: var(--accent-hover);
}
[data-mw-back-to-top]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

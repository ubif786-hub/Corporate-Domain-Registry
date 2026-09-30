"use client";

import {
  CSSProperties,
  ElementType,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { polymorphicRef } from "@/components/internal/polymorphic";

/* ============================================================
   RevealBlock — universal reveal wrapper. Fades any child into the
   resolved state on first viewport entry, or immediately on mount.
   Five variants mix opacity with a transform or filter so a single
   wrapper handles fade-only, slide-in, blur-resolve, and scale-in.

   Server-renderable behaviour is not possible (scroll observation
   needs the DOM), so this is a client component. Hoisted CSS handles
   the actual animation via [data-mw-reveal] and [data-revealed]
   attributes; the component only flips the data-revealed boolean.

   Naming note: RevealBlock / RevealText are the VIEWPORT-triggered
   reveal family (trigger="viewport" reverses when content leaves the
   viewport; `once` opts into play-once-and-stay). The similarly named
   Reveal / RevealGroup (Reveal.tsx) are the MOUNT-time entrance beats:
   they play once on mount and rest revealed. A rename is owner-gated
   for the seal (REFACTOR_QUEUE, naming disambiguation entry).
   ============================================================ */

type RevealVariant = "fade" | "fade-up" | "fade-down" | "blur" | "scale";
type RevealTrigger = "mount" | "viewport";

export interface RevealBlockProps {
  children: ReactNode;
  variant?: RevealVariant;
  trigger?: RevealTrigger;
  delay?: number;
  duration?: number;
  /** Play once and stay revealed. Default false: the reveal REVERSES when scrolled out
   *  of view, so re-entering the viewport replays it. Viewport trigger only. */
  once?: boolean;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
}

export function RevealBlock({
  children,
  variant = "fade-up",
  trigger = "viewport",
  delay = 0,
  duration,
  once = false,
  as,
  style,
  className,
}: RevealBlockProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (trigger === "mount") {
      // Defer one frame so the initial pre-revealed style paints first; the
      // attribute flip then triggers the CSS transition.
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    }

    const el = ref.current;
    if (!el) return;

    // REVERSIBLE by default: the reveal follows visibility both ways, so scrolling back
    // replays it (the CSS transition animates both directions off data-revealed). `once`
    // opts back into play-once-and-stay for surfaces where a replay would distract.
    const observer = new IntersectionObserver(
      (entries, obs) => {
        // A fast direction flip can batch out-then-in crossings into one callback;
        // only the newest record reflects actual visibility.
        const entry = entries[entries.length - 1];
        if (once) {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
          }
          return;
        }
        setRevealed(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trigger, once]);

  // duration rides a custom property (like delay), NOT inline transitionDuration:
  // the inline value beat the hoisted transition and kept animating at full
  // length under data-motion="still" (audit; the dial works by collapsing the
  // token the sheet reads).
  const inlineStyle: CSSProperties = {
    ...(delay > 0 && { "--reveal-block-delay": `${delay}ms` }),
    ...(duration !== undefined && { "--reveal-block-duration": `${duration}ms` }),
    ...style,
  };

  return (
    <>
      <style href="magentaweb-reveal-block" precedence="default">{revealBlockCss}</style>
      <Tag
        ref={polymorphicRef(ref)}
        data-mw-reveal=""
        data-variant={variant}
        data-revealed={revealed ? "true" : "false"}
        style={inlineStyle}
        className={className}
      >
        {children}
      </Tag>
    </>
  );
}

const revealBlockCss = `
[data-mw-reveal] {
  transition:
    opacity var(--reveal-block-duration, var(--motion-reveal-duration)) var(--motion-ease),
    transform var(--reveal-block-duration, var(--motion-reveal-duration)) var(--motion-ease),
    filter var(--reveal-block-duration, var(--motion-reveal-duration)) var(--motion-ease);
  transition-delay: 0ms;
  opacity: 0;
}
/* The still dial beats a custom duration prop (the prop is a custom property
   so this sheet rule can win; an inline transitionDuration could not lose).
   The delay dies with it: the delay prop rides an inline custom property, so
   zeroing the real transition-delay here is the only rule that can win, or
   still content sits invisible for the authored delay and pops (A-111). */
html[data-motion="still"] [data-mw-reveal] {
  transition-duration: 0ms;
  transition-delay: 0ms;
}
/* will-change only while hidden: settled content releases its compositor
   layer instead of pinning one forever (audit). */
[data-mw-reveal][data-revealed="false"] {
  will-change: opacity, transform, filter;
}
[data-mw-reveal][data-variant="fade-up"] {
  transform: translateY(var(--motion-reveal-distance));
}
[data-mw-reveal][data-variant="fade-down"] {
  transform: translateY(calc(-1 * var(--motion-reveal-distance)));
}
[data-mw-reveal][data-variant="blur"] {
  filter: blur(var(--motion-reveal-blur));
}
[data-mw-reveal][data-variant="scale"] {
  transform: scale(var(--motion-reveal-scale));
}
/* The delay prop applies on enter only, so an exit is never left waiting on a
   stale delay clock and interrupted reveals converge (mirrors RevealText). */
[data-mw-reveal][data-revealed="true"] {
  opacity: 1;
  transform: none;
  filter: none;
  transition-delay: var(--reveal-block-delay, 0ms);
}
/* No scripting at all (JS off in the browser): the observer that flips data-revealed
   never runs, and until 26 Aug 2026 the content then rested at opacity 0 over a fully
   rendered document (the /studio hero was a blank page). Two attribute selectors on
   purpose: the per-variant transform and filter rules above are (0,2,0) too, so a bare
   [data-mw-reveal] override would win opacity and LOSE transform and filter to them.
   Inside this hoisted, deduped sheet rather than a per-instance <noscript>, which would
   emit one block per mount. A bundle that fails after the browser has scripting is not
   this case and is not covered here. */
@media (scripting: none) {
  [data-mw-reveal][data-revealed="false"] {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
`;

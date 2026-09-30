"use client";

import { CSSProperties, ElementType, useEffect, useRef, useState } from "react";
import { polymorphicRef } from "@/components/internal/polymorphic";

/* ============================================================
   CountUp — animates a number up to its value on mount (or on viewport
   entry): the dashboard KPI "climb". requestAnimationFrame drives it,
   with the duration and easing read from the motion tokens
   (--motion-draw-duration / --motion-ease), so it flows through the
   motion dial and decelerates as it lands. The draw duration is the
   slow, deliberate progressive-draw pace (~3x the reveal fade), shared
   with the chart draw-on-mount.

   REVERSIBLE, like the rest of the viewport-triggered motion family
   (MW-REV-1, [Unreleased]). Until then this was the one primitive that
   LATCHED: it disconnected its observer on first intersection and
   offered no `once` to opt out, which RevealBlock and RevealText both
   do. It now follows visibility both ways, and `once` opts back into
   play-once-and-stay with the family's prop name and semantics.

   The reverse is ANIMATED, never a snap, and that is the whole design.
   A CSS transition (what the reveal family reverses with) runs back
   from wherever it currently is; the numeric analogue is to wind the
   figure DOWN toward `from` at the same pace, from whatever is on
   screen. Three things fall out of that, and they are what make a
   replay safe on a live client site:

     - There is no frame in which the figure jumps discontinuously to a
       wrong value. A visitor never sees a settled "$102,750" become
       "$0" between two paints, which is the failure a naive reset
       produces and the reason this was left as an owner call.
     - A brief scroll-away is cheap. The wind-back is paced by DISTANCE
       (see animateTo), so 300ms away costs ~300ms to recover, not a
       full draw duration crawling over a few units.
     - A full replay only happens after the element has been gone for a
       whole draw duration, by which point it is far off screen, so the
       climb the visitor comes back to reads as the designed entrance,
       not as a figure that broke.

   Hysteresis keeps the wind-back off screen: the climb starts at the
   family's 0.1 ratio, the wind-back waits for the element to be FULLY
   gone (ratio 0). Reversing at the same boundary would tick the figure
   down while its last sliver is still visible, and jitter it either
   side of the line.

   Reduced motion is non-negotiable: prefers-reduced-motion users, and
   the "still" dial, see the final value immediately with no climb.
   Both collapse --motion-draw-duration to 0 (the still dial sets it,
   and the global @media reduce sets it), so a zero duration is the
   instant path; the matchMedia check is the explicit belt-and-braces.

   It renders only the formatted bare number, so it composes inside
   Glance: Glance owns the role styling, colour, and any unit affix,
   CountUp owns the animating figure (<Glance><CountUp value={n} /></Glance>).
   ============================================================ */

type CountUpTrigger = "mount" | "viewport";

// The visibility ratio at which the climb starts. 0.1 matches RevealBlock and RevealText, so
// a CountUp inside a reveal starts counting on the same crossing that fades it in. A structural
// observer threshold, not a visual value, so it is a literal here as it is there.
const ENTER_RATIO = 0.1;

export interface CountUpProps {
  /** The value to count to. */
  value: number;
  /** The value to count from. Defaults to 0. */
  from?: number;
  /** Fixed decimal places. Defaults to 0 (integer KPIs). */
  decimals?: number;
  /** Intl locale for thousands separators etc. Defaults to "en-US". */
  locale?: string;
  /** Animate on mount, or on viewport entry. Defaults to "mount". */
  trigger?: CountUpTrigger;
  /** Climb once and stay at the final value. Default false: the climb REVERSES when the
   *  element leaves the viewport entirely, so re-entering replays it. Viewport trigger only. */
  once?: boolean;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
}

// Resolve a CSS time token ("720ms", "0.72s", "0ms") to milliseconds.
function readMs(el: Element, prop: string): number {
  const v = getComputedStyle(el).getPropertyValue(prop).trim();
  if (v.endsWith("ms")) return parseFloat(v);
  if (v.endsWith("s")) return parseFloat(v) * 1000;
  return parseFloat(v) || 0;
}

// Build a JS easing fn from a CSS easing token: cubic-bezier(...) is solved, anything else
// (linear, or unreadable) is the identity, so the climb is still correct, just unsoftened.
function readEasing(el: Element, prop: string): (t: number) => number {
  const m = getComputedStyle(el).getPropertyValue(prop).match(/cubic-bezier\(([^)]+)\)/);
  if (!m) return (t) => t;
  const [x1, y1, x2, y2] = m[1].split(",").map((n) => parseFloat(n));
  if ([x1, y1, x2, y2].some((n) => Number.isNaN(n))) return (t) => t;
  return cubicBezier(x1, y1, x2, y2);
}

// cubic-bezier(x1,y1,x2,y2) easing: given linear time x (0..1), return the eased progress y.
// Newton-Raphson inverts x(t) to the curve parameter, then samples y. Standard solver.
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-5) break;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return sampleY(Math.max(0, Math.min(1, t)));
  };
}

export function CountUp({
  value,
  from = 0,
  decimals = 0,
  locale = "en-US",
  trigger = "mount",
  once = false,
  as,
  style,
  className,
}: CountUpProps) {
  const Tag = (as ?? "span") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  // The server, and so the no-JS or failed-bundle reader, gets the FINAL figure; the
  // client's first render starts at `from`, where the climb begins. Until 26 Aug 2026 the
  // SSR HTML shipped `from` (0), so /hq/financials read "$0" everywhere until hydration:
  // confidently formatted, wrong. The typeof-document form is deliberate: a plain
  // useState(value) would show the real number on the client's first render and then, for
  // trigger="viewport", visibly reset to `from` and climb when it scrolls into view.
  // suppressHydrationWarning on the Tag (the PageLoader idiom) keeps the server text in
  // the DOM until the first state update.
  const [display, setDisplay] = useState(() => (typeof document === "undefined" ? value : from));
  // The figure currently on screen, as a ref as well as state: state because it must paint,
  // ref because a reversal has to start from what is rendered RIGHT NOW without the effect
  // re-subscribing its observer on every frame.
  const displayRef = useRef(display);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    // Keep the rAF cancel so unmount (or a value change) mid-climb stops the loop
    // (audit: the cancel was discarded, the A-038 class).
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const settle = (n: number) => {
      displayRef.current = n;
      setDisplay(n);
    };

    // Animate the figure from wherever it currently sits to `target`. Interruptible: a new
    // call cancels the running loop and starts from the CURRENT value, so a direction flip
    // reverses rather than snapping, exactly as the reveal family's CSS transition does.
    const animateTo = (target: number) => {
      stop();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const full = readMs(el, "--motion-draw-duration");
      // Reduced motion and the still dial: the FINAL figure, immediately, in both directions,
      // and never a wind-back. A zero-duration reverse is not a reverse, it is a wrong number
      // appearing instantly and waiting on a scroll event to be corrected — the exact flash
      // the SSR contract exists to prevent. There is no climb to replay at 0ms, so holding
      // the figure IS the still form of reversibility.
      if (reduce || full <= 0) {
        settle(value);
        return;
      }
      const start = displayRef.current;
      const span = Math.abs(value - from);
      const distance = Math.abs(target - start);
      if (span === 0 || distance === 0) {
        settle(target);
        return;
      }
      // Paced by DISTANCE, not a fixed duration: the draw token sets the pace over the FULL
      // range, so a partial reversal costs a proportional slice of it. A fixed duration would
      // make a 2% correction crawl for the whole 4745ms and read as a stuck counter.
      const duration = full * (distance / span);
      const ease = readEasing(el, "--motion-ease");
      let startTs = 0;
      raf = requestAnimationFrame(function tick(ts) {
        if (!startTs) startTs = ts;
        const t = Math.min(1, (ts - startTs) / duration);
        displayRef.current = start + (target - start) * ease(t);
        setDisplay(displayRef.current);
        if (t < 1) raf = requestAnimationFrame(tick);
        else {
          settle(target);
          raf = 0;
        }
      });
    };

    if (trigger === "mount") {
      animateTo(value);
      return stop;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        // Newest record, matching the reveal primitives: a batched exit-then-enter must not
        // read a stale non-intersecting entry.
        const entry = entries[entries.length - 1];
        if (once) {
          if (entry.isIntersecting) {
            obs.disconnect();
            animateTo(value);
          }
          return;
        }
        // Two thresholds, not one, and the asymmetry is the point (see the header): the climb
        // starts where the family's reveals start, the wind-back waits until the element is
        // FULLY out of view. Between the two the figure just holds, so an element parked on
        // the viewport edge does not oscillate.
        if (entry.intersectionRatio >= ENTER_RATIO) animateTo(value);
        else if (entry.intersectionRatio === 0) animateTo(from);
      },
      { threshold: [0, ENTER_RATIO] },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [value, from, trigger, once]);

  const formatted = display.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <Tag
      ref={polymorphicRef(ref)}
      data-mw-countup=""
      style={style}
      className={className}
      // Designed server/client divergence: the server carries the final figure, the
      // client's first render the start of the climb (see the initializer).
      suppressHydrationWarning
    >
      {formatted}
    </Tag>
  );
}

"use client";

import { CSSProperties, ReactNode, useEffect, useRef } from "react";
import { subscribeMotionActive } from "@/components/internal/motion-active";

/* ============================================================
   ScrollScene — write-to-node scroll progress.

   Writes a clamped 0-1 `--mw-scene-progress` custom property straight
   to its own node on every rAF scroll frame, with NO React state and
   NO re-render during scroll. That perf pattern is the whole reason
   this exists instead of `useScrollProgress`, which setState's on every
   frame and is the wrong tool for driving many spans. Descendant CSS
   reads the variable to scrub any reveal (opacity, transform, mask).

   FLOW MODE (default): progress is the element's travel through the
   viewport, the same getBoundingClientRect math as useScrollProgress:
   0 as the element's top reaches the viewport bottom, 1 as its bottom
   clears the viewport top.

   PIN MODE (v3.4.0, the generalized process-pin beat): `pin` renders a
   tall runway (`pinLength`, default 200svh) with a sticky, viewport-high
   stage inside. The stage holds still while the visitor scrolls the
   runway, and progress remaps to the runway: 0 as the runway top
   reaches the viewport top (the stage docks), 1 as its bottom meets
   the viewport bottom (the stage releases). Consumer CSS scrubs the
   pinned composition off the same `--mw-scene-progress`; the variable
   lands on the OUTER node, so the stage's descendants read it as
   usual. Pin geometry speaks ONE viewport unit family (svh, v3.8.0):
   the runway default and the 100svh stage share it, and the travel
   math subtracts the stage's measured height rather than
   window.innerHeight, so a mobile dynamic toolbar cannot drift the
   release point away from the sticky handoff.

   Lenis drives window scroll, so reading scroll position tracks it
   with no Lenis coupling, exactly like ScrollProgressBar.

   Motion contract: under prefers-reduced-motion or the `still` dial the
   listener never attaches, so `--mw-scene-progress` stays unset and
   consumer CSS falls back to the fully-revealed state via
   `var(--mw-scene-progress, 1)`. In pin mode the sticky stage still
   pins (position is layout, not motion), but the composition rests
   revealed. SSR and no-JS resolve the same way, so the content is
   always present and readable, motion or not.

   The dial is read LIVE (subscribeMotionActive; A-107). Turning it to
   still mid-scroll REMOVES the written property rather than just
   detaching: the fallback in `var(--mw-scene-progress, 1)` only applies
   while the property is unset, so a stranded value would rest the
   composition at whatever it had scrubbed to and quietly break the
   contract above.
   ============================================================ */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export interface ScrollSceneProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Pin mode: a sticky viewport-high stage inside a tall runway. */
  pin?: boolean;
  /** The runway height in pin mode (how long the stage holds). Keep it in
   *  svh, the pin geometry's one unit family. */
  pinLength?: string;
}

export function ScrollScene({
  children,
  className,
  style,
  pin = false,
  pinLength = "200svh",
}: ScrollSceneProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honor the global motion contract, and honor it LIVE. No scrub under
    // reduced motion or the `still` dial: the variable is unset and consumer
    // CSS rests revealed.
    return subscribeMotionActive((active) => {
      if (!active) {
        // RESTORE, do not merely skip: the fallback only applies while the
        // property is absent, so a value left over from an earlier scrub would
        // pin the composition partly revealed for as long as the dial stays
        // still.
        el.style.removeProperty("--mw-scene-progress");
        return;
      }

      let raf: number | null = null;

      const update = () => {
        raf = null;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        let p: number;
        if (pin) {
          // Pin: progress through the runway while the stage holds. The travel
          // is the runway height minus the docked stretch, and the docked
          // stretch is the sticky stage's MEASURED height (100svh), not
          // window.innerHeight: one svh unit family end to end, so mobile
          // dynamic toolbars cannot drift the release point (QA deferral 3).
          const stageH =
            (el.firstElementChild as HTMLElement | null)?.getBoundingClientRect()
              .height ?? vh;
          const travel = rect.height - stageH;
          p = travel > 0 ? -rect.top / travel : 1;
        } else {
          const denom = vh + rect.height;
          p = denom > 0 ? (vh - rect.top) / denom : 0;
        }
        el.style.setProperty("--mw-scene-progress", clamp01(p).toFixed(4));
      };

      const onScroll = () => {
        if (raf !== null) return;
        raf = requestAnimationFrame(update);
      };

      // Write the initial value before paint-driven scrolling so the node always
      // carries a real progress, not just after the first scroll event.
      update();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);

      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (raf !== null) cancelAnimationFrame(raf);
      };
    });
    // Re-subscribe on a pin flip: rare (a mode choice, not a live toggle), and
    // the math differs per mode.
  }, [pin]);

  if (!pin) {
    return (
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <div ref={ref} className={className} style={{ ...style, height: pinLength }}>
      {/* The stage: sticky, one viewport tall, holding while the runway scrolls.
          Structural values only; the composition inside is the consumer's. */}
      <div style={stageStyle}>{children}</div>
    </div>
  );
}

const stageStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  height: "100svh",
  overflow: "hidden",
};

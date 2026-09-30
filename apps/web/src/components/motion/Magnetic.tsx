"use client";

import {
  CSSProperties,
  ElementType,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { polymorphicRef } from "@/components/internal/polymorphic";
import { subscribeMotionActive } from "@/components/internal/motion-active";

/* ============================================================
   Magnetic — pulls its child toward the pointer. While the cursor is
   within `range` px of the element's centre, the child translates by
   the offset scaled by `strength` (0–1); past that radius it springs
   back to origin. A CSS transition on transform does the easing for
   both the follow and the release, so the motion dial governs the
   feel and prefers-reduced-motion can zero it out cleanly.

   Pairs naturally with the Cursor primitive: the dot grows over the
   button while the button drifts to meet it. The wrapper is an
   inline-block so it hugs the child (a Button, a link) rather than
   spanning the line.

   Pointer tracking listens on the window (not just the element) so
   the pull begins as the cursor approaches, before it is even over
   the target. The listener is rAF-throttled and never attaches under
   reduced motion or the `still` dial, and it detaches LIVE when either
   turns on mid-session (subscribeMotionActive; A-107).
   ============================================================ */

export interface MagneticProps {
  children: ReactNode;
  // 0 = no pull, 1 = child tracks the cursor 1:1. 0.3 is a subtle premium drift.
  strength?: number;
  // Activation radius in px, measured from the element centre.
  range?: number;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
}

export function Magnetic({
  children,
  strength = 0.3,
  range = 100,
  as,
  style,
  className,
}: MagneticProps) {
  const Tag = (as ?? "span") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return subscribeMotionActive((active) => {
      // Rest is the untransformed element, and the teardown below restores it,
      // so going inactive needs nothing beyond not attaching.
      if (!active) return;

      el.style.willChange = "transform";
      let lastX = 0;
      let lastY = 0;
      // The applied translate, subtracted before measuring: rects include our
      // own (mid-transition) transform, which diluted strength to s/(1+s) and
      // measured range from the displaced center (audit).
      let appliedX = 0;
      let appliedY = 0;

      const apply = () => {
        rafRef.current = null;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2 - appliedX;
        const cy = rect.top + rect.height / 2 - appliedY;
        const dx = lastX - cx;
        const dy = lastY - cy;
        if (Math.hypot(dx, dy) < range) {
          appliedX = dx * strength;
          appliedY = dy * strength;
          el.style.transform = `translate3d(${appliedX.toFixed(2)}px, ${appliedY.toFixed(2)}px, 0)`;
        } else {
          appliedX = 0;
          appliedY = 0;
          el.style.transform = "translate3d(0, 0, 0)";
        }
      };

      const onMove = (e: MouseEvent) => {
        lastX = e.clientX;
        lastY = e.clientY;
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(apply);
      };

      window.addEventListener("mousemove", onMove, { passive: true });

      return () => {
        window.removeEventListener("mousemove", onMove);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        el.style.willChange = "";
        el.style.transform = "";
      };
    });
  }, [strength, range]);

  const merged: CSSProperties = {
    display: "inline-block",
    transition: "transform var(--motion-transition)",
    ...style,
  };

  return (
    <Tag ref={polymorphicRef(ref)} style={merged} className={className}>
      {children}
    </Tag>
  );
}

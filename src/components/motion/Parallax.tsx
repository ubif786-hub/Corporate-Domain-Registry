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
   Parallax — scroll-driven translate. The element shifts relative to
   viewport scroll, multiplied by (1 - speed) so speed=0.5 means the
   element moves at half page speed (lags behind the scroll), and
   speed=-0.5 means it leads (moves opposite direction).

   Listener runs on the window scroll event, throttled via
   requestAnimationFrame. Under prefers-reduced-motion or the `still`
   dial the listener never attaches and the wrapper renders inert, and
   it detaches LIVE when either turns on mid-session
   (subscribeMotionActive; A-107).

   will-change: transform is added on first attach so the compositor
   promotes the element to its own layer for smooth scrolling.
   ============================================================ */

type ParallaxAxis = "y" | "x";

export interface ParallaxProps {
  children: ReactNode;
  speed?: number;
  axis?: ParallaxAxis;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
}

export function Parallax({
  children,
  speed = 0.5,
  axis = "y",
  as,
  style,
  className,
}: ParallaxProps) {
  const Tag = (as ?? "div") as ElementType;
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
      // The applied translate, tracked so measurement can subtract it: rects
      // include the element's own transform, and measuring the displaced
      // position fed the offset back into itself (audit: steady state converged
      // to (1-speed)/(2-speed) instead of the documented (1-speed), and the
      // resting offset depended on scroll-event cadence).
      let applied = 0;

      const update = () => {
        rafRef.current = null;
        const rect = el.getBoundingClientRect();
        const viewportCenter = window.innerHeight / 2;
        // Subtract the applied Y translate: an x-axis translate never moves
        // rect.top, so only the y axis needs the correction.
        const elementCenter =
          rect.top + rect.height / 2 - (axis === "y" ? applied : 0);
        const offsetFromCenter = elementCenter - viewportCenter;
        const translate = offsetFromCenter * (1 - speed) * -1;
        applied = translate;
        el.style.transform =
          axis === "y"
            ? `translate3d(0, ${translate.toFixed(2)}px, 0)`
            : `translate3d(${translate.toFixed(2)}px, 0, 0)`;
      };

      const onScroll = () => {
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(update);
      };

      update();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);

      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        el.style.willChange = "";
        el.style.transform = "";
      };
    });
  }, [speed, axis]);

  return (
    <Tag ref={polymorphicRef(ref)} style={style} className={className}>
      {children}
    </Tag>
  );
}

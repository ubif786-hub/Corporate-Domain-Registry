"use client";

import {
  CSSProperties,
  ReactNode,
  RefObject,
  useEffect,
  useRef,
} from "react";

/* ============================================================
   TopLayerPanel — Phase 3 nav shared mechanic (NAV_PLAN.md, "the spine").

   Renders a floating panel in the browser top layer via the Popover API.
   A shown popover is promoted to the top layer, which paints above all
   page content and is NOT subject to any ancestor's stacking context
   (isolation: isolate), transform containing block, or overflow clip. That
   is the structural fix for the /components showroom bleed-through: a demo
   frame's isolate boundary can no longer trap the panel, so no z-index
   tuning and no portal are needed. The same mechanism carries the
   production Nav's dropdown and mega, and (with the shared overlay contract
   layered on by a consumer) the drawer.

   Controlled by `open`, synced imperatively to showPopover / hidePopover in
   an effect. Each call is guarded by the current :popover-open match because
   showPopover / hidePopover throw if called in the wrong state.

   Positioning (the JS bar-aligner): a popover defaults to viewport-centred
   (the UA [popover] rule). When `anchor` is given, a rAF-throttled
   positioner writes fixed position / top / left so the panel aligns to the
   anchor and follows it on scroll and resize (same getBoundingClientRect
   idiom as Parallax). `placement` picks the edge alignment, or centres the
   panel on the anchor's midpoint (below-center, the Tooltip chip position),
   always clamped inside the viewport with a small inset; matchAnchorWidth
   caps the panel to the anchor's width (the bar cap for a mega). Position is
   computed in JS rather than with CSS anchor positioning, which is still
   Chromium-only in 2026, so the alignment holds cross-engine.

   Motion: tokenised opacity / translate on :popover-open, with @starting-
   style for the enter and the display / overlay transitions marked
   allow-discrete so the top-layer enter and exit both animate.
   prefers-reduced-motion collapses it through the global token reset.

   NOT here: focus trap and scroll lock. A modal consumer (the drawer) layers
   the shared overlay contract (useDialogOverlay) on top. This primitive owns
   only top-layer render and anchored position, so dropdown, mega, and drawer
   share one render mechanism.
   ============================================================ */

type Placement = "below-start" | "below-end" | "below-center";

export interface TopLayerPanelProps {
  /** Controlled visibility. */
  open: boolean;
  children: ReactNode;
  /** Element to position against. Without it the UA-centred popover position is kept. */
  anchor?: RefObject<HTMLElement | null>;
  /** Edge alignment relative to the anchor. "below-center" centres the panel on the
      anchor's horizontal midpoint (the Tooltip chip position). */
  placement?: Placement;
  /** Cap the panel's max width to the anchor's width (the bar cap for a mega). */
  matchAnchorWidth?: boolean;
  /** Gap in px between the anchor's bottom edge and the panel. */
  gap?: number;
  /** "auto" enables native light-dismiss (Escape, outside click); "manual" is fully controlled. */
  mode?: "auto" | "manual";
  /** Fired when the browser closes an `auto` popover by light-dismiss, so the controller can sync. */
  onClose?: () => void;
  id?: string;
  role?: string;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

const css = `
[data-mw-toplayer-panel] {
  /* The UA [popover] rule sets border / padding / background and centres the
     panel via margin:auto. Strip the chrome so consumers own the surface; the
     JS positioner sets position when anchored, and the UA centring is kept
     when it is not. */
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  overflow: visible;
  opacity: 0;
  transform: translateY(calc(-1 * var(--motion-reveal-distance)));
  transition:
    opacity var(--motion-duration) var(--motion-ease),
    transform var(--motion-duration) var(--motion-ease),
    display var(--motion-duration) allow-discrete,
    overlay var(--motion-duration) allow-discrete;
}
[data-mw-toplayer-panel]:popover-open {
  opacity: 1;
  transform: translateY(0);
}
@starting-style {
  [data-mw-toplayer-panel]:popover-open {
    opacity: 0;
    transform: translateY(calc(-1 * var(--motion-reveal-distance)));
  }
}
`;

export function TopLayerPanel({
  open,
  children,
  anchor,
  placement = "below-start",
  matchAnchorWidth = false,
  // Mirrors --popover-offset (0.25rem, 4px at a 16px root), the one distance between a
  // control and the panel it owns. This positioner writes px, so the token cannot be read
  // directly; the default matched neither the token nor its own two consumers (both pass 4)
  // until 2 Sep 2026, so a future consumer taking the default silently got 8.
  gap = 4,
  mode = "manual",
  onClose,
  id,
  role,
  className,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: TopLayerPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Sync `open` to the top layer. showPopover / hidePopover throw if called in
  // the wrong state, so each is guarded by the current :popover-open match.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const shown = el.matches(":popover-open");
    if (open && !shown) el.showPopover();
    else if (!open && shown) el.hidePopover();
  }, [open]);

  // Light-dismiss bridge: an `auto` popover can be closed by the browser
  // (Escape, outside click). Mirror that back to the controller so React state
  // does not drift from the DOM.
  useEffect(() => {
    const el = panelRef.current;
    if (!el || !onClose) return;
    const onToggle = (e: Event) => {
      const newState = (e as Event & { newState?: string }).newState;
      if (newState === "closed" && open) onClose();
    };
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, [open, onClose]);

  // The JS bar-aligner. While open and anchored, write fixed position so the
  // panel tracks the anchor on scroll and resize.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const anchorEl = anchor?.current ?? null;
    if (!panel || !anchorEl) return;

    let raf: number | null = null;
    const place = () => {
      raf = null;
      const a = anchorEl.getBoundingClientRect();
      // Override the UA centring and apply the width cap BEFORE measuring, so
      // the panel rect reflects the cap when the left edge is computed.
      panel.style.position = "fixed";
      panel.style.margin = "0";
      panel.style.inset = "auto";
      if (matchAnchorWidth) panel.style.maxWidth = `${Math.round(a.width)}px`;
      const p = panel.getBoundingClientRect();
      const top = a.bottom + gap;
      let left =
        placement === "below-end"
          ? a.right - p.width
          : placement === "below-center"
            ? a.left + (a.width - p.width) / 2
            : a.left;
      // Keep the panel inside the viewport horizontally.
      const maxLeft = window.innerWidth - p.width - gap;
      left = Math.min(Math.max(gap, left), Math.max(gap, maxLeft));
      panel.style.top = `${Math.round(top)}px`;
      panel.style.left = `${Math.round(left)}px`;
    };

    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(place);
    };

    // rAF the first placement so the just-shown popover has its box before we
    // measure it.
    raf = requestAnimationFrame(place);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [open, anchor, placement, matchAnchorWidth, gap]);

  return (
    <>
      <style href="magentaweb-toplayer-panel" precedence="default">
        {css}
      </style>
      <div
        ref={panelRef}
        data-mw-toplayer-panel=""
        popover={mode}
        id={id}
        role={role}
        className={className}
        style={style}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
      >
        {children}
      </div>
    </>
  );
}

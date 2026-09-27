/* ============================================================
   chartInteraction.ts — shared, non-visual geometry helpers consumed
   by every chart in this folder (BarChart, LineChart, StackedBarChart,
   DonutChart). Two problems that were being solved four times,
   independently and inconsistently (audit, 4 Sep 2026):

   1. HOVER TOOLTIP EDGE CLAMPING. Each chart drew its tooltip at a
      fixed offset from the hovered point (centered above it, or for
      DonutChart pushed outward along the segment's mid-angle) with no
      awareness of the plot's own bounds. A point at the left edge of
      the plot centered its tooltip half off the axis gutter, over the
      y-axis tick labels; a point near the bottom pushed it under the
      x-axis category labels; DonutChart's outward push could land the
      tooltip on top of its own adjacent legend. clampTooltipPosition
      fixes this ONCE: given the anchor point, the tooltip's own
      measured size (it cannot be known ahead of layout — its content
      changes per hovered point) and the rectangle it must stay inside,
      it returns a literal top-left position, preferring the existing
      convention (centered above the anchor, GAP px clear of it),
      flipping to below when there's no room above, and sliding
      horizontally only as far as the bounds force it to.

   2. CATEGORY-AXIS LABEL THINNING at the mobile breakpoint (A2, owner
      decision 5 Sep 2026: thin, not rotate or truncate). Below
      --mw-bp-tablet, BarChart, LineChart and StackedBarChart show
      every second category label; the full set renders at tablet and
      above. readTabletBreakpoint reads the token at runtime rather
      than hardcoding it a second time, so the breakpoint tokens in
      tokens.css stay the single source of truth even here, where a
      CSS @media query (which cannot read a custom property at all)
      isn't in play — this is plain JS driven by the same width state
      each chart's ResizeObserver already keeps.
   ============================================================ */

export interface TooltipAnchor {
  x: number;
  y: number;
}

export interface TooltipSize {
  width: number;
  height: number;
}

export interface TooltipBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ClampedTooltipPosition {
  left: number;
  top: number;
  /** The tooltip flipped from above the anchor to below it (no room above). */
  flippedBelow: boolean;
}

// Clearance between the anchor and the tooltip's edge. A plain number for the
// same reason the rest of this file's geometry is (MARGIN in each chart, the
// axis-label offsets of -8 / +18, the donut ring's tip radius +6): pixel-space
// layout arithmetic, not a CSS visual value, so it never was a token candidate.
const GAP = 8;

/**
 * Returns the literal top-left position (no CSS transform needed) for a chart
 * hover tooltip so it never renders outside `bounds`.
 *
 * Vertical: defaults ABOVE the anchor by GAP; flips BELOW when that would
 * clip the top of bounds and there is room below instead. If neither side
 * fully fits (a very short plot), clamps inside bounds rather than letting
 * either edge overflow further.
 *
 * Horizontal: defaults CENTERED on the anchor; slides toward whichever side
 * has room when centering would overflow the bounds.
 */
export function clampTooltipPosition(
  anchor: TooltipAnchor,
  size: TooltipSize,
  bounds: TooltipBounds,
): ClampedTooltipPosition {
  let top = anchor.y - size.height - GAP;
  let flippedBelow = false;
  if (top < bounds.top) {
    const below = anchor.y + GAP;
    if (below + size.height <= bounds.bottom) {
      top = below;
      flippedBelow = true;
    } else {
      // Neither side fully fits: clamp inside bounds rather than overflow further.
      top = Math.min(Math.max(top, bounds.top), Math.max(bounds.top, bounds.bottom - size.height));
    }
  } else if (top + size.height > bounds.bottom) {
    top = Math.max(bounds.top, bounds.bottom - size.height);
  }

  const left = Math.min(
    Math.max(anchor.x - size.width / 2, bounds.left),
    Math.max(bounds.left, bounds.right - size.width),
  );

  return { left, top, flippedBelow };
}

// Fallback matches --mw-bp-tablet in src/app/tokens.css (768px). Used only
// before mount (SSR) or in the unreachable case getComputedStyle can't
// resolve the token; readTabletBreakpoint() otherwise always defers to the
// live token value so tokens.css stays the single source of truth.
const FALLBACK_TABLET_BREAKPOINT = 768;

/**
 * Reads --mw-bp-tablet from the document at call time, in px, so the mobile
 * label-thinning threshold never drifts from the token that defines the
 * tablet breakpoint everywhere else in the system.
 */
export function readTabletBreakpoint(): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return FALLBACK_TABLET_BREAKPOINT;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--mw-bp-tablet");
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : FALLBACK_TABLET_BREAKPOINT;
}

import { CSSProperties } from "react";

/* ============================================================
   Skeleton — the loading placeholder primitive (v4.8.0, promoted after the
   fleet audit found SEVEN hand-rolled pulse loaders across forks: every one
   re-invented the same keyframes, tint, radius, and reduced-motion guard).

   ONE primitive, three shapes — no composite variants by design:
   - "line"  — a text bar (the default): give width; height defaults to a
     text-line rhythm.
   - "block" — a rectangle (cards, media): give height OR aspectRatio.
   - "disc"  — a circle (avatars): give width (the diameter).

   Table-row / card / feed skeletons are COMPOSITIONS of these three, built
   at the call site to mirror the real layout's silhouette — the doc shows
   the recipes. Shipping named composites would freeze one product's layout
   into the system; the reinvention worth killing was the pulse itself.

   The pulse rides a hoisted sheet (keyframes are not expressible inline)
   and collapses under prefers-reduced-motion to a static tint. aria-hidden
   always: a skeleton is never content — callers announce loading on the
   REGION (aria-busy / a live region), not per bone.

   Server component; token-pure (secondary tint, component radius; the disc
   pins --radius-full like Avatar).
   ============================================================ */

export type SkeletonShape = "line" | "block" | "disc";

export interface SkeletonProps {
  /** The silhouette. Default "line" (a text bar). */
  shape?: SkeletonShape;
  /** CSS width. line: the bar length (default 100%); disc: the diameter. */
  width?: string;
  /** CSS height. line defaults to a text-line rhythm; block wants height or aspectRatio. */
  height?: string;
  /** CSS aspect-ratio for block media stand-ins (e.g. "16 / 9"); wins with width. */
  aspectRatio?: string;
}

export function Skeleton({ shape = "line", width, height, aspectRatio }: SkeletonProps) {
  const style: CSSProperties = {
    ...baseStyle,
    ...(shape === "line" ? lineStyle : shape === "disc" ? discStyle : blockStyle),
    ...(width !== undefined ? { width } : null),
    ...(height !== undefined ? { height } : null),
    ...(aspectRatio !== undefined ? { aspectRatio } : null),
    // A disc is a circle: one diameter drives both axes.
    ...(shape === "disc" && width !== undefined ? { height: width } : null),
  };
  return (
    <span aria-hidden="true" data-mw-skeleton="" style={style}>
      <style href="magentaweb-skeleton" precedence="default">{css}</style>
    </span>
  );
}

/* ---------- inline styles (token-pure) ---------- */

const baseStyle: CSSProperties = {
  display: "block",
  background: "var(--background-positive-secondary)",
};

// A text bar: line-height rhythm, small radius so rows read as text, not pills.
const lineStyle: CSSProperties = {
  width: "100%",
  height: "0.75rem",
  borderRadius: "var(--radius-sm)",
};

// A rectangle: the component radius, caller supplies height or aspectRatio.
const blockStyle: CSSProperties = {
  width: "100%",
  borderRadius: "var(--component-radius)",
};

// A circle: pinned full radius (the Avatar precedent — identity reads as a
// disc regardless of the radius dial), control-geometry default diameter.
const discStyle: CSSProperties = {
  width: "var(--control-size-md)",
  height: "var(--control-size-md)",
  borderRadius: "var(--radius-full)",
  flexShrink: 0,
};

const css = `
[data-mw-skeleton] {
  /* Ambient carve-out: the pulse keeps its own tempo at data-motion="still"
     (like Marquee); PRM stops it below. Recorded in REFACTOR_QUEUE Known
     design choices. */
  animation: mw-skeleton-pulse 1.4s ease-in-out infinite;
}
@keyframes mw-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@media (prefers-reduced-motion: reduce) {
  [data-mw-skeleton] { animation: none; }
}
`;

import { CSSProperties, HTMLAttributes, ReactNode } from "react";

/* ============================================================
   PanelGrid — the signed-in dashboard's panel scaffold: a CSS grid for the
   "main + aside" and multi-panel layouts an app surface is built from. This is
   the DASHBOARD idiom, deliberately distinct from the content-page Row/Column:
   Row/Column lay out marketing and document flow; PanelGrid arranges the boxed
   panels of a logged-in workspace (a primary column beside a rail of cards, an
   even split, a wall of equal tiles).

   Every track is minmax(0, …) — a min-width:0 guard baked in — so a wide child
   (a Table, a code block, a chart that measures its own intrinsic width) can
   never force the track past the viewport and open a horizontal scrollbar. That
   is the exact bug Row/Column guard against, carried into the dashboard grammar.

   Shapes via `layout`:
     • "main-aside" — 2fr / 1fr, stacking to one column below --mw-bp-desktop
       (the default: a working column beside a supporting rail).
     • "halves"     — an even 1fr / 1fr, also stacking below --mw-bp-desktop.
     • "thirds"     — repeat(auto-fit, minmax(…, 1fr)): as many equal panels as
       fit the width, reflowing without a breakpoint.

   The responsive columns need a media query, which inline CSSProperties can't
   express, so the grid rules live in a scoped <style href precedence> block
   (the NavRail / AppShell pattern) keyed off data-layout; a stable href dedupes
   the sheet to one mounted tag no matter how many PanelGrids render. The gap is
   the one per-instance knob and rides an inline custom property. Server
   component: pure layout, no hooks.
   ============================================================ */

export type PanelGridLayout = "main-aside" | "halves" | "thirds";
export type PanelGridGap = "none" | "xs" | "sm" | "md" | "lg" | "xl";

export interface PanelGridProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
  /** The panels — typically mother <Panel> / <Card> boxes, but any children. */
  children: ReactNode;
  /** Which dashboard shape. Default "main-aside". */
  layout?: PanelGridLayout;
  /** Gutter between panels, on the space token scale. Default "lg". */
  gap?: PanelGridGap;
  /** Style overrides merged onto the grid element. */
  style?: CSSProperties;
}

const gapMap: Record<PanelGridGap, string> = {
  none: "0",
  xs: "var(--space-xs)",
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
};

// Scoped grid sheet, hoisted via React 19 precedence with a stable href so
// every PanelGrid instance dedupes to a single mounted <style> tag. All tracks
// carry minmax(0, …) so a wide child can't overflow the track (the Row/Column
// guard, in the dashboard grammar). The gap reads an inline custom property.
export const PANELGRID_STYLE_HREF = "magentaweb-panelgrid";
export const PANELGRID_CSS = `
[data-mw-panelgrid] {
  display: grid;
  gap: var(--mw-panelgrid-gap, var(--space-lg));
  align-items: start;
}

/* main-aside: one full-width column until the desktop tier, then a working
   column beside a narrower rail. The 0 floor in each minmax stops a wide panel
   from blowing the track past the viewport. */
[data-mw-panelgrid][data-layout="main-aside"] {
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-panelgrid][data-layout="main-aside"] {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  }
}

/* halves: stacked below the desktop tier, an even split above it. */
[data-mw-panelgrid][data-layout="halves"] {
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-panelgrid][data-layout="halves"] {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

/* thirds: as many equal panels as fit, reflowing without a breakpoint. The
   min(100%, …) lets a track shrink below its ideal min on a narrow viewport
   rather than overflow it — the wide-child guard for the auto-fit case. */
[data-mw-panelgrid][data-layout="thirds"] {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem /* structural min panel width */), 1fr));
}
`;

export function PanelGrid({
  children,
  layout = "main-aside",
  gap = "lg",
  style,
  ...rest
}: PanelGridProps) {
  const merged: CSSProperties = {
    "--mw-panelgrid-gap": gapMap[gap],
    ...style,
  };

  return (
    <div data-mw-panelgrid="" data-layout={layout} style={merged} {...rest}>
      <style href={PANELGRID_STYLE_HREF} precedence="default">{PANELGRID_CSS}</style>
      {children}
    </div>
  );
}

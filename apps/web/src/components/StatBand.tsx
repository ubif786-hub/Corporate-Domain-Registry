import { CSSProperties, ReactNode } from "react";

/* ============================================================
   StatBand — the KPI band: one thin layout shell that lays a row of <Stat>
   children out as a wrapping flex line with a consistent gap, so a dashboard's
   KPI row is a single component instead of hand-rolled flex on every surface.

   It composes Stat; it does NOT wrap each one. Pass the stats as children and
   the band only owns their arrangement — the gap between them and the wrap when
   the row runs out of width. It reads the same whether the children are plain
   columns or Stat's `panel` cells (v4.5.0): the band never touches a stat's
   own dress, just the space around it, so a mixed or all-panel row spaces the
   identical way.

   `gap` picks the rung on the --space-* scale (rides the spacing dial); "lg" by
   default, the roomy KPI-row rhythm. `ariaLabel` names the grouping for
   assistive tech (e.g. "Key metrics"): when set the band is a labelled
   role="group" so the stats read as one region rather than loose figures.

   `phoneColumns` (REF-STATBAND-390): the band's own opt-in phone layout, for a
   head that wants its count strip exactly two per row at the phone breakpoint
   (the kit's Components/Style guide heads) instead of the default flex-wrap.
   The base `display` lives in the hoisted sheet below, not inline, precisely
   so this phone rule can win: an inline declaration always beats a sheet rule,
   which is why an external override (the pre-fix ShowroomIndex/StyleGuidePage
   media query) could never reach a StatBand that set display inline. Omitting
   the prop keeps every existing consumer's render byte-identical.

   Server component: presentational, no hooks.
   ============================================================ */

/** The gap rung between stats, on the --space-* scale (spacing-dial driven). */
export type StatBandGap = "sm" | "md" | "lg" | "xl";

export interface StatBandProps {
  /** The <Stat> children laid out across the band. */
  children: ReactNode;
  /** Space between stats (and between wrapped rows). "lg" (roomy KPI rhythm) by default. */
  gap?: StatBandGap;
  /** Names the band as a labelled region for assistive tech (e.g. "Key metrics"). */
  ariaLabel?: string;
  /** Opt in to a fixed N-per-row grid at the phone breakpoint, instead of flex-wrap. */
  phoneColumns?: 2;
}

const gapToken: Record<StatBandGap, string> = {
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
};

export function StatBand({ children, gap = "lg", ariaLabel, phoneColumns }: StatBandProps) {
  return (
    <div
      data-mw-stat-band=""
      data-phone-columns={phoneColumns ?? undefined}
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
      style={{ gap: gapToken[gap] } as CSSProperties}
    >
      <style href="magentaweb-stat-band" precedence="default">{statBandCss}</style>
      {children}
    </div>
  );
}

/* ---------- hoisted sheet ---------- */

// The band's base layout: a wrapping flex row, top-aligned so figures line up
// across stats of unequal caption height. `display` lives here rather than as
// an inline style so the phone rule below can actually win at 767px; an inline
// declaration beats every sheet rule, which is the exact trap REF-STATBAND-390
// hit when an external stylesheet tried to collapse it into a grid.
const statBandCss = `
[data-mw-stat-band] { display: flex; flex-wrap: wrap; align-items: flex-start; }
@media (max-width: 767px) { /* --mw-bp-tablet */
  [data-mw-stat-band][data-phone-columns="2"] {
    display: grid; grid-template-columns: repeat(2, 1fr);
  }
}
`;

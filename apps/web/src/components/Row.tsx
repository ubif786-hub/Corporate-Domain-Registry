import { CSSProperties, HTMLAttributes, ReactNode } from "react";

type RowAlign = "start" | "center" | "end" | "stretch";
// 2xl joined on 6 Sep 2026 (ROW-1): a held band reads generic when its gutter is too small
// (Rothschild holds 5fr/7fr with a 120px gutter), and the first SECT-3 rebuild found a client
// site holding ~59px gutters by hand against an xl of ~26px. One rung wider, on the same scale.
type RowGap = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface ResponsiveCols {
  desktop: number;
  mobile?: number;
  tablet?: number;
}

// The gap takes the same responsive object as cols (v6.11.0, ROW-2). Row carries ONE gap for
// both axes, so a held band's wide desktop gutter was also its STACK gap on a phone: the gms
// protocol band bound its heading to the content at xl while the stacked steps and photo sat
// 2xl apart, the second law inverted by the gutter itself (the ladder probe, 6 Sep 2026). A
// band now says `gap={{ mobile: "xl", desktop: "2xl" }}`: the gutter where the columns sit
// side by side, the stack rung where they do not. An unset rung inherits the smaller one, as
// cols does.
interface ResponsiveGap {
  desktop: RowGap;
  mobile?: RowGap;
  tablet?: RowGap;
}

export interface RowProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
  alignItems?: RowAlign;
  children: ReactNode;
  cols?: number | ResponsiveCols;
  gap?: RowGap | ResponsiveGap;
  justifyItems?: RowAlign;
  style?: CSSProperties;
}

function resolveGap(gap: RowGap | ResponsiveGap): { mobile: string; tablet: string; desktop: string } {
  if (typeof gap === "string") return { mobile: gapMap[gap], tablet: gapMap[gap], desktop: gapMap[gap] };
  const mobile = gap.mobile ?? gap.desktop;
  const tablet = gap.tablet ?? mobile;
  return { mobile: gapMap[mobile], tablet: gapMap[tablet], desktop: gapMap[gap.desktop] };
}

const gapMap: Record<RowGap, string> = {
  none: "0",
  xs: "var(--space-xs)",
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
  "2xl": "var(--space-2xl)",
};

// Shared grid CSS for Row and Column. Declared with React 19's precedence
// hoisting and a stable href so multiple declarations (here + in Column.tsx)
// dedupe to a single mounted <style> tag. CSS variables on each instance
// drive responsive cols/span without needing per-instance classes.
export const GRID_STYLE_HREF = "magentaweb-grid";
export const GRID_CSS = `
[data-mw-row] {
  display: grid;
  grid-template-columns: repeat(var(--mw-row-cols-mobile, 1), minmax(0, 1fr));
  gap: var(--mw-row-gap-mobile, var(--space-md));
}
@media (min-width: 640px) { /* pre-ladder collapse tier; moving to 768 is the queued Row/Column P2 decision */
  [data-mw-row] {
    grid-template-columns: repeat(
      var(--mw-row-cols-tablet, var(--mw-row-cols-mobile, 1)),
      minmax(0, 1fr)
    );
    gap: var(--mw-row-gap-tablet, var(--mw-row-gap-mobile, var(--space-md)));
  }
}
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-row] {
    grid-template-columns: repeat(
      var(--mw-row-cols-desktop, var(--mw-row-cols-tablet, var(--mw-row-cols-mobile, 1))),
      minmax(0, 1fr)
    );
    gap: var(--mw-row-gap-desktop, var(--mw-row-gap-tablet, var(--mw-row-gap-mobile, var(--space-md))));
  }
}

/* grid-column: start / span n. The start half is the v6.7.0 offset dial (Column's start prop);
   "auto" is the CSS default and Column writes it explicitly for every unset breakpoint, so the
   two-value form below is exactly "span n" whenever no start is given. */
[data-mw-col] {
  grid-column: var(--mw-col-start-mobile, auto) / span var(--mw-col-span-mobile, 1);
  min-width: 0;
}
@media (min-width: 640px) { /* pre-ladder collapse tier; moving to 768 is the queued Row/Column P2 decision */
  [data-mw-col] {
    grid-column: var(--mw-col-start-tablet, auto) / span var(--mw-col-span-tablet, var(--mw-col-span-mobile, 1));
  }
}
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-col] {
    grid-column: var(--mw-col-start-desktop, auto) / span var(--mw-col-span-desktop, var(--mw-col-span-tablet, var(--mw-col-span-mobile, 1)));
  }
}
`;

// Number-form cols cascade: anything ≥3 collapses to 1 on mobile and
// ceil(n/2) on tablet. Lower counts stay constant across breakpoints.
function resolveCols(cols: number | ResponsiveCols): {
  desktop: number;
  mobile: number;
  tablet: number;
} {
  if (typeof cols === "number") {
    if (cols >= 3) {
      return { mobile: 1, tablet: Math.ceil(cols / 2), desktop: cols };
    }
    return { mobile: cols, tablet: cols, desktop: cols };
  }
  const mobile = cols.mobile ?? 1;
  const tablet = cols.tablet ?? mobile;
  return { mobile, tablet, desktop: cols.desktop };
}

export function Row({
  alignItems = "stretch",
  children,
  cols = 1,
  gap = "md",
  justifyItems = "stretch",
  style,
  ...rest
}: RowProps) {
  const resolved = resolveCols(cols);
  const gaps = resolveGap(gap);

  // The gap rides the same per-instance variables as the column counts, read by the shared
  // media rules, so a responsive gap needs no per-instance class. A consumer's inline
  // `columnGap` or `rowGap` in `style` still wins over the shorthand, as before.
  const merged: CSSProperties = {
    alignItems,
    justifyItems,
    "--mw-row-cols-mobile": resolved.mobile,
    "--mw-row-cols-tablet": resolved.tablet,
    "--mw-row-cols-desktop": resolved.desktop,
    "--mw-row-gap-mobile": gaps.mobile,
    "--mw-row-gap-tablet": gaps.tablet,
    "--mw-row-gap-desktop": gaps.desktop,
    ...style,
  };

  return (
    <div data-mw-row="" style={merged} {...rest}>
      <style href={GRID_STYLE_HREF} precedence="default">{GRID_CSS}</style>
      {children}
    </div>
  );
}

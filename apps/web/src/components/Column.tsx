import { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { GRID_CSS, GRID_STYLE_HREF } from "./Row";

type ColumnAlign = "start" | "center" | "end" | "stretch";

interface ResponsiveSpan {
  desktop: number;
  mobile?: number;
  tablet?: number;
}

/* The column a cell STARTS on, 1-based, per breakpoint. The second of the two dials the measured
   reference varies (CLAUDE.md, "How a section is composed"): Chipperfield's five identical blocks
   sit at col-start 1, 2, 2, 2, 3, 3 with spans 12, 10, 9, 5, 7, 8, and all the variety is
   positional. `span` alone could express the width but never the offset, so an asymmetric block
   that does not begin at the left edge was inexpressible without an empty spacer Column. Added
   v6.7.0 (queue: the 8 Jul row/col entry, and the 4 Sep composition rule). */
interface ResponsiveStart {
  desktop: number;
  mobile?: number;
  tablet?: number;
}

export interface ColumnProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
  alignSelf?: ColumnAlign;
  children: ReactNode;
  justifySelf?: ColumnAlign;
  span?: number | ResponsiveSpan;
  /** The 1-based Row track this cell starts on; omit for the next free track. The object form
   *  pins each breakpoint; a breakpoint left unset falls back to auto placement at that width,
   *  which is what a stacked mobile layout usually wants. */
  start?: number | ResponsiveStart;
  style?: CSSProperties;
}

function resolveSpan(span: number | ResponsiveSpan): {
  desktop: number;
  mobile: number;
  tablet: number;
} {
  if (typeof span === "number") {
    return { mobile: span, tablet: span, desktop: span };
  }
  const mobile = span.mobile ?? 1;
  const tablet = span.tablet ?? mobile;
  return { mobile, tablet, desktop: span.desktop };
}

// Unlike span, an unset breakpoint here means "auto" (the CSS default), not "inherit the smaller
// breakpoint": a start pinned for desktop must not push a stacked mobile cell to track 4 of a
// one-track grid.
function resolveStart(start: number | ResponsiveStart | undefined): {
  desktop: number | "auto";
  mobile: number | "auto";
  tablet: number | "auto";
} {
  if (start === undefined) return { mobile: "auto", tablet: "auto", desktop: "auto" };
  if (typeof start === "number") return { mobile: start, tablet: start, desktop: start };
  return { mobile: start.mobile ?? "auto", tablet: start.tablet ?? "auto", desktop: start.desktop };
}

export function Column({
  alignSelf,
  children,
  justifySelf,
  span = 1,
  start,
  style,
  ...rest
}: ColumnProps) {
  const resolved = resolveSpan(span);
  const resolvedStart = resolveStart(start);

  const merged: CSSProperties = {
    "--mw-col-span-mobile": resolved.mobile,
    "--mw-col-span-tablet": resolved.tablet,
    "--mw-col-span-desktop": resolved.desktop,
    "--mw-col-start-mobile": resolvedStart.mobile,
    "--mw-col-start-tablet": resolvedStart.tablet,
    "--mw-col-start-desktop": resolvedStart.desktop,
    alignSelf,
    justifySelf,
    ...style,
  };

  return (
    <div data-mw-col="" style={merged} {...rest}>
      <style href={GRID_STYLE_HREF} precedence="default">{GRID_CSS}</style>
      {children}
    </div>
  );
}

"use client";

import { ChevronLeft, ChevronRight } from "@carbon/icons-react";

/* ============================================================
   Pagination: page controls for consumer-sliced lists (the admin
   table footer: invites, users, partners). The Table doctrine
   extended to paging: the CONSUMER owns row order and slicing;
   this control renders the page cells and reports intent through
   onPageChange. It never slices data and holds no page state of
   its own: fully controlled, zero hooks, "use client" only for
   the click handlers.

   Cells ride the compact control metric (--control-size-sm) in
   --type-sm with tabular figures: the Table numeric-cell voice.
   The system's numerals are tabular figures in the ambient face;
   the mono voice (--font-code) is the DataLabel label register,
   not a numeral register. Rest cells sit in the secondary ink and
   hover to the primary ink over the 6% ink wash (the
   SegmentedControl hover cue). The current cell wears the NavRail
   subgroup-active family: the --accent-wash ground, the primary
   ink at medium weight, plus aria-current="page". The rail's 2px
   accent rule stays the rail's own geometry: inside a compact
   cell it would read as a tab underline.

   The cell algorithm is deterministic and jitter-free: page 1 and
   pageCount always render, a sibling window rides the current
   page, and a run of hidden pages collapses to an aria-hidden
   ellipsis only when it hides two or more (a one-page run renders
   the page itself), so the cell count stays constant while the
   window slides. With siblingCount 1, every pageCount up to 7
   renders plainly.

   Every control is a real <button type="button">: this is
   in-place state control, not URL navigation. A URL-driven
   listing should put real page links in the page itself; a
   link-based mode here is future work if a real case appears.

   Defensive rendering: pageCount below 2 renders null (one page
   needs no pager), and an out-of-range `page` renders clamped
   without calling onPageChange to self-correct (a controlled
   component never writes back on render).
   ============================================================ */

export interface PaginationProps {
  /** The current page, 1-based. Out-of-range values render clamped to the
   *  nearest real page; the component never calls onPageChange to
   *  self-correct. */
  page: number;
  /** Total pages. Below 2 the control renders nothing (one page needs no
   *  pager). */
  pageCount: number;
  /** Reports the intended page, 1-based. The consumer re-slices and passes
   *  the new `page` back down; nothing moves until it does. */
  onPageChange: (page: number) => void;
  /** Pages shown either side of the current page. Default 1. */
  siblingCount?: number;
  /** Accessible name for the nav landmark. Default "Pagination". */
  ariaLabel?: string;
}

/** A gap is a collapsed run of hidden pages; the two sides key separately. */
type PageCell = number | "gap-start" | "gap-end";

const range = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
};

// The deterministic cell list. The sibling window clamps against both ends so
// the total cell count never changes as the current page slides (2 *
// siblingCount + 5 cells once pageCount exceeds that; every page plainly when
// it does not). A gap only ever hides two or more pages: when exactly one
// page would hide, that page renders instead.
function pageCells(current: number, pageCount: number, siblingCount: number): PageCell[] {
  const windowStart = Math.max(
    Math.min(current - siblingCount, pageCount - 2 * siblingCount - 2),
    3,
  );
  const windowEnd = Math.min(
    Math.max(current + siblingCount, 2 * siblingCount + 3),
    pageCount - 2,
  );
  return [
    1,
    ...(windowStart > 3
      ? (["gap-start"] as PageCell[])
      : pageCount - 1 > 2
        ? [2]
        : []),
    ...range(windowStart, windowEnd),
    ...(windowEnd < pageCount - 2
      ? (["gap-end"] as PageCell[])
      : pageCount - 1 > 1
        ? [pageCount - 1]
        : []),
    pageCount,
  ];
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  ariaLabel = "Pagination",
}: PaginationProps) {
  // One page (or none) needs no pager.
  if (pageCount < 2) return null;
  // Display-side clamp only: the correction is never reported back.
  const current = Math.min(Math.max(Math.trunc(page), 1), pageCount);
  const cells = pageCells(current, pageCount, Math.max(0, Math.trunc(siblingCount)));

  return (
    <nav data-mw-pagination="" aria-label={ariaLabel}>
      <style href="magentaweb-pagination" precedence="default">{paginationCss}</style>
      <ul data-mw-pagination-list="" role="list">
        <li>
          <button
            type="button"
            data-mw-pagination-cell=""
            aria-label="Previous page"
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
        </li>
        {cells.map((cell) =>
          typeof cell === "number" ? (
            <li key={cell}>
              <button
                type="button"
                data-mw-pagination-cell=""
                data-current={cell === current ? "true" : "false"}
                aria-current={cell === current ? "page" : undefined}
                onClick={() => {
                  // The current page is not a new intent; report only changes.
                  if (cell !== current) onPageChange(cell);
                }}
              >
                {cell}
              </button>
            </li>
          ) : (
            <li key={cell}>
              {/* A collapsed run is decorative: the numbers either side already
                  tell the story ("5, then 12"), so the glyph stays out of the
                  accessibility tree. */}
              <span data-mw-pagination-gap="" aria-hidden="true">
                &hellip;
              </span>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            data-mw-pagination-cell=""
            aria-label="Next page"
            disabled={current >= pageCount}
            onClick={() => onPageChange(current + 1)}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  );
}

/* Hoisted sheet: hover / focus / disabled / current must win the cascade, so
   the whole cell dress lives here (the SegmentedControl idiom). */
const paginationCss = `
[data-mw-pagination-list] {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3xs);
}
[data-mw-pagination-cell] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* DECLARED, NOT INHERITED (the leading-pins census, 2 Sep 2026): a single-line
     control that sits in a row with its own siblings, so it takes the kit's control
     leading like Button and Input. It measured at prose 1.5 before this line. */
  line-height: var(--leading-tight);
  /* Square-ish compact cell: the --control-size-sm metric both ways; the
     inline padding only matters once a numeral outgrows the square. */
  min-width: var(--control-size-sm);
  height: var(--control-size-sm);
  padding-inline: var(--space-2xs);
  margin: 0;
  border: 0;
  background: transparent;
  border-radius: var(--component-radius);
  font-family: var(--font-body);
  font-size: var(--type-sm);
  font-variant-numeric: tabular-nums;
  color: var(--text-positive-secondary);
  cursor: pointer;
  transition: background var(--motion-transition), color var(--motion-transition);
}
[data-mw-pagination-cell]:hover:not(:disabled):not([data-current="true"]) {
  background: var(--background-hover-wash);
  color: var(--text-positive-primary);
}
[data-mw-pagination-cell]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
[data-mw-pagination-cell][data-current="true"] {
  background: var(--accent-wash);
  color: var(--text-positive-primary);
  font-weight: var(--weight-medium);
}
[data-mw-pagination-cell]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
[data-mw-pagination-gap] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--control-size-sm);
  height: var(--control-size-sm);
  font-family: var(--font-body);
  font-size: var(--type-sm);
  color: var(--text-positive-tertiary);
  user-select: none;
}
`;

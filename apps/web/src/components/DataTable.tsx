"use client";

import {
  ComponentProps,
  CSSProperties,
  ReactNode,
  isValidElement,
  useId,
  useMemo,
  useState,
} from "react";
import { ChevronSort, ChevronSortDown, ChevronSortUp } from "@carbon/icons-react";
import { Table, TableColumn } from "@/components/Table";
import { Pagination } from "@/components/Pagination";
import { EmptyState } from "@/components/EmptyState";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   DataTable — the interactive skin over the presentational mother
   Table. Table is deliberately dumb: it renders the rows and columns
   it is handed and owns no state (the DATA-TABLE law — the consumer
   owns row order and slicing). DataTable is the consumer that most
   listings actually want: it holds the SORT and PAGE state, sorts the
   full set, cuts one page, and feeds that page straight into Table —
   so Table stays presentational and this owns all the moving parts.

   Sort lives in the header: a sortable column's head becomes a real
   <button> in the same DataLabel voice, carrying Carbon's dedicated
   sort trio (ChevronSortUp / ChevronSortDown when active; the faint
   always-visible ChevronSort when idle — the sort family, NOT the
   disclosure chevrons). A click cycles unsorted -> ascending ->
   descending -> unsorted (columns marked sortDescFirst enter at
   descending — the useful first order for numbers and dates), and
   any sort snaps back to page 1 so you never land on an empty tail
   page.

   Sort a11y (v4.8.0): the state lives on the <th> as aria-sort (the
   sorted column speaks ascending/descending, its sortable siblings
   "none"); the button's accessible name is just its VISIBLE text —
   no state stuffed into aria-label — with the cycling instruction
   supplied once per table via aria-describedby; and a polite live
   region announces each change on activation (screen readers do not
   re-read a th's aria-sort mid-table, so activation would otherwise
   be silent).

   Paging lives below: the mother Pagination, fully controlled, with
   this component clamping and slicing. Give `pageSize` to page; omit
   it and every row shows on one page (no pager). When the set is
   empty the mother EmptyState stands in — pass your own node, or the
   {title, description, icon} shorthand, or take the calm default.

   Client component: it owns the sort + page state and the handlers.
   Generic over the row type; token-pure; composes Table, Pagination,
   and EmptyState — it re-implements none of them.
   ============================================================ */

/** A Table column plus the knobs DataTable needs to sort by it. */
export interface DataTableColumn<Row> extends TableColumn<Row> {
  /** Opt this column into sorting. Falls back to the table-wide `sortable`. */
  sortable?: boolean;
  /** The value to sort by; defaults to row[key]. Use when the cell renders
   *  something the raw field can't be compared on (a formatted date, a name
   *  built from parts). */
  sortValue?: (row: Row) => string | number | boolean | null | undefined;
  /** A full comparator, when a value accessor can't express the order
   *  (multi-key, a custom collation). Wins over sortValue when present. */
  compare?: (a: Row, b: Row) => number;
  /** Accessible name for the sort control when `header` isn't plain text.
   *  Defaults to the header string, else the column key. */
  sortLabel?: string;
  /** Enter the sort cycle at DESCENDING for this column (v4.8.0): the useful
   *  first order for numbers and dates (largest / newest first). The cycle
   *  stays tri-state either way. */
  sortDescFirst?: boolean;
}

/** The shorthand empty state: rendered through the mother EmptyState. */
export interface DataTableEmptyState {
  title: string;
  description?: string;
  icon?: ComponentProps<typeof EmptyState>["icon"];
}

export interface DataTableProps<Row extends object> {
  /** Columns, each optionally `sortable` with its own value/comparator. */
  columns: DataTableColumn<Row>[];
  /** The full row set. DataTable sorts and pages it; it never mutates it. */
  rows: Row[];
  /** Rows that always come FIRST and never sort: pinned favourites, a summary row, the records
   *  a viewer was assigned rather than created. They render above `rows`, in the order given,
   *  on page one only (repeating a pinned row on every page reads as many rows), and they count
   *  as content — a table with no `rows` but some `leadRows` is not empty and shows no empty
   *  state. Sorting reorders `rows` beneath them and leaves them where they are, which is the
   *  whole point: a sort by name is not a statement about which rows are pinned. */
  leadRows?: Row[];
  /** Rows that always come LAST and never sort (v6.33.0): the totals, set under the very columns
   *  they sum, so a figure lines up with the figures it adds. On the last page only; they do not
   *  count as content (the totals of nothing are nothing, so a table with only foot rows shows its
   *  empty state). The column renderers draw them; mark the row in your own data to set it in the
   *  strong weight. */
  footRows?: Row[];
  /** Rows per page. Omit (or 0) to show every row on one page — no pager. */
  pageSize?: number;
  /** Turn sorting on for every column at once; a column's own `sortable`
   *  overrides this either way. Default false. */
  sortable?: boolean;
  /** What to show when there are no rows: your own node, the
   *  {title, description, icon} shorthand, or nothing for the calm default. */
  emptyState?: ReactNode | DataTableEmptyState;
  /** Accessible name for the table (its sr-only caption) and the pager. */
  ariaLabel?: string;
  /** Stable row key, passed through to Table (v4.8.0 — sorted/paged rows must
   *  not fall back to index keys, which re-key every row on a re-order). */
  rowKey?: (row: Row, index: number) => string;
  /** The table-wide null-cell marker, passed straight through to Table. A
   *  column's own emptyCell still wins. Pass "" to render nothing. */
  emptyCell?: ReactNode;
  /** Row rhythm, passed through to Table (v6.30.0): "comfortable" (default), "compact", or
   *  "list", the header-less list (HQ v7 system pass, theme 3). Under "list" the head row is
   *  kept for assistive technology and hidden visually, and `sortable` is forced off: with no
   *  head there is no sort target, so the order is the view's. Every cell must read without
   *  a head (a figure with its unit or word, a status as a chip, a name as a link). */
  density?: "comfortable" | "compact" | "list";
  /** The head row's voice, passed through to Table (v6.31.0): "caps" (default) or "sentence". */
  headCase?: "caps" | "sentence";
}

type SortDir = "asc" | "desc";
interface SortState {
  key: string;
  dir: SortDir;
}

// One collator for every string comparison (v4.8.0): bare localeCompare
// constructs a fresh Intl.Collator per CALL — a real cost at n·log n
// comparisons per sort. Same default semantics, built once.
const collator = new Intl.Collator();

// Null-safe, type-aware order: nullish sinks first, numbers/booleans compare
// numerically, Dates by instant (v4.8.0 — they previously fell through to
// string order, which breaks across month/locale renderings), everything
// else by locale-aware string order.
function defaultCompare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return collator.compare(String(a), String(b));
}

function sortValueOf<Row>(col: DataTableColumn<Row>, row: Row): unknown {
  if (col.sortValue) return col.sortValue(row);
  return (row as Record<string, unknown>)[col.key];
}

// A plain object with a `title` is the shorthand; a React element (or string,
// array, number) is a ready-made node to render as-is.
function isEmptyStateConfig(value: unknown): value is DataTableEmptyState {
  return (
    typeof value === "object" &&
    value !== null &&
    !isValidElement(value) &&
    "title" in value
  );
}

// The live-region line spoken on each activation. Terse by design: a polite
// announcement should name the outcome, not narrate the mechanism.
function sortAnnouncement(name: string, dir: SortDir | null): string {
  if (dir === "asc") return `Sorted by ${name}, ascending`;
  if (dir === "desc") return `Sorted by ${name}, descending`;
  return "Sorting removed";
}

export function DataTable<Row extends object>({
  columns,
  rows,
  pageSize,
  sortable = false,
  emptyState,
  ariaLabel,
  leadRows,
  footRows,
  rowKey,
  emptyCell,
  density = "comfortable",
  headCase,
}: DataTableProps<Row>) {
  // The list density has no head to sort from (see the prop): sorting is off for every column.
  const listDensity = density === "list";
  if (listDensity) sortable = false;
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  // The last sort announcement (the aria-live text). Set on ACTIVATION only,
  // so the region never speaks on mount or on unrelated re-renders.
  const [announcement, setAnnouncement] = useState("");
  const hintId = useId();

  // A sort is a new question, so we return to the first page with the answer.
  // Tri-state cycle from the column's entry direction: unsorted -> first ->
  // second -> unsorted (first = desc when sortDescFirst, else asc). The next
  // state derives from the committed `sort` (not an updater) so the paired
  // announcement is computed exactly once per activation.
  const toggleSort = (key: string, name: string, descFirst: boolean) => {
    const first: SortDir = descFirst ? "desc" : "asc";
    const second: SortDir = descFirst ? "asc" : "desc";
    const next: SortState | null =
      !sort || sort.key !== key
        ? { key, dir: first }
        : sort.dir === first
          ? { key, dir: second }
          : null;
    setPage(1);
    setSort(next);
    setAnnouncement(sortAnnouncement(name, next ? next.dir : null));
  };

  // Sort the FULL set (a copy — the consumer's array is never touched); the
  // slice into a page happens after. Unsorted keeps the given order verbatim.
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    const compare = col.compare
      ? col.compare
      : (a: Row, b: Row) => defaultCompare(sortValueOf(col, a), sortValueOf(col, b));
    return [...rows].sort((a, b) => factor * compare(a, b));
  }, [rows, columns, sort]);

  const paginate = typeof pageSize === "number" && pageSize > 0;
  const pageCount = paginate ? Math.max(1, Math.ceil(sortedRows.length / pageSize)) : 1;
  // Clamp for slicing; the state itself self-corrects on the next page change.
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const bodyRows = paginate
    ? sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize)
    : sortedRows;
  // Page one only. The lead block is a statement about the TABLE, not about a page, and a reader
  // who pages forward and sees it again reads it as more rows rather than the same ones.
  const lead = leadRows && leadRows.length > 0 && safePage === 1 ? leadRows : [];
  const foot = footRows && footRows.length > 0 && safePage === pageCount ? footRows : [];
  const pageRows = lead.length > 0 || foot.length > 0 ? [...lead, ...bodyRows, ...foot] : bodyRows;
  const showPager = paginate && pageCount > 1;

  // Re-dress each sortable header as a button in the DataLabel voice; the rest
  // pass through untouched. Table still owns the <th> and the DataLabel wrap.
  const tableColumns: TableColumn<Row>[] = columns.map((col) => {
    const effectiveSortable = listDensity ? false : (col.sortable ?? sortable);
    // SPREAD, never a hand-list. This was `{key, header, align, render, width}`, which silently
    // dropped every other TableColumn field on the way through: `emptyCell` (added v5.5.0) never
    // reached Table, so a column-level null marker did nothing while both this file's JSDoc and
    // the published prop table promised it won. `density` had already been queued for the same
    // reason. A hand-list re-breaks on the NEXT field added to TableColumn, so the fix is the
    // class and not the instance; DataTableColumn's own sort fields ride along and Table ignores
    // them. Anything DataTable must intercept gets overridden explicitly below.
    const base: TableColumn<Row> = { ...col };
    if (!effectiveSortable) return base;

    const active = sort?.key === col.key;
    const dir: SortDir | null = active ? sort!.dir : null;
    const name = col.sortLabel ?? (typeof col.header === "string" ? col.header : col.key);

    return {
      ...base,
      // The SORT STATE lives on the th (aria-sort), the sorted column speaking
      // its direction and its sortable siblings "none". The button's accessible
      // name stays its visible text — state in the name double-announces
      // against aria-sort, so no aria-label here; the shared describedby hint
      // carries the cycling instruction once.
      ariaSort: active ? (dir === "asc" ? "ascending" : "descending") : "none",
      header: (
        <button
          type="button"
          data-mw-datatable-sort=""
          onClick={() => toggleSort(col.key, name, col.sortDescFirst === true)}
          aria-describedby={hintId}
        >
          <span>{col.header}</span>
          <span data-mw-datatable-sort-icon="" data-active={active ? "true" : "false"} aria-hidden="true">
            {dir === "asc" ? (
              <ChevronSortUp size={16} />
            ) : dir === "desc" ? (
              <ChevronSortDown size={16} />
            ) : (
              <ChevronSort size={16} />
            )}
          </span>
        </button>
      ),
    };
  });

  // Lead rows count as content: a table showing two pinned rows under the words "Nothing here
  // yet" is a contradiction a reader stops trusting the component over.
  const isEmpty = sortedRows.length === 0 && (!leadRows || leadRows.length === 0);

  return (
    <div style={rootStyle}>
      {/* Hover / focus / idle-arrow dress lives in a hoisted sheet so the
          interactive states win the cascade (the Pagination idiom). */}
      <style href="magentaweb-datatable" precedence="default">{dataTableCss}</style>
      {/* The one-per-table sort instruction (referenced by every sort button's
          aria-describedby) and the polite live region that speaks each sort
          change on activation — aria-sort on the th is state AT the column,
          but activation itself is silent without this. */}
      <span id={hintId} hidden>
        Sortable column. Activating cycles through ascending, descending, and off.
      </span>
      <span aria-live="polite" style={srOnly}>
        {announcement}
      </span>
      {isEmpty ? (
        isEmptyStateConfig(emptyState) ? (
          <EmptyState
            align="start"
            title={emptyState.title}
            description={emptyState.description}
            icon={emptyState.icon}
          />
        ) : emptyState != null ? (
          emptyState
        ) : (
          <EmptyState
            align="start"
            title="Nothing here yet"
            description="Rows land in this table as the work produces them."
          />
        )
      ) : (
        <>
          <Table columns={tableColumns} rows={pageRows} caption={ariaLabel} rowKey={rowKey} emptyCell={emptyCell} density={density} headCase={headCase} />
          {showPager ? (
            <div style={footerStyle}>
              {/* The range beside the pager (v6.35.0, the owner on the HQ's growing logs: "a count
                  and the pages with controls"): where this page sits in the whole, in words. */}
              <span data-mw-datatable-range="" style={rangeStyle}>
                {(safePage - 1) * pageSize! + 1} to {Math.min(safePage * pageSize!, sortedRows.length)} of {sortedRows.length}
              </span>
              <Pagination
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
                ariaLabel={ariaLabel ? `${ariaLabel} pagination` : "Pagination"}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ---------- inline styles (token-pure) ---------- */

// The component stack: table over pager, one calm gap between them.
const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  minWidth: 0,
};

// The range leads and the pager sits to the trailing edge, the table-footer convention; they
// wrap onto two lines on a narrow table rather than crowding the width.
const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "var(--space-sm)",
};
// The range: the stamp voice, mono at the xs rung, secondary ink, tabular.
const rangeStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-secondary)",
  fontVariantNumeric: "tabular-nums",
};

/* Hoisted sheet: the sort control is a bare button that must inherit the
   DataLabel head voice (font, tracking, uppercase, ink) and win its own
   hover/focus states — inline CSSProperties can't express :hover or
   :focus-visible, so the whole dress lives here (the Pagination idiom). */
const dataTableCss = `
[data-mw-datatable-sort] {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3xs);
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
  /* The wash needs a box: padding gives it one, the matching negative margin
     keeps the visible text exactly where a non-sortable header sits. */
  padding: var(--space-3xs) var(--space-2xs);
  margin: calc(-1 * var(--space-3xs)) calc(-1 * var(--space-2xs));
  border: 0;
  background: transparent;
  border-radius: var(--component-radius);
  cursor: pointer;
  transition: color var(--motion-transition), background var(--motion-transition);
}
/* Hover: the general neutral hover wash (v4.8.0 — the token the sort control
   was minted to consume first). 8% ink composes visibly ON the header band's
   own 5% wash. */
[data-mw-datatable-sort]:hover {
  color: var(--text-positive-primary);
  background: var(--background-hover-wash);
}
[data-mw-datatable-sort]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
[data-mw-datatable-sort-icon] {
  display: inline-flex;
  line-height: 0;
  flex-shrink: 0;
}
/* Idle: ChevronSort reads as an affordance, not a state — always visible but
   faint until the column is the one actually sorted; hover and keyboard focus
   bring it to full strength (the discoverability reveal). */
[data-mw-datatable-sort-icon][data-active="false"] {
  opacity: 0.45;
  transition: opacity var(--motion-transition);
}
[data-mw-datatable-sort]:hover [data-mw-datatable-sort-icon][data-active="false"],
[data-mw-datatable-sort]:focus-visible [data-mw-datatable-sort-icon][data-active="false"] {
  opacity: 1;
}
`;

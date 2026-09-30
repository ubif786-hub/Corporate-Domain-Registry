import { CSSProperties, ReactNode, useId } from "react";
import { DataLabel } from "@/components/DataLabel";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   Table — the kit's data table (v3.9.0, from the ArtistHQ handoff).
   A REAL <table>: rows of records with column headers are tabular
   semantics, and only the native element gives screen readers the
   row/column navigation model for free (a CSS grid of divs would
   re-implement all of it with ARIA and still read worse).

   The DATA-TABLE law (the sanctioned exception to spacing-only
   lists): TRUE data tables KEEP their row rules. Minimal dress
   otherwise: no zebra, a strong rule under the header band
   (--border-positive-secondary), hairline rules between rows
   (--border-positive-primary), header band on
   --background-positive-secondary in the DataLabel mono label voice.

   Grouping (Supplies by category, the practice log by day): groupBy
   buckets consecutive rows under a full-width eyebrow row, mono
   uppercase on the same tint band, with an optional 6px colored dot
   per group (groupDot maps a key to a color token, the Timeline
   kind->color idiom). Each bucket is its own <tbody> and the eyebrow
   is a <th scope="rowgroup">: the group name heads the rows beneath
   it. (Before pass 3, 27 Aug 2026, every bucket shared one tbody and
   the eyebrow claimed scope="colgroup", a header for columns that
   did not exist, so a reader could hear "Paints" as the column
   header of a cell in "Brushes".)

   Row highlight (the ledger's current row): rowHighlight washes the
   row in --accent-wash, the 8% accent tint. Chosen over
   --background-positive-secondary deliberately: the tint band is
   already the header/group ground, so a neutral wash would read as
   another header; the accent wash reads as "you are here" and
   rebrands per fork.

   Overflow: the table sits in its own overflow-x wrapper, so a wide
   table scrolls inside its container instead of breaking the page.
   The wrapper is a KEYBOARD TAB STOP (pass 3, 27 Aug 2026): a table
   of plain text cells has nothing focusable inside it, so without
   one a keyboard user could never scroll the clipped columns into
   view (Chrome only auto-focuses a scroller since v127 and only when
   it overflows; Safari never does). Table is a server component and
   cannot measure overflow, so the stop is UNCONDITIONAL: every table,
   overflowing or not, is one Tab press. It reads as role="group"
   (not region: six tables would be six landmarks) named by the
   caption through aria-labelledby, and draws the house focus ring.
   DataTable renders through this component and inherits all of it.
   Server component, generic over the row type.
   ============================================================ */

export interface TableColumn<Row> {
  /** Column id; also the default cell accessor (row[key]) when render is absent. */
  key: string;
  header: ReactNode;
  /** What THIS column shows when its value is null or undefined. Wins over the
   *  table-wide `emptyCell`. Pass "" to opt the column out and render nothing. */
  emptyCell?: ReactNode;
  /** Cell alignment. Numeric columns align right (they also get tabular figures). */
  align?: "left" | "center" | "right";
  /** Cell renderer; defaults to String(row[key] ?? ""). */
  render?: (row: Row) => ReactNode;
  /** Optional CSS width for the column (e.g. "12rem", "20%"). */
  width?: string;
  /** aria-sort for the column's <th> (v4.8.0, set by a sorting consumer like
   *  DataTable: the SORTED column carries ascending/descending, its sortable
   *  siblings "none"). Table stays presentational — it renders the state, the
   *  consumer owns it. */
  ariaSort?: "ascending" | "descending" | "none";
}

export interface TableProps<Row> {
  columns: TableColumn<Row>[];
  rows: Row[];
  /** Accessible name for the table. Prefer caption (visible to AT, hidden visually).
   *  It also names the focusable overflow wrapper (aria-labelledby); without one the
   *  wrapper falls back to the generic "Table". */
  caption?: string;
  /** Row rhythm (v4.8.0). "comfortable" (default) keeps the house padding with a
   *  control-height row floor, so a row holding a small Button is exactly as tall
   *  as one holding text — uniform rows either way. "compact" tightens the pad +
   *  floor for dense data surfaces (directories, admin listings). The floor rides
   *  content rows only; group eyebrow rows keep their own slim rhythm.
   *
   *  "list" (v6.30.0, HQ v7 system pass, theme 3): the HEADER-LESS list. The head row
   *  stays in the DOM for assistive technology and is hidden visually; the rows keep
   *  their one hairline and the comfortable rhythm; the first cell reads as the row's
   *  name. The rule the density enforces by documentation: a list may drop its head only
   *  when every cell reads without it, so a figure carries its unit or its word ("$1,500
   *  past due 12 d", "3 of 5"), a status is a chip, a name is a link. Any column that
   *  would be a bare number keeps the head row for the whole table. */
  density?: "comfortable" | "compact" | "list";
  /** The head row's voice (v6.31.0). "caps" (default) is the DataLabel head, mono uppercase
   *  tracked, the data-table law's head band. "sentence" sets the heads in body small sentence
   *  case on the same band, the HQ v7 boards' voice for a list on a data surface where the mono
   *  head reads heavier than the rows it names. v6.35.0: the sentence head draws no band and no
   *  rule, and its rows are ruled BETWEEN one another (none under the head, none under the last
   *  row), as the boards draw a table inside a panel. */
  headCase?: "caps" | "sentence";
  /** Buckets consecutive rows by key; each bucket opens with a group eyebrow row. */
  groupBy?: (row: Row) => string;
  /** Custom content for a group eyebrow row; defaults to the group key itself. */
  groupHeader?: (groupKey: string) => ReactNode;
  /** Group key -> color token for the 6px dot in the eyebrow row (e.g. "var(--category-3)"). */
  groupDot?: (groupKey: string) => string | undefined;
  /** True washes the row in --accent-wash (the "current row" ledger treatment). */
  rowHighlight?: (row: Row) => boolean;
  /** Stable row key; defaults to the row index. */
  rowKey?: (row: Row, index: number) => string;
  /** The table-wide null-cell marker, overriding the default muted glyph. A
   *  column's own `emptyCell` still wins. Pass "" to render nothing anywhere. */
  emptyCell?: ReactNode;
}

export function Table<Row extends object>({
  columns,
  rows,
  caption,
  groupBy,
  groupHeader,
  groupDot,
  rowHighlight,
  rowKey,
  emptyCell,
  density = "comfortable",
  headCase = "caps",
}: TableProps<Row>) {
  // Names the overflow wrapper from the caption (useId is available in server
  // components; it is stable across the server render and hydration).
  const captionId = useId();
  const tdBase = density === "compact" ? tdCompactStyle : density === "list" ? tdListStyle : tdStyle;
  // The sentence head and the list rule BETWEEN rows (v6.35.0): the rule rides a row's top edge
  // and the first row of each body carries none, so nothing rules under a head or a panel's last row.
  const ruleBetween = headCase === "sentence" || density === "list";
  // Bucket CONSECUTIVE rows: the consumer owns row order (a group that should
  // read as one block arrives sorted), so grouping never reorders data.
  const buckets: { key: string | null; rows: { row: Row; index: number }[] }[] = [];
  rows.forEach((row, index) => {
    const key = groupBy ? groupBy(row) : null;
    const last = buckets[buckets.length - 1];
    if (last && last.key === key) last.rows.push({ row, index });
    else buckets.push({ key, rows: [{ row, index }] });
  });

  const cellValue = (row: Row, col: TableColumn<Row>): ReactNode => {
    // A null cell is a STATE, not an absence. Before v5.5.0 this returned "" and the cell went
    // blank, which reads identically to a zero, a whitespace value, or a render bug — the one
    // ambiguity a null treatment exists to remove. Both paths are covered: a bare accessor
    // returning nullish, and a `render` that returns nullish for the same row.
    // Column override, then table-wide, then the house glyph. "" is a real opt-out, not nullish.
    const fallback = (): ReactNode => {
      const override = col.emptyCell ?? emptyCell;
      return override !== undefined ? override : EMPTY_CELL;
    };
    // A custom render owns its node; only the bare accessor gets stringified.
    if (col.render) {
      const rendered = col.render(row);
      return rendered == null ? fallback() : rendered;
    }
    const raw = (row as Record<string, unknown>)[col.key];
    return raw == null ? fallback() : String(raw as string | number);
  };

  return (
    <>
      <style href="magentaweb-table" precedence="default">{tableCss}</style>
      {/* The overflow stage doubles as the keyboard scroller: a tab stop, a
          named group (the caption), the house focus ring from the sheet. */}
      <div
        data-mw-table-scroller=""
        tabIndex={0}
        role="group"
        aria-labelledby={caption ? captionId : undefined}
        aria-label={caption ? undefined : "Table"}
        style={overflowWrapStyle}
      >
        <table style={density === "list" ? listTableStyle : tableStyle}>
          {caption ? <caption id={captionId} style={srOnly}>{caption}</caption> : null}
          {/* The list density hides its head, and a hidden head takes its column widths with it,
              so every grouped list sized itself to its own content and the columns drifted from
              group to group (HQ clients, 26 Sep 2026). The widths ride a colgroup instead, and the
              list lays out fixed, so two lists with the same columns line up exactly. */}
          {density === "list" ? <colgroup>{columns.map((col) => <col key={col.key} style={col.width ? { width: col.width } : undefined} />)}</colgroup> : null}
          <thead style={density === "list" ? srOnly : undefined}>
            <tr style={headCase === "sentence" ? undefined : headBandStyle}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={col.ariaSort}
                  style={{
                    ...thStyle,
                    textAlign: col.align ?? "left",
                    width: col.width,
                  }}
                >
                  {headCase === "sentence" ? <span style={thSentenceStyle}>{col.header}</span> : <DataLabel tone="secondary">{col.header}</DataLabel>}
                </th>
              ))}
            </tr>
          </thead>
          {/* One <tbody> per bucket, so a group eyebrow is the header OF ITS ROW
              GROUP (scope="rowgroup"). The ungrouped table is a single bucket with
              a null key and no eyebrow, and still emits its tbody. */}
          {buckets.map((bucket, b) => (
            <tbody key={bucket.key != null ? `group-${bucket.key}-${b}` : `rows-${b}`}>
              {bucket.key != null ? (
                <tr style={groupBandStyle}>
                  {/* One cell across the width: the group eyebrow, mono
                      uppercase on the tint band, with the optional kind dot. */}
                  <th colSpan={columns.length} scope="rowgroup" style={groupThStyle}>
                    <span style={groupInnerStyle}>
                      {groupDot?.(bucket.key) ? (
                        <span
                          aria-hidden="true"
                          style={{ ...groupDotStyle, background: groupDot(bucket.key) }}
                        />
                      ) : null}
                      <DataLabel tone="secondary">
                        {groupHeader ? groupHeader(bucket.key) : bucket.key}
                      </DataLabel>
                    </span>
                  </th>
                </tr>
              ) : null}
              {bucket.rows.map(({ row, index }, i) => (
                <tr
                  key={rowKey ? rowKey(row, index) : index}
                  style={{
                    ...(ruleBetween ? (i === 0 ? null : rowBetweenStyle) : rowStyle),
                    ...(rowHighlight?.(row) ? { background: "var(--accent-wash)" } : null),
                  }}
                >
                  {columns.map((col, ci) => (
                    <td
                      key={col.key}
                      style={{
                        ...tdBase,
                        // A list has no head to align under, so its first and last cells sit flush
                        // with the group head above it (the boards' grid list).
                        ...(density === "list" && ci === 0 ? { paddingLeft: 0 } : null),
                        ...(density === "list" && ci === columns.length - 1 ? { paddingRight: 0 } : null),
                        textAlign: col.align ?? "left",
                        // Numeric columns read right-aligned tabular figures so
                        // magnitudes line up digit-for-digit down the column.
                        fontVariantNumeric: col.align === "right" ? "tabular-nums" : undefined,
                      }}
                    >
                      {cellValue(row, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </>
  );
}

/* ---------- the null cell ---------- */

// The empty-value marker, muted through the same token every other null treatment in the system
// reads (Stat's "n/a", PricingCard's excluded row, Combobox's "No matches", EmptyState's neutral
// glyph): --text-positive-tertiary. Colour was already consistent system-wide; the GLYPH was not,
// and Table had none at all.
//
// The em dash here is a GLYPH, not prose. REFACTOR_QUEUE "Em-dash placeholder glyphs: four
// sanctioned sites (A-069)" adjudicated exactly this use on 1 Aug 2026 and requires a fifth use to
// point back at it, which this comment does. That entry has been updated to name this site: it is
// the first outside the docs layer, and the only one a client ever sees.
//
// aria-hidden on the glyph plus an sr-only word is the PricingCard idiom: an em dash alone is
// announced as "em dash" by some screen readers and skipped entirely by others, so the cell's
// meaning would not survive the character. The word carries it instead.
const emptyCellStyle: CSSProperties = {
  color: "var(--text-positive-tertiary)",
};
const EMPTY_CELL: ReactNode = (
  <>
    <span aria-hidden="true" style={emptyCellStyle}>
      —
    </span>
    <span style={srOnly}>No value</span>
  </>
);

/* ---------- the hoisted sheet ---------- */

// :focus-visible is not expressible from CSSProperties. React 19 dedupes by
// precedence + href, so many tables on a page mount one <style>. The ring is the
// house --focus-outline, one keyboard vocabulary product-wide (A-053); it draws
// only for keyboard focus, so a pointer scroll or a click into a cell never
// paints it.
const tableCss = `
[data-mw-table-scroller]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

// The overflow stage: a wide table scrolls here, never the page. width 100%
// (v4.8.0): inside a flex parent that aligns flex-start (Card.Body), a widthless
// wrapper shrink-wraps its table to content — the table must always span its card.
const overflowWrapStyle: CSSProperties = {
  overflowX: "auto",
  width: "100%",
  maxWidth: "100%",
};
const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-primary)",
};
const listTableStyle: CSSProperties = { ...tableStyle, tableLayout: "fixed" };
// The header band (v4.8.0 default): a translucent INK WASH, not a fixed surface
// token. The old --background-positive-secondary band was invisible on an app
// canvas (that token IS the app ground); a wash of the primary ink darkens
// whatever the table sits on — app card, marketing page, either theme — so the
// band always separates. The STRONG rule below it is unchanged.
// The sentence head (v6.32.0): no band (on a data surface the band read as a second panel inside
// the panel, the HQ v7 boards), and since v6.35.0 no rule under it either (the owner: "no line
// under the heads"); its rows rule between one another (rowBetweenStyle).
const headBandStyle: CSSProperties = {
  background: "color-mix(in oklab, var(--text-positive-primary) 5%, transparent)",
  borderBottom: "1px solid var(--border-positive-secondary)",
};
// The sentence head: body small, secondary ink, no transform, no band and no rule.
const thSentenceStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  fontWeight: "inherit",
  color: "var(--text-positive-secondary)",
};
const thStyle: CSSProperties = {
  padding: "var(--space-xs) var(--space-md)",
  fontWeight: "inherit",
};
// Group eyebrow band: same tint as the header, hairline below, the mono voice.
const groupBandStyle: CSSProperties = {
  background: "var(--background-positive-secondary)",
  borderBottom: "1px solid var(--border-positive-primary)",
};
const groupThStyle: CSSProperties = {
  padding: "var(--space-2xs) var(--space-md)",
  textAlign: "left",
  fontWeight: "inherit",
};
const groupInnerStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-xs)",
};
// 6px kind dot (structural geometry, like LegendDot's 8px glyph); a circle is
// structural, so 50% not the radius dial.
const groupDotStyle: CSSProperties = {
  width: "0.375rem",
  height: "0.375rem",
  borderRadius: "var(--radius-full)",
  flexShrink: 0,
};
// Row rules: the data-table law's sanctioned hairlines.
const rowStyle: CSSProperties = {
  borderBottom: "1px solid var(--border-positive-primary)",
};
// The sentence head's and the list's rule: on the top edge of every row but a body's first.
const rowBetweenStyle: CSSProperties = {
  borderTop: "1px solid var(--border-positive-primary)",
};
// Content-row cells (v4.8.0): middle-aligned (the new default — a cell's text
// centers against a sibling cell's control), with a HEIGHT FLOOR so a row
// holding a small control (--control-size-sm) is exactly as tall as a text-only
// row — uniform rows regardless of what a cell carries. td height acts as
// min-height in HTML tables, so wrapping cells still grow legitimately. The
// floor rides ONLY these content <td>s — header and group-eyebrow rows render
// <th> and keep their own slim rhythm.
const tdStyle: CSSProperties = {
  padding: "var(--space-xs) var(--space-md)",
  verticalAlign: "middle",
  height: "calc(var(--control-size-sm) + 2 * var(--space-xs))",
};
// The list density: the comfortable floor, the columns sm apart rather than md (a head-less
// grid list reads its columns by alignment, and nine columns at md spent a third of the row on
// gutters; the boards' list runs about 20 px between columns).
const tdListStyle: CSSProperties = {
  padding: "var(--space-xs) var(--space-sm)",
  verticalAlign: "middle",
  height: "calc(var(--control-size-sm) + 2 * var(--space-xs))",
};
// The compact density: tighter pad + floor for dense data surfaces.
const tdCompactStyle: CSSProperties = {
  padding: "var(--space-2xs) var(--space-sm)",
  verticalAlign: "middle",
  height: "calc(var(--control-size-sm) + 2 * var(--space-2xs))",
};

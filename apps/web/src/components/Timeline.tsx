import { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { DataLabel } from "@/components/DataLabel";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   Timeline — the vertical event list (v3.9.0, from the ArtistHQ
   handoff: Home activity, invoice history, buyer history). Each
   event is a 6px kind-colored dot on a hairline vertical rule,
   with a title, an optional subtitle, and a timestamp in the mono
   metadata voice.

   Kind -> color is a MAPPING PROP (kindColor), so the component
   stays domain-free: the consumer maps its own vocabulary onto
   --status-*-accent (state kinds) or --category-* (group kinds).
   An unmapped kind falls back to the tertiary ink, so a forgotten
   mapping degrades to a quiet neutral dot rather than an error.

   Timestamps are preformatted ReactNodes, not Dates: the component
   never formats dates itself, so it stays a server component with
   no locale/timezone hydration seams; the consumer owns the format
   ("Jul 9", "2 days ago", "09:41").

   Structure: an <ol> (events are ordered), one grid row per item:
   the rail column (dot + connecting rule, decorative) beside the
   content stack. The rule stops at the last dot.

   THE RECORD FEED (v6.30.0, HQ v7 system pass, theme 6). Three
   options that compose with the flat list the sites use:
   - `groupBy="month"` puts a group label per month over its items
     (body small, secondary, "September 2026"), newest first inside
     every group; items after `today` form an "Upcoming" group at the
     top. Grouping needs an `at` date on every item.
   - `today` renders the marker: an accent dot on the spine, "Today"
     as a mono figure in the accent with the date beside it, between
     Upcoming and the current month.
   - the three RESERVED kinds give the dot a meaning before any
     mapping: `record` (a touch, a milestone, a decision) is a filled
     dot in the primary ink; `fact` (a read-back, a deploy read from
     a provider) is a HOLLOW dot, a ring in the secondary border on
     the page ground; `money` (an invoice, a payment) is a filled dot
     in the accent. `kindColor` still wins for the sites' own kinds.
   Per item, the record shape adds `at` (the date, which also feeds
   a 4 rem date column left of the spine as a mono stamp when `date`
   is set), `label` (the line above the title, body small secondary:
   "Touch, outbound, email · Manuel J. Diaz"), `by` (the stamp under
   it: "by Ali, 09:12") and `href` (the title becomes a link). The
   original `timestamp` still renders on the title's baseline when
   given; a record feed passes `date` instead.
   ============================================================ */

export interface TimelineItem {
  /** The event kind, looked up in kindColor for the dot ink. The reserved kinds `record`,
   *  `fact` and `money` carry their own dot (v6.30.0) unless kindColor maps them. */
  kind: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Preformatted timestamp; renders in the mono metadata voice on the title's baseline. */
  timestamp?: ReactNode;
  /** The instant (v6.30.0): what `groupBy="month"` groups on and what `today` compares to. */
  at?: Date;
  /** The preformatted date for the DATE COLUMN left of the spine ("12 Sep"); a mono stamp. */
  date?: ReactNode;
  /** The line above the title, body small secondary: the kind, direction and channel. */
  label?: ReactNode;
  /** The provenance line under the title, a mono stamp: "by Ali, 09:12". */
  by?: ReactNode;
  /** The title becomes a link to the record. */
  href?: string;
}

export interface TimelineProps {
  items: TimelineItem[];
  /** Kind -> color token for the dot, e.g. { paid: "var(--status-success-accent)" }.
      Unmapped kinds render the tertiary neutral dot; the reserved kinds their own. */
  kindColor?: Record<string, string>;
  /** Accessible name for the list. */
  ariaLabel?: string;
  /** "month" (v6.30.0): a group label per month, "Upcoming" first when any item is after
   *  `today`. Needs `at` on every item; items without one fall into the last group. */
  groupBy?: "month";
  /** The today marker (v6.30.0), and the split between Upcoming and the past. Pass the
   *  preformatted date as `todayLabel`; the component never formats a date itself. */
  today?: Date;
  /** The date beside "Today" on the marker, preformatted ("Wed 23 Sep · day 11 of 181"). */
  todayLabel?: ReactNode;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Group = { key: string; label: string | null; items: TimelineItem[]; upcoming?: boolean };

// The three reserved dots; a mapped kind wins, an unmapped one falls to the tertiary dot.
function dotStyleFor(item: TimelineItem, kindColor?: Record<string, string>): CSSProperties {
  const mapped = kindColor?.[item.kind];
  if (mapped) return { ...dotStyle, background: mapped };
  if (item.kind === "fact") return hollowDotStyle;
  if (item.kind === "money") return { ...dotStyle, background: "var(--accent-base)" };
  if (item.kind === "record") return { ...dotStyle, background: "var(--text-positive-primary)" };
  return { ...dotStyle, background: "var(--text-positive-tertiary)" };
}

export function Timeline({ items, kindColor, ariaLabel, groupBy, today, todayLabel }: TimelineProps) {
  const hasDateColumn = items.some((i) => i.date != null);

  // Grouping: the month key of each item's `at` (UTC, so the server and the client agree),
  // upcoming first, then the months newest first, items inside a group in the order given.
  let groups: Group[];
  if (groupBy === "month") {
    const byKey = new Map<string, Group>();
    const upcoming: TimelineItem[] = [];
    const undated: TimelineItem[] = [];
    for (const item of items) {
      if (!item.at) { undated.push(item); continue; }
      if (today && item.at.getTime() > today.getTime()) { upcoming.push(item); continue; }
      const key = `${item.at.getUTCFullYear()}-${item.at.getUTCMonth()}`;
      const g = byKey.get(key) ?? { key, label: `${MONTHS[item.at.getUTCMonth()]} ${item.at.getUTCFullYear()}`, items: [] };
      g.items.push(item);
      byKey.set(key, g);
    }
    groups = [...byKey.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
    if (upcoming.length) groups.unshift({ key: "upcoming", label: "Upcoming", items: upcoming, upcoming: true });
    if (undated.length) groups.push({ key: "undated", label: null, items: undated });
  } else {
    groups = [{ key: "all", label: null, items }];
  }

  // The today marker sits after Upcoming (or first when there is none) and only when the
  // feed is grouped; a flat list has no timeline of its own to mark.
  const markerAfter = groupBy === "month" && today ? (groups[0]?.upcoming ? 0 : -1) : null;

  const renderItem = (item: TimelineItem, key: string, last: boolean) => (
    <li key={key} style={hasDateColumn ? itemWithDateStyle : itemStyle}>
      {hasDateColumn ? <span style={dateColumnStyle}>{item.date}</span> : null}
      {/* The rail: dot + the hairline rule down to the next dot.
          Decorative; the kind reaches AT through the text content. */}
      <span aria-hidden="true" style={railStyle}>
        {/* C-10, MEASURED AND SANCTIONED 27 Aug 2026, no change.
            The finding read "--text-positive-tertiary is a TEXT token doing a decorative
            job on a rail". True as a name, wrong as a fix. probe-cleanups.mjs, leg 2,
            measured the fallback dot against the ground it actually paints on:
              6.89:1 light (#445462 on #eff1f3), 6.90:1 dark (#90a0ae on #101417).
            and every replacement that already exists, on the same rail, same ground:
              --border-positive-secondary  1.42:1 light, 1.58:1 dark
              --border-positive-primary    1.18:1 light, 1.22:1 dark
              --category-7                 9.39:1 light, 9.41:1 dark (re-measured
                                           30 Aug after D40 remapped the slot; it was 2.37
                                           light / 11.03 dark when this note was written, so
                                           the CONTRAST objection to it is gone. The other
                                           objection stands and is the deciding one: it would
                                           claim the unmapped kind IS a chart category.)
            All three land under the 3:1 non-text floor in at least one theme, so every
            available swap makes the dot harder to see, and --category-7 would additionally
            claim the unmapped kind IS a chart category. There is no --icon-* family here:
            a small mark takes a text token by house idiom, and thirteen other components
            already read this exact token as a border-color (every field's hover edge).
            A quiet dot at ~6.9:1 is the intended reading of "degrades to a quiet neutral".

            RE-CONFIRMED 30 Aug 2026 (D42). An audit reported C-10 as open again, having
            read the token NAME without reading this note, and the owner chose the border
            family. Not applied: the measurement above is what the border family costs,
            1.18:1, and a decision taken against a name rather than a number is not a
            decision to honour. If C-10 is raised a third time, the answer is this block.
            The v6.30.0 hollow FACT dot is a ring in the secondary border by design: it is
            a shape, not a fill, and the ring reads against the ground the spine does. */}
        <span style={dotStyleFor(item, kindColor)} />
        {!last ? <span style={ruleStyle} /> : null}
      </span>
      <span style={{ ...contentStyle, paddingBottom: last ? 0 : "var(--space-sm)" }}>
        {item.label ? <span style={labelStyle}>{item.label}</span> : null}
        <span style={headRowStyle}>
          {item.href ? (
            <Link href={item.href} style={titleLinkStyle}>{item.title}</Link>
          ) : (
            <span style={titleStyle}>{item.title}</span>
          )}
          {item.timestamp != null ? <DataLabel>{item.timestamp}</DataLabel> : null}
        </span>
        {item.subtitle ? <span style={subtitleStyle}>{item.subtitle}</span> : null}
        {item.by ? <span style={stampStyle}>{item.by}</span> : null}
      </span>
    </li>
  );

  const marker = (
    <li key="today" style={hasDateColumn ? itemWithDateStyle : itemStyle} data-mw-timeline-today="">
      {hasDateColumn ? <span style={{ ...dateColumnStyle, ...todayFigureStyle }}>Today</span> : null}
      <span aria-hidden="true" style={railStyle}>
        <span style={{ ...dotStyle, background: "var(--accent-base)" }} />
        <span style={ruleStyle} />
      </span>
      <span style={{ ...contentStyle, paddingBottom: "var(--space-sm)" }}>
        <span style={headRowStyle}>
          <span style={subtitleStyle}>{hasDateColumn ? null : <span style={todayFigureStyle}>Today </span>}{todayLabel}</span>
        </span>
      </span>
    </li>
  );

  if (items.length === 0 && !today) return null;

  return (
    <ol aria-label={ariaLabel} style={listStyle} role="list" data-mw-timeline="" data-group-by={groupBy}>
      {markerAfter === -1 ? marker : null}
      {groups.map((g, gi) => (
        <li key={g.key} style={groupStyle}>
          {g.label ? <span style={groupLabelStyle}>{g.label}</span> : null}
          <ol style={listStyle} role="list">
            {g.items.map((item, i) => renderItem(item, `${g.key}-${i}`, gi === groups.length - 1 && i === g.items.length - 1))}
          </ol>
          {markerAfter === gi ? <ol style={listStyle} role="list">{marker}</ol> : null}
        </li>
      ))}
    </ol>
  );
}

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
};
// A month group: the label binds to its first item at xs; groups sit lg apart (item to item
// is sm, so the group break is two rungs up, the ladder's subgroup rung).
const groupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
  paddingBottom: "var(--space-lg)",
};
const groupLabelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-secondary)",
};
const itemStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  columnGap: "var(--space-sm)",
};
// The date column: 4 rem, right-aligned, a mono stamp on the title's first line.
const itemWithDateStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "4rem auto 1fr",
  columnGap: "var(--space-sm)",
};
const dateColumnStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-positive-tertiary)",
  textAlign: "right",
  paddingTop: "var(--space-2xs)",
  lineHeight: "var(--leading-snug)",
  whiteSpace: "nowrap",
};
const todayFigureStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  color: "var(--accent-base)",
  fontWeight: tokenNumber("var(--weight-medium)"),
};
// The rail column: the dot centers on the title's first line, the rule fills
// the remaining height so consecutive dots read as one thread.
const railStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)", // dot -> rule; the rail owns it (v5.5.0: was a marginTop on the rule)
  alignItems: "center",
  // Optical alignment: half the title line-height minus half the dot,
  // approximated with the micro space token so the dot sits on the first line.
  paddingTop: "var(--space-2xs)",
};
// 6px dot (structural geometry, the group-dot glyph); circles are structural.
const dotStyle: CSSProperties = {
  width: "0.375rem",
  height: "0.375rem",
  borderRadius: "var(--radius-full)",
  flexShrink: 0,
};
// The hollow FACT dot: the same 6px geometry as a ring, the rule weight in the secondary
// border, transparent inside so the page ground shows through.
const hollowDotStyle: CSSProperties = {
  ...dotStyle,
  boxSizing: "border-box",
  background: "transparent",
  border: "var(--rule-weight) solid var(--border-positive-secondary)",
};
// The connecting hairline, in the same ink as the table's row rules.
const ruleStyle: CSSProperties = {
  flex: 1,
  width: "var(--rule-weight)",
  background: "var(--border-positive-secondary)",
};
const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  minWidth: 0,
};
const headRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "var(--space-md)",
  flexWrap: "wrap",
};
const labelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-secondary)",
};
const titleStyle: CSSProperties = {
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-primary)",
  fontWeight: tokenNumber("var(--weight-medium)"),
};
const titleLinkStyle: CSSProperties = {
  ...titleStyle,
  color: "var(--accent-ink)",
  textDecoration: "none",
};
const subtitleStyle: CSSProperties = {
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-secondary)",
};
// The stamp (theme 7): mono 2xs, tertiary, tabular; provenance, never bold.
const stampStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  fontVariantNumeric: "tabular-nums",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-tertiary)",
};

import { CSSProperties, ReactNode } from "react";
import { DataLabel } from "@/components/DataLabel";
import { srOnly, tokenNumber } from "@/components/internal/styles";

/* ============================================================
   DiaryEntry — the day-grouped entry list (v3.10.0, from the ArtistHQ
   handoff: the practice log, a piece's sittings, a technique's
   history. Time, what happened, how long it took).

   Each row is time | content | duration: the time in the mono
   metadata voice, the title in the body voice with an optional
   display-italic quote (the honest line read back) and a mono meta
   line, and the duration as a display-face figure on the right (the
   PriceLabel / Stat figure convention: face + medium weight +
   tabular numerals, size inherited).

   groupByDay buckets CONSECUTIVE entries by their `day` string (the
   Table groupBy discipline: the consumer owns order and the banner
   wording, "Wednesday · July 9") under a sticky mono day banner
   dressed exactly like Table's group band: the tint ground, the
   hairline rule, the DataLabel secondary voice. Sticky, so the day
   stays legible while its entries scroll.

   Rows keep their hairline rules (the diary is a record, the
   data-table law's spirit). Server component.
   ============================================================ */

export interface DiaryEntryItem {
  /** The mono time, e.g. "9:40 am". */
  time: string;
  title: ReactNode;
  /** The display-italic line quoted back from the entry. */
  quote?: string;
  /** The mono metadata line (piece, technique, location). */
  meta?: ReactNode;
  /** The display-face figure on the right, e.g. "1.5 hrs". */
  duration: string;
  /** The day banner text this entry belongs under (groupByDay). Consumer-worded. */
  day?: string;
}

export interface DiaryEntryProps {
  entries: DiaryEntryItem[];
  /** Buckets consecutive entries by `day` under sticky mono day banners. */
  groupByDay?: boolean;
  /** Accessible name for the list. Default "Diary". */
  ariaLabel?: string;
}

export function DiaryEntry({ entries, groupByDay = false, ariaLabel = "Diary" }: DiaryEntryProps) {
  // Bucket CONSECUTIVE entries (the Table groupBy discipline): grouping never
  // reorders data; the consumer supplies entries already in day order.
  const buckets: { day: string | null; items: { item: DiaryEntryItem; index: number }[] }[] = [];
  entries.forEach((item, index) => {
    const day = groupByDay ? item.day ?? null : null;
    const last = buckets[buckets.length - 1];
    if (last && last.day === day) last.items.push({ item, index });
    else buckets.push({ day, items: [{ item, index }] });
  });

  return (
    <div role="list" aria-label={ariaLabel} style={rootStyle}>
      {buckets.map((bucket, b) => (
        // role=presentation: the day-bucket wrapper must not sit as a generic
        // element between role=list and its role=listitem rows, or it breaks the
        // list tree. Presentational, so the rows attach straight to the list.
        <div key={b} role="presentation">
          {bucket.day != null ? (
            // The sticky day banner: Table's group band dress (tint ground,
            // hairline, the mono secondary voice), pinned while its day scrolls.
            <div aria-hidden="true" style={dayBannerStyle}>
              <DataLabel tone="secondary">{bucket.day}</DataLabel>
            </div>
          ) : null}
          {bucket.items.map(({ item, index }) => (
            <div role="listitem" key={index} style={rowStyle}>
              <span style={timeStyle}>{item.time}</span>
              <span style={contentStyle}>
                <span style={titleStyle}>
                  {/* Banners are aria-hidden decoration, so each entry still
                      carries its day for AT reading the list flat. */}
                  {bucket.day != null ? <span style={srOnly}>{bucket.day}, </span> : null}
                  {item.title}
                </span>
                {item.quote ? <span style={quoteStyle}>{item.quote}</span> : null}
                {item.meta ? <DataLabel as="span">{item.meta}</DataLabel> : null}
              </span>
              <span style={durationStyle}>{item.duration}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  width: "100%",
};

// Table's group band, made sticky: the day holds the top edge while its
// entries scroll beneath it.
const dayBannerStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  background: "var(--background-positive-secondary)",
  borderBottom: "1px solid var(--border-positive-primary)",
  padding: "var(--space-2xs) var(--space-md)",
};

// time | content | duration. Rows keep their hairline (the record's rule).
const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: "var(--space-md)",
  alignItems: "baseline",
  padding: "var(--space-xs) var(--space-md)",
  borderBottom: "1px solid var(--border-positive-primary)",
};

const timeStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-positive-tertiary)",
  lineHeight: "var(--leading-snug)",
  whiteSpace: "nowrap",
};

// The within-item micro stack: title, quote, meta at the tightest rung.
const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-primary)",
};

// --font-quote, not --font-display (D28): the quoted-italic lever, defaulting to the display
// face. The duration below is an UPRIGHT display figure, so it keeps --font-display.
const quoteStyle: CSSProperties = {
  fontFamily: "var(--font-quote)",
  fontStyle: "italic",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};

// The display-face figure (the PriceLabel / Stat convention): face + medium
// weight + tabular numerals; the size stays the row's own.
const durationStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  letterSpacing: "var(--tracking-snug)",
  fontVariantNumeric: "tabular-nums",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-primary)",
  whiteSpace: "nowrap",
};

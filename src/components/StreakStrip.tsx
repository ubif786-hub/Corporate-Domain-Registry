import { CSSProperties } from "react";

/* ============================================================
   StreakStrip — the contribution heatmap (v3.10.0, from the ArtistHQ
   handoff: Home 7-day streak, Learn 16-week practice grid).

   Two variants: compact is a single 7-day row with weekday letters above the
   cells; long is the 16-week grid, one column per week flowing top-to-bottom
   (7 rows). Cells map value 0..4 onto the --heat-0..4 ramp, which rides the
   brand raws, so fork heatmaps rebrand automatically and the dark mirror
   inverts perceptually.

   Dates are ISO strings (YYYY-MM-DD), never Date objects: comparison against
   `today` is plain string ordering and the weekday letter derives via UTC, so
   the component stays a server component with no locale or timezone hydration
   seams. Cells after `today` are FUTURE (planned): dashed border, no fill.
   The `today` cell carries the accent marker ring.

   PRM-safe by construction: the strip renders statically, no fill animation,
   nothing to suppress under prefers-reduced-motion or the still motion dial.

   Accessible: the strip is a single labelled figure. A wrapper carries role
   img with a name computed from the DATA, and the cell grid under it is
   aria-hidden: role img is Children Presentational in ARIA 1.2, so nothing
   inside the figure (cells, weekday letters, the title tooltips) reaches
   assistive tech, and the name has to carry the meaning. compact keeps the
   short headline ("Activity: N of M days active"); long appends the
   per-level day counts, because the 0..4 ramp is otherwise colour alone.
   ariaLabel replaces the headline sentence, and the long breakdown still
   follows it. The per-cell title tooltips are a pointer convenience for
   sighted users, not the accessibility story (AX-14, 26 Aug 2026).
   ============================================================ */

export type StreakValue = 0 | 1 | 2 | 3 | 4;

export interface StreakCell {
  /** ISO date, YYYY-MM-DD. Chronological order expected. */
  date: string;
  /** Intensity 0 (empty) to 4 (max), onto --heat-0..4. */
  value: StreakValue;
}

export interface StreakStripProps {
  /** compact = 7-day row with day letters; long = 16-week grid. */
  variant?: "compact" | "long";
  data: StreakCell[];
  /** ISO date. Cells after it render dashed (planned); the matching cell gets the marker ring. */
  today?: string;
  /** The less-to-more ramp legend. */
  showLegend?: boolean;
  /** Weekday letters over the compact row. Compact only. */
  showDayLabels?: boolean;
  /** Replaces the computed headline ("Activity: N of M days active"). The long variant's per-level breakdown still follows it. */
  ariaLabel?: string;
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

// UTC weekday from an ISO date: deterministic on server and client, no locale.
function dayLetter(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return DAY_LETTERS[day] ?? "";
}

const days = (n: number) => (n === 1 ? "day" : "days");

// The ramp, spoken: how many logged days sit at each level (most intense first), the empty days,
// then the planned cells. No consumer can write this by hand, so it rides the long variant's name
// under a consumer ariaLabel too.
function levelBreakdown(logged: StreakCell[], planned: number): string {
  const counts = [0, 0, 0, 0, 0];
  for (const c of logged) counts[c.value] += 1;
  const parts: string[] = [];
  for (const level of [4, 3, 2, 1] as const) {
    if (counts[level] > 0) parts.push(`${counts[level]} ${parts.length ? "" : `${days(counts[level])} `}at level ${level}`);
  }
  if (counts[0] > 0) parts.push(`${counts[0]} ${parts.length ? "" : `${days(counts[0])} `}with no activity`);
  const levels = parts.length ? `Intensity by level, 4 the highest: ${parts.join(", ")}.` : "";
  const ahead = planned > 0 ? `${planned} ${days(planned)} planned.` : "";
  return [levels, ahead].filter(Boolean).join(" ");
}

export function StreakStrip({
  variant = "compact",
  data,
  today,
  showLegend = false,
  showDayLabels = true,
  ariaLabel,
}: StreakStripProps) {
  const compact = variant === "compact";
  const logged = today ? data.filter((c) => c.date <= today) : data;
  const active = logged.filter((c) => c.value > 0).length;
  const headline = ariaLabel ?? `Activity: ${active} of ${logged.length} days active`;
  const breakdown = compact ? "" : levelBreakdown(logged, data.length - logged.length);
  const summary = breakdown ? `${headline.replace(/[.\s]+$/, "")}. ${breakdown}` : headline;
  const cellSize = compact ? "var(--space-lg)" : "var(--space-sm)";

  const cell = (c: StreakCell) => {
    const future = Boolean(today && c.date > today);
    const isToday = Boolean(today && c.date === today);
    return (
      <span
        key={c.date}
        title={future ? `${c.date} · planned` : `${c.date} · level ${c.value} of 4`}
        style={{
          ...cellBaseStyle,
          width: cellSize,
          height: cellSize,
          background: future ? "transparent" : `var(--heat-${c.value})`,
          border: future ? "1px dashed var(--border-positive-secondary)" : "none",
          boxShadow: isToday
            ? "0 0 0 1px var(--background-positive-primary), 0 0 0 2px var(--accent-base)"
            : undefined,
        }}
      />
    );
  };

  return (
    <div data-mw-streak-strip={variant} style={rootStyle}>
      <div role="img" aria-label={summary}>
        {compact ? (
          <div style={compactRowStyle} aria-hidden="true">
            {data.map((c) => (
              <span key={c.date} style={compactColStyle}>
                {showDayLabels ? <span style={dayLabelStyle}>{dayLetter(c.date)}</span> : null}
                {cell(c)}
              </span>
            ))}
          </div>
        ) : (
          <div style={longGridStyle} aria-hidden="true">
            {data.map(cell)}
          </div>
        )}
      </div>

      {showLegend ? (
        <div style={legendStyle} aria-hidden="true">
          <span style={legendLabelStyle}>Less</span>
          {([0, 1, 2, 3, 4] as const).map((v) => (
            <span key={v} style={{ ...cellBaseStyle, ...legendSwatchStyle, background: `var(--heat-${v})` }} />
          ))}
          <span style={legendLabelStyle}>More</span>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
  alignItems: "flex-start",
};

const cellBaseStyle: CSSProperties = {
  display: "block",
  boxSizing: "border-box",
  // The capped mark radius: the raw dial turned the 13px cells into circles at
  // soft and the 26px compact cells into circles at pronounced, reading the
  // contribution grid as a dot matrix (and dashed "planned" cells as dashed
  // circles). A heat CELL is a cell at every dial.
  borderRadius: "var(--control-mark-radius)",
};

const compactRowStyle: CSSProperties = {
  display: "flex",
  gap: "var(--space-2xs)",
};

const compactColStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  alignItems: "center",
};

const dayLabelStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-positive-tertiary)",
  lineHeight: "var(--leading-snug)",
};

// One column per week, flowing top-to-bottom: 7 rows, auto columns.
const longGridStyle: CSSProperties = {
  display: "grid",
  gridAutoFlow: "column",
  gridTemplateRows: "repeat(7, var(--space-sm))",
  gridAutoColumns: "var(--space-sm)",
  gap: "var(--space-3xs)",
};

const legendStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3xs)",
};

const legendSwatchStyle: CSSProperties = {
  width: "var(--space-sm)",
  height: "var(--space-sm)",
};

const legendLabelStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-positive-tertiary)",
  padding: "0 var(--space-3xs)",
};

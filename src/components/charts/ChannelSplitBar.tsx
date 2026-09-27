import { CSSProperties } from "react";
import { LegendDot } from "@/components/LegendDot";
import { percentSpeech, percentText, percentages } from "@/components/internal/percentages";

/* ============================================================
   ChannelSplitBar — the horizontal stacked single bar (Sprint 3B, the
   ArtistHQ series-performance split). One full-width track whose
   segments size proportionally to their values, with an optional
   legend of square LegendDots below carrying the computed percentages
   in the mono label voice.

   Segment colors arrive as DATA (--category-* / --accent-base token
   expressions or product hexes, the chart-series exception); the
   component's own dress stays token-pure.

   MINIMUM SLIVER: a segment under ~4% of the total would vanish at
   card widths, so every segment keeps a 4px minimum width (a
   structural floor, not a spacing token). Widths stay proportional
   otherwise; the legend percentages always speak the true numbers.

   Percentages come from the shared internal/percentages helper (also
   DonutChart's): largest remainder, so they sum to exactly 100 where
   plain rounding lands on 99 or 101, computed once and fed to the
   legend, each segment's title and the aria-label alike. A non-zero
   channel that rounds to 0 is still drawn (the sliver floor above), so
   it reads "<1%" (spoken "less than 1 percent"), never "0%".

   Static by construction: no animation, no hover state, PRM-safe.
   Server component; the SR story is the wrapper's aria-label (the
   chart contract), with the visual bar hidden from AT.
   ============================================================ */

export interface ChannelSplitSegment {
  label: string;
  value: number;
  /** Color token expression or hex, e.g. "var(--category-1)". */
  color: string;
}

export interface ChannelSplitBarProps {
  segments: ChannelSplitSegment[];
  /** Legend of square dots + mono "label · NN%" rows below the bar. */
  showLegend?: boolean;
  /** Accessible name prefix; the computed split is always appended. */
  ariaLabel?: string;
}

export function ChannelSplitBar({
  segments,
  showLegend = true,
  ariaLabel = "Channel split",
}: ChannelSplitBarProps) {
  const pcts = percentages(segments.map((s) => s.value));

  const label = `${ariaLabel}: ${segments
    .map((s, i) => `${s.label} ${percentSpeech(pcts[i], s.value)}`)
    .join(", ")}.`;

  return (
    <div style={wrapStyle} role="img" aria-label={label}>
      <div style={trackStyle} aria-hidden="true">
        {segments.map((s, i) =>
          // ZERO-GUARD (v4.8.0): a zero-value segment paints NOTHING — the 4px
          // sliver floor below is for small NON-ZERO shares only; at zero it
          // painted an orphan coloured chip (the funnel-tick class of bug). The
          // legend still lists the channel at 0%.
          s.value <= 0 ? null : (
            <span
              key={i}
              title={`${s.label} · ${percentText(pcts[i], s.value)}`}
              style={{
                ...segmentStyle,
                // Proportional width via flex-grow; the 4px minimum is the
                // documented sliver floor for sub-4% segments.
                flexGrow: s.value,
                background: s.color,
              }}
            />
          ),
        )}
      </div>
      {showLegend ? (
        <div style={legendRowStyle} aria-hidden="true">
          {segments.map((s, i) => (
            <LegendDot key={i} shape="square" color={s.color}>
              {s.label} · {percentText(pcts[i], s.value)}
            </LegendDot>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- styles ---------- */

const wrapStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  fontFamily: "var(--chart-font)",
};

// 0.75rem track (the handoff's slim split bar; the LegendDot fixed-glyph
// precedent for a small structural size). TRACKS RIDE THE PILL DIAL (v4.8.0,
// owner — rewrites the 15 Jul "a track is a pill" canon): square at sharp like
// every other control, squircle at soft, the classic pill at pronounced. The 15
// Jul worry — full-radius semicircle caps clipping the end segments' visible
// share under overflow:hidden — only ever applied AT full radius, which now
// occurs only at pronounced, where it is the same constant geometry the old
// pill always had. See SESSION_LOG (20 Jul) for the doctrine change.
const trackStyle: CSSProperties = {
  display: "flex",
  width: "100%",
  height: "0.75rem",
  borderRadius: "var(--control-pill-radius, var(--radius-full))",
  overflow: "hidden",
};

const segmentStyle: CSSProperties = {
  flexBasis: 0,
  flexShrink: 0,
  // The minimum visible sliver: segments under ~4% stay legible.
  minWidth: "4px",
};

const legendRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  // row xs, column md (v5.5.0): a wrapped legend's rows must sit tighter than the legend's own
  // sm bind to the track above it; one md gap applied to both axes inverted that.
  gap: "var(--space-xs) var(--space-md)",
};

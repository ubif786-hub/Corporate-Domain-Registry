import { CSSProperties } from "react";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   WordFrequencyCloud — frequency-sized words in the display face
   (Sprint 3B, the ArtistHQ quarterly insights viz). A read-once
   visualization: server component, no interaction, no animation.

   DETERMINISTIC LAYOUT (no randomness, the handoff's hard rule):
   1. Words sort by frequency descending; ties keep input order
      (a stable sort, so equal frequencies never shuffle).
   2. The sorted list is dealt center-out: the largest word seeds the
      sequence, each next word alternates prepend / append around it
      (index 1 before, index 2 after, index 3 before, ...). A centered
      flex-wrap then flows that sequence, so the heaviest words land
      mid-cloud and weight falls off toward both edges.
   Same input, same layout, every render.

   FONT SIZE maps on the SQUARE ROOT of normalized frequency between
   minFontSize and maxFontSize (area rather than height tracks
   frequency, the standard cloud correction so mid-tier words stay
   legible). Sizes are px-in-component by design: like the chart
   family's pixel-space geometry, data-scaled sizes are computed
   values, not type-ramp steps; the documented px exception. A single
   word (or an all-equal list) renders at maxFontSize. The same exception
   covers the word LEADING: every word is a single nowrap span packed row
   by row, so its line box is a packing constant (1.05, just above the
   glyph) rather than a --leading-* rung, which are paragraph measures.

   COLORS arrive as data (word.color, a token expression or hex); an
   unset color cycles --category-1..7 by frequency rank, so the
   palette is theme-safe through the category dark mirrors.

   The SR story is the wrapper's aria-label enumerating word and count
   (the chart contract); the visual flow is aria-hidden so the
   scrambled center-out order is never read aloud.
   ============================================================ */

export interface CloudWord {
  text: string;
  frequency: number;
  /** Color token expression or hex; defaults to the --category-* cycle. */
  color?: string;
}

export interface WordFrequencyCloudProps {
  words: CloudWord[];
  /** Largest word size in px (the px-in-chart exception). */
  maxFontSize?: number;
  /** Smallest word size in px. */
  minFontSize?: number;
  /** Accessible name prefix; the word list is always appended. */
  ariaLabel?: string;
}

const CATEGORY_CYCLE = 7;

export function WordFrequencyCloud({
  words,
  maxFontSize = 96,
  minFontSize = 16,
  ariaLabel = "Word frequency cloud",
}: WordFrequencyCloudProps) {
  // 1. Stable sort by frequency descending (rank drives size and color).
  const ranked = words
    .map((w, i) => ({ ...w, i }))
    .sort((a, b) => b.frequency - a.frequency || a.i - b.i);

  const fMax = ranked[0]?.frequency ?? 0;
  const fMin = ranked[ranked.length - 1]?.frequency ?? 0;
  const span = fMax - fMin;

  const sized = ranked.map((w, rank) => {
    // sqrt of normalized frequency; a flat list renders at max.
    const t = span === 0 ? 1 : Math.sqrt((w.frequency - fMin) / span);
    return {
      text: w.text,
      frequency: w.frequency,
      fontSize: Math.round(minFontSize + (maxFontSize - minFontSize) * t),
      color: w.color ?? `var(--category-${(rank % CATEGORY_CYCLE) + 1})`,
    };
  });

  // 2. Center-out deal: alternate prepend / append around the largest word.
  const flowed: typeof sized = [];
  sized.forEach((w, idx) => {
    if (idx % 2 === 1) flowed.unshift(w);
    else flowed.push(w);
  });

  const label = `${ariaLabel}: ${ranked
    .map((w) => `${w.text} (${w.frequency.toLocaleString()})`)
    .join(", ")}.`;

  return (
    <div role="img" aria-label={label}>
      <div style={cloudStyle} aria-hidden="true">
        {flowed.map((w, i) => (
          <span
            key={`${w.text}-${i}`}
            style={{
              ...wordStyle,
              fontSize: `${w.fontSize}px`,
              color: w.color,
            }}
          >
            {w.text}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- styles ---------- */

const cloudStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
  columnGap: "var(--space-md)",
  rowGap: "var(--space-2xs)",
  textAlign: "center",
};

const wordStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  lineHeight: 1.05, // packing constant, not a leading rung: see the header's px exception
  whiteSpace: "nowrap",
};

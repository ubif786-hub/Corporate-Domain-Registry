import { CSSProperties, ReactNode } from "react";
import { DataLabel } from "@/components/DataLabel";

/* ============================================================
   LegendDot — the documented dot + label idiom (owner, 7 Jul): a small colored
   indicator dot beside a DataLabel. One primitive for every legend and status
   line: chart legends, the HQ calendar legend, and the drill-down status metas,
   which were each hand-rolling the same dot.

   The dot color is a token expression (e.g. "var(--green-base)"), so the
   component stays token-pure by construction while serving arbitrary series
   hues; the text is the DataLabel role (mono, uppercase, tiered). A legend row
   is a flex of LegendDots; the consumer owns layout. Server component.
   ============================================================ */

export interface LegendDotProps {
  /** The dot fill: a color token expression, e.g. "var(--green-base)". */
  color: string;
  /** Label text tier, passed through to DataLabel. */
  tone?: "tertiary" | "secondary";
  /** "square" renders the 8px swatch square instead of the circle (v3.9.0,
   *  the ArtistHQ ChannelDot: series and channel keys read as color chips).
   *  The square wears --component-radius, so at the system's sharp default it
   *  is the handoff's true square and it follows the radius dial elsewhere.
   *  Default "dot". */
  shape?: "dot" | "square";
  children: ReactNode;
}

export function LegendDot({ color, tone = "secondary", shape = "dot", children }: LegendDotProps) {
  return (
    <span style={rowStyle}>
      <span
        style={{
          ...dotStyle,
          background: color,
          // The glyph cap, not the raw dial: on an 8px key the soft dial's 8px+
          // radius rounded "square" into a full circle, pixel-identical to
          // shape="dot" - the one distinction this prop exists to make.
          borderRadius: shape === "square" ? "var(--control-glyph-radius)" : "var(--radius-full)",
        }}
        aria-hidden="true"
      />
      <DataLabel tone={tone}>{children}</DataLabel>
    </span>
  );
}

const rowStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-xs)",
};

// 0.5rem glyph (owner, 7 Jul: the earlier 0.375rem read too small beside the
// label). The 8px box serves both shapes; radius is applied per shape above.
const dotStyle: CSSProperties = {
  width: "0.5rem",
  height: "0.5rem",
  flexShrink: 0,
};

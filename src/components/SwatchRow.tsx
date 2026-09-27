import { CSSProperties } from "react";
import { DataLabel } from "@/components/DataLabel";

/* ============================================================
   SwatchRow — the palette strip (v3.10.0, from the ArtistHQ handoff:
   the piece / series palette row. A flex row of equal-weight color
   blocks, sm for inline chips, lg for the documented palette with
   labels under the blocks in the mono voice).

   Color values are DATA, not styling: a palette arrives from product
   data as tokens or hexes (like chart series colors), so `color` is
   a plain string rendered as given. This is the sanctioned exception
   to the tokens-only rule — the component's own dress (heights, gaps,
   label voice, the definition hairline) stays token-pure; the swatch
   fill is the datum being displayed.

   Sizes ride the space scale as geometry (the Slider / StreakStrip
   precedent): sm is --space-lg + --space-2xs (~28px at the normal
   dial), lg is --space-2xl + --space-xs (~56px), so the strip
   breathes with the spacing dial. Blocks are flex: 1, equal weight
   regardless of count. An inset hairline keeps a near-ground swatch
   readable on its own ground.

   Accessible: the row is one figure (role img), so the palette reads
   as a unit, and since role img is Children Presentational in ARIA
   1.2 nothing inside it is read on its own. The name therefore
   carries the swatches: the joined labels (or colors) by default, and
   with an explicit ariaLabel plus lg captions showing,
   "<ariaLabel>: <caption>, <caption>" for the swatches that render a
   caption (AX-14, 26 Aug 2026). Block titles stay a pointer tooltip.

   Server component.
   ============================================================ */

export interface SwatchRowSwatch {
  /** The rendered fill: a token ("var(--category-3)") or a product hex. Data, not styling. */
  color: string;
  /** Names the swatch: the tooltip, the aria name, and (lg + showLabels) the mono caption. */
  label?: string;
}

export interface SwatchRowProps {
  swatches: SwatchRowSwatch[];
  /** sm ~28px inline chips; lg ~56px palette blocks. Default sm. */
  size?: "sm" | "lg";
  /** Mono captions under the blocks. lg only (sm has no room for a readable label). */
  showLabels?: boolean;
  /** Accessible name for the row, e.g. "Harbor palette". With lg captions showing, the caption names are composed after it. */
  ariaLabel?: string;
}

// Space tokens as geometry: 24+4 = ~28px, 48+8 = ~56px at the normal dial.
const sizeHeight: Record<"sm" | "lg", string> = {
  sm: "calc(var(--space-lg) + var(--space-2xs))",
  lg: "calc(var(--space-2xl) + var(--space-xs))",
};

// One naming rule for the tooltip, the default name, and the caption composition.
const swatchName = (s: SwatchRowSwatch) => s.label ?? s.color;

export function SwatchRow({ swatches, size = "sm", showLabels = false, ariaLabel }: SwatchRowProps) {
  const labelled = showLabels && size === "lg";
  // Only the swatches that actually render a caption are composed after an explicit ariaLabel;
  // the default name already joins every swatch, and an empty ariaLabel still wins as before.
  const captions = labelled ? swatches.filter((s) => s.label).map(swatchName) : [];
  const name =
    ariaLabel == null
      ? swatches.map(swatchName).join(", ")
      : ariaLabel && captions.length > 0
        ? `${ariaLabel}: ${captions.join(", ")}`
        : ariaLabel;
  return (
    <div data-mw-swatch-row="" role="img" aria-label={name} style={rowStyle}>
      {swatches.map((s, i) => (
        <div key={i} style={colStyle}>
          <span
            title={swatchName(s)}
            style={{
              ...blockStyle,
              height: sizeHeight[size],
              background: s.color,
            }}
          />
          {labelled && s.label ? <DataLabel as="div">{s.label}</DataLabel> : null}
        </div>
      ))}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rowStyle: CSSProperties = {
  display: "flex",
  gap: "var(--space-2xs)",
  alignItems: "stretch",
  width: "100%",
};

// Equal weight regardless of count; labels stack under their block.
const colStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
};

const blockStyle: CSSProperties = {
  display: "block",
  borderRadius: "var(--component-radius)",
  // The definition hairline: a near-ground swatch stays visible on its own ground.
  boxShadow: "inset 0 0 0 1px var(--border-positive-primary)",
};

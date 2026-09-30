import { CSSProperties, ReactNode } from "react";

/* ============================================================
   HeroBanner — the gradient banner band (Sprint 3A, from the
   ArtistHQ handoff: the ~180px full-width head of a series or
   course detail page, its gradient built from the subject's own
   palette).

   Color stops are DATA, not styling (the SwatchRow / chart-series
   exception): a palette arrives from product data as tokens or
   hexes and is rendered as given, so the banner is the palette
   speaking, not a themed surface. The banner's own dress (height,
   radius, the badge row, the overlay scrim) stays token-pure.

   Height rides a fluid clamp to ~180px (the reference's fixed
   180 translated per the fluid-first law: no mid-range
   breakpoint, the band just breathes down on narrow viewports).
   Pass any CSS length (ideally token-based) to override.

   overlayText is bottom-anchored on the inverse ink scrim: a
   gradient of --background-negative-primary rising under the
   text with --text-on-negative ink (the IdChip inverse-voice
   precedent), so the line stays readable over ANY stop palette
   and keeps mirroring with the theme. badges render as a row in
   the top-left corner; compose Badge / IdChip there.

   Server component. The gradient paints on its own absolutely
   positioned layer under the two slots, and ariaLabel names THAT
   layer (role img) when the palette itself carries meaning
   ("Harbor series palette"). The root stays a plain div on
   purpose: role img is Children Presentational in ARIA 1.2, so a
   named root swallowed the badges and the overlay line from the
   accessibility tree (AX-14, 26 Aug 2026). Without ariaLabel the
   layer is decorative and the overlay text carries the meaning.
   ============================================================ */

export interface HeroBannerProps {
  /** 2-5 gradient stops: tokens ("var(--category-1)") or product hexes. Data, not styling. */
  stops: string[];
  /** CSS length for the band height. Default a fluid clamp to ~180px. */
  height?: string;
  /** Top-left corner row; compose Badge / IdChip nodes. */
  badges?: ReactNode[];
  /** Bottom-anchored line over the ink scrim (a title, a meta row). */
  overlayText?: ReactNode;
  /** Names the gradient layer (role img) when the palette itself carries meaning. Badges and overlayText stay in the accessibility tree either way. */
  ariaLabel?: string;
}

// The reference's 180px, fluid-first: full presence from tablet up, breathing
// down to ~136px on a phone without a breakpoint.
const DEFAULT_HEIGHT = "clamp(8.5rem, 7rem + 3vw, 11.25rem)";

export function HeroBanner({ stops, height = DEFAULT_HEIGHT, badges, overlayText, ariaLabel }: HeroBannerProps) {
  // A CSS gradient needs two stops; a one-color palette paints flat.
  const gradientStops = stops.length === 1 ? [stops[0], stops[0]] : stops;

  const rootStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    height,
    borderRadius: "var(--component-radius)",
  };

  const gradientStyle: CSSProperties = {
    ...gradientLayerStyle,
    background: `linear-gradient(135deg, ${gradientStops.join(", ")})`,
  };

  return (
    <div data-mw-hero-banner="" style={rootStyle}>
      {/* The image role lives on the gradient layer, never on the root, so the slots after it
          stay in the accessibility tree (role img makes its children presentational). */}
      <div
        data-mw-hero-banner-gradient=""
        role={ariaLabel ? "img" : undefined}
        aria-label={ariaLabel}
        style={gradientStyle}
      />
      {badges && badges.length > 0 ? (
        <div style={badgeRowStyle}>
          {badges.map((badge, i) => (
            <span key={i} style={badgeItemStyle}>
              {badge}
            </span>
          ))}
        </div>
      ) : null}
      {overlayText != null ? <div style={overlayStyle}>{overlayText}</div> : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

// The gradient layer fills the band's box under the slots; the root's overflow and radius clip it.
const gradientLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
};

const badgeRowStyle: CSSProperties = {
  position: "absolute",
  top: "var(--space-sm)",
  left: "var(--space-sm)",
  right: "var(--space-sm)",
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-2xs)",
};

const badgeItemStyle: CSSProperties = {
  display: "inline-flex",
};

// The inverse ink scrim (IdChip's voice as a gradient): enough ink at the foot
// to hold the text over any palette, fading to nothing by mid-band so the
// stops stay the subject. The negative pair mirrors with the theme.
const overlayStyle: CSSProperties = {
  position: "absolute",
  insetInline: 0,
  bottom: 0,
  padding: "var(--space-xl) var(--space-md) var(--space-sm)",
  background:
    "linear-gradient(to top, color-mix(in srgb, var(--background-negative-primary) 72%, transparent), transparent)",
  color: "var(--text-on-negative)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
};

import { CSSProperties, ReactNode } from "react";

/* ============================================================
   IdChip — the mono identifier chip (v3.9.0; the ArtistHQ
   handoff's InventoryChip, generalized: "CM-2026-013" on a piece
   image, an order id, a SKU). Mono micro type on the inverse
   scrim ground: --background-negative-primary at 78% over
   transparent with --text-on-negative ink, the reference's
   rgba-ink-over-imagery treatment spoken in tokens. The negative
   pair mirrors with the theme (dark scrim + light text on light,
   light scrim + dark text on dark), so the chip stays the
   system's inverse voice and stays readable over imagery on
   both. No transform: identifiers are literal. Radius is the
   dial's --component-radius, nothing more.

   Corner anchoring is the CONSUMER's: the chip is a plain
   inline element; position it absolute inside a relative image
   frame (see the docs example).
   ============================================================ */

export interface IdChipProps {
  children: ReactNode;
}

export function IdChip({ children }: IdChipProps) {
  return <span style={chipStyle}>{children}</span>;
}

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  lineHeight: "var(--leading-snug)",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-on-negative)",
  // The inverse scrim: enough ink to hold contrast over any photograph,
  // enough transparency to admit the image beneath (the reference's 75%).
  background: "color-mix(in srgb, var(--background-negative-primary) 78%, transparent)",
  borderRadius: "var(--component-radius)",
  padding: "var(--space-3xs) var(--space-2xs)",
  whiteSpace: "nowrap",
};

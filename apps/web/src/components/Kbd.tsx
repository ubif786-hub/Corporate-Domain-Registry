import { CSSProperties, ReactNode } from "react";

/* ============================================================
   Kbd — the inline keyboard hint (v3.9.0, from the ArtistHQ
   handoff: modal footers, command palette, help copy). A real
   <kbd> element in the mono micro voice on a subtle ink wash:
   6% of --text-positive-primary over transparent, so the ground
   self-mirrors per theme (faint ink on light, faint paper on
   dark) without a dedicated token. A hairline border lifts it
   off any surface; radius follows the radius dial.

   Content is literal ("⌘↵", "Esc", "L"), never transformed:
   key caps are case-sensitive.
   ============================================================ */

export interface KbdProps {
  children: ReactNode;
}

export function Kbd({ children }: KbdProps) {
  return <kbd style={kbdStyle}>{children}</kbd>;
}

const kbdStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  lineHeight: "var(--leading-snug)",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-positive-secondary)",
  background: "color-mix(in srgb, var(--text-positive-primary) 6%, transparent)",
  border: "1px solid var(--border-positive-primary)",
  borderRadius: "var(--component-radius)",
  padding: "var(--space-3xs) var(--space-2xs)",
  whiteSpace: "nowrap",
};

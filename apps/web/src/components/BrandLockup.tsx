import { CSSProperties, ReactNode } from "react";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   BrandLockup — the product-identity lockup for the app shell's brand slot:
   a square product MARK, a faint hairline divider, and the product NAME. One
   design system powers many distinctly-branded products (Moonlight Studio, HQ,
   ReadilyHome, a future Zafiro HQ); the shell and this lockup stay constant
   while the mark, the name, and brand.css are the per-product variables.

   Meant for TopBar's EXPANDED brand slot: pass BrandLockup as `brand` and the
   bare mark as `brandCollapsed`. The divider therefore shows only while the rail
   is expanded — when it collapses the bar swaps to the mark alone, so the
   divider disappears by construction, no extra wiring.

   The divider is a hairline in the faint secondary border token, held to a fixed
   1.25rem (taller than the name's own em box at --type-sm) rather than the whole
   row, so it reads as a quiet separator, not a rule. Server component:
   presentational, no hooks.
   ============================================================ */

export interface BrandLockupProps {
  /** The square product mark (e.g. a <BrandMark href=… />). Usually the home link. */
  mark: ReactNode;
  /** The product name shown beside the mark. */
  name: ReactNode;
  /** Style overrides for the name (a product may want its own dress). */
  nameStyle?: CSSProperties;
}

export function BrandLockup({ mark, name, nameStyle }: BrandLockupProps) {
  return (
    <span data-mw-brand-lockup="" style={rootStyle}>
      {mark}
      <span data-mw-brand-lockup-divider="" aria-hidden="true" style={dividerStyle} />
      <span data-mw-brand-lockup-name="" style={{ ...nameBaseStyle, ...nameStyle }}>
        {name}
      </span>
    </span>
  );
}

/* ---------- inline styles (token-pure) ---------- */

const rootStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  minWidth: 0,
};

// The faint separator: a hairline at a fixed 1.25rem (taller than the name's own
// em box, not its cap height), in the quiet secondary border token so it divides
// without drawing a line across the bar.
const dividerStyle: CSSProperties = {
  flex: "0 0 auto",
  width: "var(--rule-weight)",
  height: "1.25rem",
  background: "var(--border-positive-secondary)",
};

const nameBaseStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  letterSpacing: "var(--tracking-snug)",
  color: "var(--text-positive-primary)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
};

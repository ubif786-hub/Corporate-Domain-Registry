import { CSSProperties, ReactNode } from "react";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   BrandWordmark — a SITE's brand in the Nav and Footer logo slots, and the
   fleet's one answer to "this client has not sent a logo yet".

   Three statuses, declared in the fork's asset manifest (src/lib/assets.ts
   `BRAND`) and published to the HQ, never inferred from what renders:

   - "placeholder": nothing official exists. The wordmark is the site's NAME
     set in the brand face at a light weight with wide tracking, primary ink.
     This treatment is a SYSTEM CONSTANT: byte-identical on every fork that
     has no assets, so a reviewer can tell at a glance that the logo is not
     the client's, and the studio never ships one client's site wearing the
     studio's own monogram (which the scaffold did until v6.10.0).
   - "standin": the fork drew something deliberate to hold the slot (a
     calligraphic name, a globe beside a weight-split name). Pass it as
     children; it renders as is, wearing the status attribute.
   - "final": the client's real wordmark. Children again (an <img> from the
     fork's store, or a typographic wordmark that IS the brand, as the
     studio's own is), or, with no children, the same typographic treatment,
     because a brand whose logo is its name set in its face is a real brand.

   Children always win over the typographic fallback; status is what the HQ
   reads. The wordmark never wraps (the Nav's logo slot is a minmax(0, 1fr)
   track that clips overflow), so a long name ellipsizes rather than paints
   out of the bar. Server component: presentational, no hooks. The home link
   is the slot's (Nav and Footer wrap the logo in one); this never renders an
   anchor of its own.
   ============================================================ */

export type BrandStatus = "placeholder" | "standin" | "final";

export interface BrandWordmarkProps {
  /** The site's name as the wordmark should read it (case included). Also the
   *  fallback text when no children are passed. */
  name: string;
  /** Declared in the fork's manifest; rendered as data-mw-brand-status. Default "placeholder". */
  status?: BrandStatus;
  /** A drawn stand-in or the client's final wordmark. Wins over the typographic fallback. */
  children?: ReactNode;
  /** "nav" (default) sets the wordmark at --type-lg; "footer" at --type-md, the footer's quieter rung. */
  size?: "nav" | "footer";
  /** Style overrides merged over the typographic treatment (a final typographic brand may set
   *  its own case or tracking). Ignored when children render. */
  style?: CSSProperties;
}

export function BrandWordmark({ name, status = "placeholder", children, size = "nav", style }: BrandWordmarkProps) {
  if (children !== undefined && children !== null) {
    return (
      <span data-mw-brand-wordmark="" data-mw-brand-status={status} style={rowStyle}>
        {children}
      </span>
    );
  }
  return (
    <span
      data-mw-brand-wordmark=""
      data-mw-brand-status={status}
      style={{ ...typographicStyle, fontSize: size === "footer" ? "var(--type-md)" : "var(--type-lg)", ...style }}
    >
      {name}
    </span>
  );
}

/* ---------- inline styles (token-pure) ---------- */

const rowStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minWidth: 0,
  maxWidth: "100%",
};

// The placeholder treatment, lifted from the scaffold's own span (fork-template site-layout,
// v3 to v6.9.0) so the eight forks that copied it change nothing visible on the swap. The
// light weight and wide tracking are what say "a name, not a logo": a real wordmark is set
// tighter and heavier than this on purpose.
const typographicStyle: CSSProperties = {
  display: "inline-block",
  fontFamily: "var(--font-brand)",
  fontWeight: tokenNumber("var(--weight-light)"),
  letterSpacing: "var(--tracking-wider)",
  lineHeight: "var(--leading-tight)",
  color: "var(--text-positive-primary)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
  maxWidth: "100%",
};

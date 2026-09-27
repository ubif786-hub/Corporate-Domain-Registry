import { CSSProperties } from "react";
import { ArrowUpRight } from "@carbon/icons-react";
import { DataLabel } from "@/components/DataLabel";

/* ============================================================
   ProvenanceQuote — the "where this came from" block (v3.10.0, from
   the ArtistHQ handoff: piece provenance, a released idea's origin,
   a session log's honest line. Any place a recorded voice is quoted
   with its source line above it).

   Three parts, each in its established voice: the eyebrow is the
   DataLabel mono metadata role (the source line: "From the session
   log · Jul 6"); the quote is the display face italic (the diary
   voice PromptedTextarea writes in, read back); the optional link
   is the mono cross-reference with the Carbon ArrowUpRight — the
   PromptedTextarea precedent: the outward affordance is the
   COMPONENT's icon, the copy never carries a glyph.

   Semantics: a figure holding a blockquote and, in the eyebrow, its
   figcaption, so AT reads source-then-quote as one captioned unit.

   Server component.
   ============================================================ */

export interface ProvenanceQuoteProps {
  /** The source line above the quote, in the mono metadata voice. */
  eyebrow: string;
  quote: string;
  /** The mono cross-reference out (the component renders the icon). */
  link?: { label: string; href: string };
}

const provenanceCss = `
[data-mw-provenance-quote-link]:hover {
  color: var(--accent-emphasis);
  text-decoration: underline;
}
[data-mw-provenance-quote-link]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

export function ProvenanceQuote({ eyebrow, quote, link }: ProvenanceQuoteProps) {
  return (
    <figure style={rootStyle}>
      <style href="magentaweb-provenance-quote" precedence="default">{provenanceCss}</style>
      <figcaption style={eyebrowStyle}>
        <DataLabel>{eyebrow}</DataLabel>
      </figcaption>
      <blockquote style={quoteStyle}>{quote}</blockquote>
      {link ? (
        <a href={link.href} data-mw-provenance-quote-link="" style={linkStyle}>
          {link.label}
          <ArrowUpRight size={12} aria-hidden="true" style={linkIconStyle} />
        </a>
      ) : null}
    </figure>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  margin: 0,
};

// The eyebrow hugs its quote at the tight rung (the eyebrow -> heading law).
const eyebrowStyle: CSSProperties = {
  marginBottom: "var(--space-xs)",
};

// --font-quote, not --font-display (D28): the quoted-italic lever, defaulting to the display
// face, so this is the same face it has always been.
const quoteStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-quote)",
  fontStyle: "italic",
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-primary)",
};

// inline-flex keeps the label and the icon on one line (an inline SVG after a
// nowrap span can still wrap; the flex row cannot).
const linkStyle: CSSProperties = {
  marginTop: "var(--space-xs)",
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-3xs)",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--accent-ink)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const linkIconStyle: CSSProperties = {
  flexShrink: 0,
};

import { CSSProperties, ReactNode } from "react";

/* ============================================================
   ContactStrip — the contact fields row (Sprint 3A, from the
   ArtistHQ handoff: email · phone · location under a buyer's
   name). One mono line in the metadata voice, fields separated
   by middle dots. Every field is optional; the strip renders
   whatever it is given, in the fixed email / phone / location
   order. Email and phone are real links (mailto: / tel:, the
   tel href stripped to digits and +), location is plain text.

   Voice: the DataLabel mono family without the uppercase
   transform (an email address is literal, like a Kbd cap or an
   IdChip id). Links keep the strip's ink and reveal themselves
   on hover/focus in the accent, so the row reads as one quiet
   line until pointed at.

   Server component.
   ============================================================ */

export interface ContactStripProps {
  email?: string;
  phone?: string;
  location?: string;
  /** Names the strip as a labelled role="group" (e.g. "Buyer contact") so assistive
   *  tech reads the fields as one region. Opt-in since pass 3 (27 Aug 2026, decision
   *  D22, reversible): the former "Contact" default sat on a roleless div, where a
   *  label is name-prohibited, and a defaulted group would also wrap the strips nested
   *  in InvoicePaper's letterhead and bill-to. Without it the strip is a plain row. */
  ariaLabel?: string;
}

const contactCss = `
[data-mw-contact-link] {
  color: inherit;
  text-decoration: none;
  transition: color var(--motion-transition);
}
[data-mw-contact-link]:hover {
  color: var(--accent-ink);
}
[data-mw-contact-link]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
  color: var(--accent-ink);
}
`;

export function ContactStrip({ email, phone, location, ariaLabel }: ContactStripProps) {
  const fields: ReactNode[] = [];
  if (email) {
    fields.push(
      <a key="email" href={`mailto:${email}`} data-mw-contact-link="">
        {email}
      </a>,
    );
  }
  if (phone) {
    // tel: wants a dialable string: keep digits and a leading +, drop the
    // spaces, dots, dashes, and parens the display form carries.
    fields.push(
      <a key="phone" href={`tel:${phone.replace(/[^+\d]/g, "")}`} data-mw-contact-link="">
        {phone}
      </a>,
    );
  }
  if (location) {
    fields.push(<span key="location">{location}</span>);
  }
  if (fields.length === 0) return null;

  return (
    <div data-mw-contact-strip="" role={ariaLabel ? "group" : undefined} aria-label={ariaLabel} style={stripStyle}>
      <style href="magentaweb-contact-strip" precedence="default">{contactCss}</style>
      {fields.map((field, i) => (
        <span key={i} style={fieldStyle}>
          {i > 0 ? (
            <span aria-hidden="true" style={dotStyle}>
              ·
            </span>
          ) : null}
          {field}
        </span>
      ))}
    </div>
  );
}

/* ---------- inline styles ---------- */

// The mono metadata voice without the uppercase transform: contact values are
// literal. Wraps as a row; a long email breaks before the strip overflows.
const stripStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-normal)",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-positive-secondary)",
};

const fieldStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  minWidth: 0,
  overflowWrap: "anywhere",
};

const dotStyle: CSSProperties = {
  padding: "0 var(--space-xs)",
  color: "var(--text-positive-tertiary)",
};

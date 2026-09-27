import type { Metadata } from "next";
import { CSSProperties } from "react";
import { tokenNumber } from "@/components/internal/styles";
import { PagePanel } from "../PagePanel";
import { CONTACT, CORPORATE_ADDRESSES, SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach support about a domain, a transfer or an invoice.",
  alternates: { canonical: "/contact" },
};

/* THE FORM IS GONE AND THIS IS NOW A LIST OF FACTS, the reference's contact page exactly
 * (bltz.com, owner's screenshot 18 Sep 2026): a heading over a rule, then three labelled rows,
 * Address / Phone / E-mail, and nothing else. No form, no captcha, no subject dropdown.
 *
 * THIS REVERSES A WRITTEN CLIENT REQUEST AND THE REVERSAL IS THE OWNER'S, TWICE STATED. The 9 Sep
 * feedback sheet asked for a form with six named fields in the client's own words and order, and
 * that form was built, shipped to staging and wired to a Cloudflare Turnstile widget. The owner
 * then asked for the page to be rebuilt like the reference's, held while there was no capture of
 * it, and supplied one. The later instruction is specific, sighted and about this page, so it
 * wins. The form and its captcha are recoverable from git at 11caded; they are DELETED rather
 * than left in the tree, because an unrendered form is the kind of thing that gets re-imported by
 * accident and nothing detects it.
 *
 * WHAT WENT WITH THEM: the only Turnstile mount on the site, so the test site key is no longer
 * shipping anywhere, and CONTACT_SUBJECTS in src/data/site.ts, which had no other reader.
 *
 * EVERY ROW HERE IS THE CLIENT'S OWN OR ABSENT. The reference prints a phone number and a support
 * hours line; CDR has supplied neither, in any of the six legal documents, so those rows do not
 * render at all. That rule predates this rebuild and cost three studio inventions on 31 Aug: a
 * tel: link to +1 (000) 000-0000 a visitor could actually tap, a support-hours commitment the
 * client has never made, and a postal address reading "Address to come". A placeholder is more
 * conspicuous, and more damaging, under a real business name than under a neutral one.
 *
 * THE ADDRESSES ARE ON THIS PAGE NOW AS WELL AS /tos. The reference puts its address on contact;
 * ours were only under the terms accordion, which is also where the reference keeps a copy. Both
 * read from CORPORATE_ADDRESSES, so there is one source and no chance of the two drifting.
 *
 * TWO EMAIL ROWS, NOT ONE, because the privacy policy names privacy@ specifically for rights
 * requests (s.12). Routing one of those to support@ would contradict the policy published on the
 * same site.
 */

// The reference's two-column list: a narrow right-aligned label column and a wide value column.
// It collapses to a stack below the tablet rung, where a 6rem label column leaves nothing for the
// value; a media query cannot live in an inline style, so the stack is a hoisted sheet, the same
// shape RouteTabs and SiteHeader already use in this fork.
const listCss = `
[data-ds-contact-list] {
  display: grid;
  grid-template-columns: 7rem 1fr;
  column-gap: var(--space-lg);
  row-gap: var(--flow-group);
  margin: 0;
  max-width: var(--measure-prose);
}
[data-ds-contact-list] > dt { text-align: right; }
/* The browser default dd indent, cleared HERE and not inline. An inline margin: 0 on the dd wins
   over every rule in this sheet, which is how the stacked row gap below silently did nothing. */
[data-ds-contact-list] > dd { margin: 0; }
@media (max-width: 767.98px) { /* --mw-bp-tablet */
  [data-ds-contact-list] { grid-template-columns: 1fr; row-gap: var(--space-xs); }
  [data-ds-contact-list] > dt { text-align: left; }
  /* --space-xl, not --flow-group: stacked, the label sits INSIDE the flow rather than
     beside it, so the gap between two rows has to beat the gap between the two addresses
     inside one row. At --flow-group it did not, and "E-mail" read as part of the US address. */
  [data-ds-contact-list] > dd { margin-bottom: var(--space-xl); }
  [data-ds-contact-list] > dd:last-child { margin-bottom: 0; }
}
`;

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-md)",
  fontWeight: tokenNumber("var(--weight-semibold)"),
  color: "var(--text-positive-primary)",
};
const valueStyle: CSSProperties = {
  fontSize: "var(--type-md)",
  // Relaxed, not normal. Every value here is a stack of short lines with no descender rhythm to
  // carry it, and at --leading-normal a four line postal address reads as one broken paragraph.
  // Same finding as the /tos address block, same day.
  lineHeight: "var(--leading-relaxed)",
  color: "var(--text-positive-secondary)",
};
const entityStyle: CSSProperties = { display: "block", color: "var(--text-positive-primary)", fontWeight: tokenNumber("var(--weight-medium)") };
const countryStyle: CSSProperties = { display: "block", color: "var(--text-positive-primary)", fontWeight: tokenNumber("var(--weight-medium)") };
const blockStyle: CSSProperties = { display: "block" };
const addressGroupStyle: CSSProperties = { display: "block", marginTop: "var(--space-md)" };
const linkStyle: CSSProperties = { color: "var(--text-positive-link)" };
const hintStyle: CSSProperties = { display: "block", fontSize: "var(--type-sm)", color: "var(--text-positive-tertiary)" };

export default function ContactPage() {
  return (
    <PagePanel
      title="Contact"
      lede={`A question about a domain, a transfer in progress, or an invoice. ${SITE.name} answers by email.`}
      size="md"
      code="H3"
    >
      {/* Hoisted by React 19 and deduped by href, the fork's standard shape for a media query. */}
      <style href="domain-services-contact" precedence="default">{listCss}</style>

      <dl data-ds-contact-list="">
        <dt style={labelStyle}>Address</dt>
        <dd style={valueStyle}>
          {CORPORATE_ADDRESSES.map((a, i) => (
            <span key={a.country} style={i === 0 ? blockStyle : addressGroupStyle}>
              <span style={countryStyle}>{a.country}</span>
              {a.entity ? <span style={entityStyle}>{a.entity}</span> : null}
              {a.lines.map((line) => (
                <span key={line} style={blockStyle}>{line}</span>
              ))}
            </span>
          ))}
        </dd>

        {/* Null in every one of the six documents the client supplied, so the row is absent rather
            than empty. The reference has one here; inventing ours is how a visitor ends up dialling
            a number nobody answers. */}
        {CONTACT.phone ? (
          <>
            <dt style={labelStyle}>Phone</dt>
            <dd style={valueStyle}>
              <a href={`tel:${CONTACT.phone.replace(/[^+\d]/g, "")}`} style={linkStyle}>{CONTACT.phone}</a>
              {CONTACT.hours ? <span style={hintStyle}>{CONTACT.hours}</span> : null}
            </dd>
          </>
        ) : null}

        <dt style={labelStyle}>E-mail</dt>
        <dd style={valueStyle}>
          <a href={`mailto:${CONTACT.email}`} style={linkStyle}>{CONTACT.email}</a>
          <span style={hintStyle}>Domains, transfers, renewals and invoices.</span>
          <span style={addressGroupStyle}>
            <a href={`mailto:${CONTACT.privacyEmail}`} style={linkStyle}>{CONTACT.privacyEmail}</a>
            <span style={hintStyle}>Access, correction, deletion and other privacy rights.</span>
          </span>
        </dd>
      </dl>
    </PagePanel>
  );
}

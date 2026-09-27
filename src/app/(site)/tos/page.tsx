import type { Metadata } from "next";
import { CSSProperties } from "react";
import { Accordion } from "@/components/Accordion";
import { Column } from "@/components/Column";
import { Heading } from "@/components/Heading";
import { Row } from "@/components/Row";
import { PagePanel } from "../PagePanel";
import { LegalDocumentBody } from "../LegalDocument";
import { LEGAL_DOCS } from "@/data/legal";
import { CORPORATE_ADDRESSES, SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The agreements and policies that govern domains registered through ${SITE.name}.`,
  alternates: { canonical: "/tos" },
};

/* The terms page, built to the register the client pointed at: one accordion, one panel per legal
   instrument, and a corporate address block underneath.
 *
 * SIX PANELS, SIX DOCUMENTS, in the client's own order. Each panel holds a whole instrument with
 * its own effective date and its own numbered sections, which is why the panel is the document
 * and not a section of one: these are six separate agreements, and the Agreement incorporates
 * three of the others by name.
 *
 * AND EACH ONE ALSO HAS ITS OWN URL. The accordion is what the client asked to see; the routes
 * are what a legal instrument needs. A document that another document incorporates by reference
 * has to be citable, linkable and quotable at an address, and a fragment on a page titled "Terms
 * of service" is not an address for a thing called "Privacy Policy". The two cost nothing
 * together: both render the same LegalDocumentBody from the same data.
 *
 * Panels stay in the DOM when closed (the Accordion's inert-plus-collapse model), so ctrl+F,
 * crawlers and anyone citing a clause still reach every word without clicking. That is the only
 * reason an accordion is defensible for legal copy at all.
 *
 * Headings inside a panel are h3: the accordion trigger is the h2, and PagePanel owns the h1. */

/* THE ADDRESS BLOCK HAD NO VERTICAL RHYTHM AT ALL (owner, 18 Sep 2026: "the spacing looks tooo
 * tight"). Both gaps below were zero, and neither was a token set too small: they were never set.
 * Heading carries margin: 0 by house rule, and both containers here were plain blocks, so
 * "Corporate address" sat flush on the addresses and "Canada" sat flush on "100 Mural Street".
 *
 * The rungs are the system's own ladder rather than numbers picked to look right: --flow-heading
 * is what binds a heading to the thing it names, everywhere in the fleet. Writing a margin on the
 * heading instead would have been the wrong repair twice over, because it puts the spacing on the
 * component that deliberately has none and it does not survive the heading moving.
 *
 * The address lines also get --leading-relaxed. A postal address is a stack of short lines with no
 * descender rhythm to carry it, and at --leading-normal three of them read as one paragraph that
 * happens to be broken. */
const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--flow-heading)",
};

const addressStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--flow-heading)",
};

const countryStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-relaxed)",
  color: "var(--text-positive-secondary)",
};

const entityStyle: CSSProperties = { display: "block", color: "var(--text-positive-primary)", fontWeight: 500 };

export default function TermsPage() {
  return (
    <PagePanel
      title="Terms of service"
      lede="The agreements and policies that govern domains registered, transferred and renewed through this site."
      size="md"
      code="Z2"
    >
      <Accordion
        headingLevel={2}
        mode="multiple"
        ariaLabel="Terms of service documents"
        items={LEGAL_DOCS.map((doc) => ({
          id: doc.id,
          // The bar carries the SHORT index label; the panel it opens still carries the
          // instrument's full printed title. Falls back to `title` when a doc sets no label.
          title: doc.indexLabel ?? doc.title,
          // EVERY PANEL LANDS CLOSED (owner call, 4 Sep 2026, against the reference site).
          // The previous rule opened the first panel so the page would not read as an unbroken
          // row of closed bars. In practice panel one is the master Agreement -- the longest
          // instrument here, ~25 numbered sections rendered flat -- so opening it buried the
          // other five bars under a wall of legal text and the page stopped reading as an
          // index of six documents at all. bltz.com, the reference the client named, lands
          // every panel closed. Six neat bars IS the design.
          defaultOpen: false,
          children: <LegalDocumentBody doc={doc} headingLevel={3} />,
        }))}
      />

      {/* Below the accordion, which is where the reference site puts it. Two entities, two
          countries, and that is the reason the header carries a region chip at all. */}
      <section aria-labelledby="corporate-address" style={sectionStyle}>
        <Heading level={2} size={5} id="corporate-address">
          Corporate address
        </Heading>
        {/* Two entities side by side from the tablet rung, stacked on a phone (SECT-3, 7 Sep 2026;
            it was an auto-fit grid at a 16rem minimum, which broke to one column below about
            580px, so the phone reads the same and the 580 to 768px band stacks a little later). */}
        <Row cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap="xl">
          {CORPORATE_ADDRESSES.map((a) => (
            <Column key={a.country} style={addressStyle}>
              <Heading level={3} size={6}>{a.country}</Heading>
              <p style={countryStyle}>
                {a.entity ? <span style={entityStyle}>{a.entity}</span> : null}
                {a.lines.map((l) => (
                  <span key={l} style={{ display: "block" }}>{l}</span>
                ))}
              </p>
            </Column>
          ))}
        </Row>
      </section>
    </PagePanel>
  );
}

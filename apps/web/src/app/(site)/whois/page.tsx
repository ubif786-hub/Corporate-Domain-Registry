import type { Metadata } from "next";
import { CSSProperties } from "react";
import { Prose } from "@/components/Prose";
import { Row } from "@/components/Row";
import { Column } from "@/components/Column";
import { PagePanel, PanelBlock } from "../PagePanel";
import { WhoisLookupFromUrl } from "../DomainFromUrl";

export const metadata: Metadata = {
  title: "Whois lookup",
  description: "Look up the public registration record of any domain.",
  alternates: { canonical: "/whois" },
};

// PagePanel's own flow gap stops at its direct children, and the Row is now one of them, so each
// column carries the same rhythm internally rather than its contents collapsing together.
const lookupColStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--flow-group)" };
const asideColStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--flow-group)" };


export default function WhoisPage() {
  return (
    <PagePanel code="Z2" title="Whois lookup" lede="Search the public record of a domain name: who registered it, through which registrar, and when it expires.">
      {/* TWO COLUMNS FROM THE DESKTOP RUNG, the explainers held to the right (client feedback,
          9 Sep 2026). Stacked, a returned record pushed "What is in the whois record" far down the
          page, and their words were that on a phone it "will stretch the scroll bar". Held beside
          the lookup instead, the record gets the width it needs and the reference prose stays
          visible next to it rather than below it.

          It still stacks below the desktop rung, and that is the right answer on a phone: two
          narrow columns would give the record less room than it has now, which is the problem
          they reported. The scroll is shorter because the explainers sit under a result the
          reader has already got, not because the prose was cut. */}
      <Row cols={{ mobile: 1, tablet: 1, desktop: 12 }} gap="xl" alignItems="start">
        <Column span={{ mobile: 1, tablet: 1, desktop: 8 }}>
          <div style={lookupColStyle}>
            {/* Live from the registry since Oct 2026 (RDAP, GET /api/whois/); the sample snapshot is gone. */}
            <WhoisLookupFromUrl />
          </div>
        </Column>
        <Column span={{ mobile: 1, tablet: 1, desktop: 4 }}>
          <div style={asideColStyle}>
      <PanelBlock title="What is in the whois record">
        <Prose size="md">
          <p>
            Every registered domain has an entry in a central database recording who sponsors it and when it
            expires. That database is the whois. A lookup returns the registrar of record, the registration and
            expiry dates, the nameservers, and the domain&apos;s status codes.
          </p>
          <p>
            It does not usually return the registrant&apos;s name, address or telephone number. Those fields are
            redacted from public lookups by default under ICANN&apos;s registration data policy, and a request for
            them goes to the registrar rather than to a lookup.
          </p>
          <p>
            Keeping the record accurate matters: it is what a transfer is checked against, it is how a registrar
            reaches you before a domain expires, and ICANN requires it to be valid.
          </p>
        </Prose>
      </PanelBlock>
      <PanelBlock title="Can anyone see my contact details">
        <Prose size="md">
          <p>
            Mostly no. Registrant contact fields are redacted from public lookups by default, and the accredited
            registrar that fulfils a registration can also offer whois privacy, which lists a forwarding contact
            in place of yours where an extension still publishes them.
          </p>
          <p>
            Some country extensions publish more than others, and their registry sets that rule rather than us.
            Corporate Domain Registry is an independent reseller and domain management provider, not a registry
            operator and not itself an accredited registrar.
          </p>
        </Prose>
      </PanelBlock>
          </div>
        </Column>
      </Row>
    </PagePanel>
  );
}

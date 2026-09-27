import { CSSProperties } from "react";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { SITE } from "@/data/site";
import { FOOTER_LEGAL } from "@/data/legal";

/* One dark line: the copyright and the terms link, the bltz.com footer. Fork-owned; the sync
   unit's Footer is the four-column shape and this site has nothing to put in four columns. The
   inverted band supplies the ground and ink, so the line follows the theme. */

const lineStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "var(--space-2xs) var(--space-sm)",
  margin: 0,
  textAlign: "center",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};

const linkStyle: CSSProperties = {
  color: "var(--text-positive-primary)",
  textDecoration: "underline",
  textDecorationColor: "var(--border-positive-secondary)",
  textUnderlineOffset: "0.2em",
};

export function SiteFooter() {
  return (
    <Section as="div" background="inverted" padding="compact">
      <footer data-ds-footer="">
        <Container size="lg">
          <p style={lineStyle}>
            <span>{SITE.copyright}</span>
            {/* The privacy policy earns a footer link of its own, which is not a ranking: it is
                the one instrument here that a visitor, a browser and a regulator all expect to
                reach in one click from any page. The rest are reachable from /tos, which has a
                nav tab. FOOTER_LEGAL is the list, so adding one is a data edit. */}
            {FOOTER_LEGAL.map((doc) => (
              <Link key={doc.id} href={doc.href} style={linkStyle}>
                {doc.id === "agreement" ? "Terms of service" : doc.shortTitle}
              </Link>
            ))}
          </p>
        </Container>
      </footer>
    </Section>
  );
}

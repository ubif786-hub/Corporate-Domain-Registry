import type { Metadata } from "next";
import { CSSProperties } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Row } from "@/components/Row";
import { Column } from "@/components/Column";
import { Section } from "@/components/Section";
import { DomainSearchForm } from "./DomainSearchForm";
import { HeroPlate } from "@/components/HeroPlate";
import { assetBySlot } from "@/lib/assets";
import { SERVICES, SITE } from "@/data/site";

export const metadata: Metadata = {
  title: `${SITE.name}: domain registration, transfer and renewal`,
  description: SITE.tagline,
  alternates: { canonical: "/" },
};

/* The home page is three beats: the hero with one field, one sentence, three cards. That is the
   whole page, on purpose; the client asked for bltz.com's simplicity and this is its anatomy.

   The hero field carries NO service as of 4 Sep 2026. It used to be hardcoded to "register",
   which meant the front door quietly made a choice for the visitor and the Search page then asked
   them to make it again on a tab strip. One field, no question: see DomainSearchForm. */

// The hero: a photograph, with a scrim over it so the headline holds.
//
// IT WAS AN ACCENT GLOW UNTIL 18 SEP 2026, two radial washes of the brand colour, and the client
// read that as a missing image rather than as a choice. The plate answers that. The wash then had
// to go for a second reason: with the accent moved to graphite (the owner's call, red reserved for
// the mark), a "glow" of near-black over a near-black photograph is a smudge, not a treatment.
//
// What the layer was actually FOR is legibility, so it does that job honestly now: a neutral scrim,
// strongest at the top where the headline sits, fading out below. It is deliberately colourless.
// This band is the one place a brand colour would have been loudest, and the decision was that the
// brand's loud colour is reserved.
const heroPlate = assetBySlot("home-hero");
const heroGlowStyle: CSSProperties = {
  position: "absolute",
  // The positioned wrapper is the band's content row, so the glow reaches out by the band's own
  // padding to cover the whole band rather than a stripe across its middle.
  //
  // IT READS THE BAND'S ACTUAL TOP PAD, NOT THE DIAL'S NOMINAL ONE, and the difference is a bug
  // that shipped. `--section-pad-dramatic` was correct until v6.18.0 gave a page's FIRST band the
  // smaller `--section-pad-first-top`, at which point this reach over-shot the band it was meant
  // to fill: measured 18 Sep 2026, the glow started at y=50 against a band top of y=137, so 87px
  // of magenta wash painted up across the route tab strip. That is the "weird gradient line" at
  // the top of the page. Section publishes its real value as --mw-band-pad-top; reading it means
  // this cannot drift again when a padding rule changes.
  top: "calc(-1 * var(--mw-band-pad-top, var(--section-pad-dramatic)))",
  bottom: "calc(-1 * var(--section-pad-dramatic))",
  left: 0,
  right: 0,
  pointerEvents: "none",
  // A scrim, not a glow. It reads the band's own ground rather than the accent, so it darkens the
  // photograph toward the colour the band already is instead of tinting it, and it cannot drift
  // when the accent moves again.
  background: [
    "linear-gradient(to bottom, color-mix(in srgb, var(--raw-neutral-darken-95) 62%, transparent) 0%, color-mix(in srgb, var(--raw-neutral-darken-95) 28%, transparent) 55%, transparent 100%)",
  ].join(", "),
};

const heroInnerStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--flow-group)",
  textAlign: "center",
};

// D25 (owner, 27 Aug 2026): 46rem is a DISPLAY FRAME chosen for this hero, not a member of
// the --container-width-* family, and it stays a literal deliberately. The family is a ladder
// of BAND widths (xs 28, sm 40, md 56, base 72rem) that a page picks from so bands line up
// with each other; this number was tuned to the search field it wraps, so that the input, its
// TLD select and the submit button sit on one line at desktop without the row feeling stretched.
// It answers to the control inside it, not to the ladder, and minting a --container-width-hero
// for one frame would put a one-consumer value in a shared family and invite the next hero to
// read it for a different reason. Do not "fix" this to a token: measured 800.032px at a 1440
// viewport (root 17.392px, the root is fluid here), and that is the intended width.
const heroFormWrapStyle: CSSProperties = { width: "100%", maxWidth: "46rem" };

const taglineStyle: CSSProperties = {
  margin: "0 auto",
  maxWidth: "var(--measure-prose)",
  textAlign: "center",
  fontSize: "var(--type-lg)",
  lineHeight: "var(--leading-relaxed)",
  color: "var(--text-positive-secondary)",
};

const cardBodyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--flow-heading)",
  height: "100%",
};

const cardCopyStyle: CSSProperties = {
  margin: 0,
  flex: "1 1 auto",
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};

// Register, transfer and renew read apart by button weight, the way the reference separates them by
// colour: the primary fill, the secondary outline, the ink fill.
const VARIANT = { register: "primary", transfer: "secondary", renew: "ink" } as const;

export default function HomePage() {
  return (
    <>
      <Section background="inverted" padding="dramatic" as="div" code="B1">
        {/* relative wrapper: the plate and the glow are absolute and must stay inside the band */}
        <div style={{ position: "relative" }}>
        {/* THE PHOTOGRAPH THE CLIENT ASKED FOR (feedback sheet, 9 Sep 2026: "no slider image, its
            showing gradient as of now"), drawn by the mother's HeroPlate, which is the sanctioned
            component for a plate behind a band's words. No fork hand-rolls that layer; two did,
            identically, before it existed.

            It renders ONLY when the slot carries a file. With no image recorded the band keeps its
            glow exactly as before, so this cannot ship a black rectangle if an upload is missed.
            The opacities are declared here per FORK_PROTOCOL and are the plate's, not a default
            copied from another fork. */}
        {heroPlate?.src ? (
          <HeroPlate
            poster={heroPlate.src}
            light={0.9}
            dark={0.8}
            mask="none"
            parallax={0.9}
            // TWO CORRECTIONS, both measured rather than guessed, and both invisible to a build.
            //
            // REACH. HeroPlate insets to its positioned ancestor, which here is the band's CONTENT
            // ROW, not the band. Measured: the layer came out 157px tall inside a ~340px band, so
            // the photograph was a stripe across the middle with hard edges above and below. It
            // reaches out by the band's own padding now, exactly as the glow beside it does.
            //
            // BLEND. This band is INVERTED, a dark ground, while the site's THEME is light, so the
            // component reached for its light-theme blend and multiplied. Multiplying a near-black
            // photograph onto a near-black band is why the first two attempts read as the gradient
            // the client complained about. "normal" lets the image's own lights through.
            blendLight="normal"
            style={{
              top: "calc(-1 * var(--mw-band-pad-top, var(--section-pad-dramatic)))",
              bottom: "calc(-1 * var(--section-pad-dramatic))",
            }}
          />
        ) : null}
        <div style={heroGlowStyle} aria-hidden="true" />
        <Container size="lg">
          <div style={heroInnerStyle}>
            <Heading level={1} size={1}>
              Enter your domain to get started
            </Heading>
            <div style={heroFormWrapStyle}>
              <DomainSearchForm size="lg" />
            </div>
          </div>
        </Container>
        </div>
      </Section>

      <Section padding="compact" code="C2">
        <Container size="md">
          <p style={taglineStyle}>{SITE.tagline}</p>
        </Container>
      </Section>

      <Section padding="compact" as="div" code="E1">
        <Container size="lg">
          {/* Two columns, because SERVICES is two cards now (register and renew, matching the
              reference). A three-column row would leave a dead third cell and shrink both cards
              to a third of the width for no reason. */}
          <Row cols={{ desktop: 2, tablet: 2, mobile: 1 }} gap="lg">
            {SERVICES.map((s) => (
              <Column key={s.id}>
                <Card variant="content" surface="primary" elevation="subtle">
                  <Card.Body>
                    <div style={cardBodyStyle}>
                      <Heading level={2} size={4}>{s.title}</Heading>
                      <p style={cardCopyStyle}>{s.copy}</p>
                      <Button variant={VARIANT[s.id]} href={`/${s.id}`} size="lg">
                        {s.action}
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Column>
            ))}
          </Row>
        </Container>
      </Section>
    </>
  );
}

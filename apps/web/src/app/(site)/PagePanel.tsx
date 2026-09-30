import { CSSProperties, ReactNode } from "react";
import { Container } from "@/components/Container";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { HeroPlate } from "@/components/HeroPlate";

/* The inner pages' frame: a white panel with a hairline on the grey page ground, the title as a
   rule-bound h1 at the top (bltz.com's "Pricing" panel). Every inner page opens with one. */

// The plate's containing block: absolute inset 0 against the band, clipped to it. It reaches out
// by the band's own padding so the picture covers the whole band rather than a stripe across its
// middle, the same shape the home hero's glow uses.
const plateHostStyle: CSSProperties = { position: "relative" };

const plateWrapStyle: CSSProperties = {
  position: "absolute",
  // The band's ACTUAL top pad, not the dial's nominal one: a page's first band gets the smaller
  // --section-pad-first-top (v6.18.0), so a hardcoded reach over-shoots and paints above the band.
  // On the home page that put 87px of wash across the route tab strip before it was measured.
  top: "calc(-1 * var(--mw-band-pad-top, var(--section-pad-compact)))",
  bottom: "calc(-1 * var(--section-pad-compact))",
  left: 0,
  right: 0,
  overflow: "hidden",
  pointerEvents: "none",
};

const panelStyle: CSSProperties = {
  background: "var(--background-positive-primary)",
  border: "var(--rule-weight) solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  padding: "var(--space-xl)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--flow-group)",
};

const headStyle: CSSProperties = {
  paddingBottom: "var(--space-sm)",
  borderBottom: "var(--rule-weight) solid var(--border-positive-secondary)",
  display: "flex",
  flexDirection: "column",
  // The title binds its lede at the heading rung (the ladder), not the eyebrow rung: the mother's
  // spacing probe read 8.7px on fourteen pages, 6 Sep 2026.
  gap: "var(--flow-heading)",
};

const ledeStyle: CSSProperties = {
  margin: 0,
  maxWidth: "var(--measure-prose)",
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};

export function PagePanel({
  title,
  lede,
  children,
  size = "lg",
  code,
  plate,
}: {
  title: string;
  lede?: ReactNode;
  children: ReactNode;
  size?: "md" | "lg";
  code?: string;
  /**
   * An optional photograph behind the panel, for the one page that wants "a nice picture at the
   * back" (client feedback, 9 Sep 2026, describing their reference's search page).
   *
   * OPTIONAL AND OFF BY DEFAULT, because every inner page on this site shares this frame and only
   * one of them asked for a picture. Adding it as a prop keeps the other eight byte-identical; the
   * alternative, a second panel component, is how a fork ends up with two frames that drift.
   */
  plate?: string;
}) {
  return (
    <Section padding="compact" code={code}>
      {/* HeroPlate's own contract, which the first cut of this did not honour: it must sit inside
          something carrying position: relative AND overflow: hidden, with the content after it
          also relative. Without that ancestor the plate anchored to the page rather than the band,
          painting faintly behind the header and continuing below the footer. It read as a z-index
          problem and was a containment one. The relative wrapper is the same shape the home hero
          uses, so the two plates are placed the same way.

          The wrapper only exists when there is a plate, so the eight inner pages that have none
          keep exactly the DOM they had. */}
      {plate ? (
        <div style={plateHostStyle}>
          <div style={plateWrapStyle}>
            <HeroPlate poster={plate} light={0.5} dark={0.4} mask="none" parallax={0.94} />
          </div>
          <Container size={size} style={{ position: "relative" }}>
            <div style={panelStyle} data-ds-panel="">
              <div style={headStyle}>
                <Heading level={1} size={2}>{title}</Heading>
                {lede ? <p style={ledeStyle}>{lede}</p> : null}
              </div>
              {children}
            </div>
          </Container>
        </div>
      ) : (
        <Container size={size}>
          <div style={panelStyle} data-ds-panel="">
            <div style={headStyle}>
              <Heading level={1} size={2}>{title}</Heading>
              {lede ? <p style={ledeStyle}>{lede}</p> : null}
            </div>
            {children}
          </div>
        </Container>
      )}
    </Section>
  );
}

/** A titled block inside a panel: the "Additional fees" rung. */
export function PanelBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--flow-heading)" }}>
      <div style={{ paddingBottom: "var(--space-xs)", borderBottom: "var(--rule-weight) solid var(--border-positive-secondary)" }}>
        <Heading level={2} size={5}>{title}</Heading>
      </div>
      {children}
    </div>
  );
}

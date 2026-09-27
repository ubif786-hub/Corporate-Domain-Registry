import { CSSProperties, ElementType, ReactNode } from "react";
import { Section } from "@/components/Section";
import { Container } from "@/components/Container";
import { Eyebrow } from "@/components/Eyebrow";
import { Heading } from "@/components/Heading";
import { ContactStrip } from "@/components/ContactStrip";
import { CurtainBrand } from "@/components/motion/curtain-brand";
import { RevealGroup } from "@/components/motion/RevealGroup";
import { RevealText } from "@/components/motion/RevealText";

// SYNC-UNIT COMPONENT: Coming soon splash, promoted from a copy-paste recipe (30 Aug - 3 Sep
// 2026 cycle). It shipped as `@recipe coming-soon-splash v1` in src/sections/ for months but no
// fork besides one client build ever adopted it (check-recipe-drift's own report), which is
// the tell that this was mis-classified from the start: a recipe is a STARTING POINT a fork
// edits in place (Hero, FeatureGrid), but this component already took every axis of per-client
// variation as PROPS (eyebrow, title, lede, mark, contact) and needed zero edits to its
// own body to serve that client. That is the Nav/Footer/kit shape (promote-by-SHAPE, CLAUDE.md
// "System rules"), not the Hero shape. So it now lives here, byte-identical across the fleet
// like every other src/components/** file, and a fork customises it by PROPS in its own
// scaffolded src/app/coming-soon/page.tsx (scripts/fork-template/coming-soon-page.tsx), the same
// division the kit mounts use for /style-guide and /components. No `group` in system.json on
// purpose: like PageLoader and CurtainBrand it is infra a fork's scaffold wires up rather than a
// swatch a client browses on /components, so it stays out of the atlas and the doc-freshness
// gate by construction.
//
// General, and kept here: the centred single-column lockup, the brand-over-rule centrepiece, the
// spacing ladder, and the NO-ACTION discipline. A HOLDING PAGE HOLDS (owner decision, 5 Sep
// 2026): it makes one claim and offers nothing to click. The `action` slot and its default
// "Get in touch" button were removed that day, after the fleet backfill put the default button on
// thirteen sites at once, each pointing at a /contact route that was behind the same gate. The
// only thing that may render below the lede is the optional `contact` line, and only when the
// client asked for it and the fields are confirmed. Bespoke per fork, and NOT carried here: the
// words, the mark, and whether the contact line renders at all, all supplied as props by the
// fork's own coming-soon page.
//
// Ladder: brand to head cluster at --flow-group, eyebrow hugs its H1 at xs, H1 to lede at the
// heading rung, lede to contact at --flow-group. Container sm per the
// container rule: this is the narrowest register in the library, one centred column of at most a
// sentence, and md would let the lede run past comfortable measure at the centre of a bare page.
//
// THE CENTREPIECE IS THE LOADER'S MOVE, ON PURPOSE. CurtainBrand is the same mark-rise plus
// rule-draw that PageLoader plays on first paint, so a splash and the eventual site's curtain
// speak one vocabulary instead of two. Pass the fork's own `mark` and the choreography stays
// shared while the brand does not.
//
// Server component; RevealText is the only client leaf. `fill` is the takeover switch: on, the
// band holds the viewport at 100svh (svh, never vh, so a mobile dynamic toolbar cannot crop the
// lockup); off, it is an ordinary band and can sit inside a page that scrolls.
//
// TRAP FOR FORKS, and it is the one this shape invites: do NOT feed `contact` a value that is
// still an unfilled placeholder. A phone that is not yet confirmed becomes href="tel:{{PHONE}}",
// which looks tappable and does nothing. Gate on the fork's own unfilled check and omit the
// field, or render it as a visibly marked placeholder in fork-owned markup.

export interface ComingSoonSplashProps {
  eyebrow?: string;
  title?: string;
  lede?: string;
  /** The centrepiece mark, forwarded to CurtainBrand. Defaults to the MW BrandMark; a fork
   *  passes its own so the splash is branded without touching the sync unit. */
  mark?: ReactNode;
  /** Renders a ContactStrip under the lede: the ONLY thing a holding page may offer, and only
   *  when the client asked for it. Omit entirely while any field is unconfirmed: see the
   *  placeholder trap in the header. */
  contact?: { email?: string; phone?: string; location?: string };
  /** Hold the full viewport and centre the lockup in it. On for a page takeover, which is what
   *  this recipe is for; off when it is mounted as a band or a specimen (the HQ preview). */
  fill?: boolean;
  /** Full-bleed layer behind the lockup, rendered aria-hidden. The upgrade path from this
   *  centred card to an editorial scene: pass a token gradient, a next/image fill, or a muted
   *  loop and the composition stays put while the ground changes. */
  layer?: ReactNode;
  /** Render-tag override for the title, forwarded to Heading's `as`. The recipe is a page opener
   *  and renders the page's h1; pass as="div" where it is mounted as a specimen (the HQ section
   *  previews), so a preview is not a second h1 on the page. (23 Aug 2026) */
  as?: ElementType;
}

export function ComingSoonSplash({
  eyebrow = "Launching soon",
  // The fleet's one holding-page message (owner, 5 Sep 2026): warm, plain, no promise it cannot
  // keep. No "leave us a line": with no action and no contact by default, a sentence that invites
  // a reply it cannot receive is a broken promise on thirteen sites.
  title = "Something beautiful is in the works",
  lede = "A new website is on its way. We are putting the last details in place.",
  mark,
  contact,
  fill = true,
  layer,
  as,
}: ComingSoonSplashProps = {}) {
  return (
    <Section
      // A fill band centres its lockup in the viewport, so the padding is only the minimum inset
      // the content keeps from the edges when it is taller than the screen; it is not what makes
      // the page airy. The dramatic rung did that job badly (v6.7.1): under a fork's dramatic
      // spacing dial it read 292px top and bottom, 584px of a 900px viewport, and meridian's lede
      // fell below the fold at 1440 even after the heading dropped a size. The normal rung under
      // a fill; the dramatic rung stays for the band mode, where the padding IS the air.
      padding={fill ? "normal" : "dramatic"}
      as="section"
      style={fill ? fillBandStyle : undefined}
    >
      {layer ? (
        <div style={layerStyle} aria-hidden="true">
          {layer}
        </div>
      ) : null}
      <Container size="sm" style={layer ? relativeStyle : undefined}>
        {/* RevealGroup numbers the beats itself, so the brand, the head cluster, the lede and
            the contact line land in reading order without hand-set steps. */}
        <RevealGroup>
          <CurtainBrand animate mark={mark} />
          {/* Head cluster: the eyebrow hugs its heading at xs; everything below binds at its
              own rung, never a uniform stack gap (the v5.5.0 correction). */}
          <div style={headClusterStyle}>
            <Eyebrow variant="rule">{eyebrow}</Eyebrow>
            {/* size 2, not 1 (5 Sep 2026): a holding page is a lockup, not a hero. At a fork on
                the dramatic type dial (meridian), size 1 ran three lines at display scale and
                pushed the lede below the fold at 1440. Still the page's one h1. */}
            <Heading level={1} size={2} as={as} style={headingStyle}>
              <RevealText variant="word">{title}</RevealText>
            </Heading>
          </div>
          {lede ? <p style={ledeStyle}>{lede}</p> : null}
          {contact ? (
            <div style={contactRowStyle}>
              <ContactStrip
                email={contact.email}
                phone={contact.phone}
                location={contact.location}
                ariaLabel="Contact"
              />
            </div>
          ) : null}
        </RevealGroup>
      </Container>
    </Section>
  );
}

// 100svh, not 100vh: the small-viewport unit is the stable one, so a mobile browser's
// dynamic toolbar cannot crop the centred lockup as it collapses.
const fillBandStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  minHeight: "100svh",
  display: "grid",
  // "center stretch", not "center": place-items takes align then justify, and centring
  // the inline axis too would size the grid item to max-content instead of letting the
  // Container do its own width work. Centre on the block axis, stretch on the inline.
  placeItems: "center stretch",
};
const layerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};
const relativeStyle: CSSProperties = {
  position: "relative",
};
// The whole lockup is centred, so each constrained block re-centres itself with an auto
// inline margin rather than relying on the container's text alignment alone.
const headClusterStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--space-xs)",
  marginTop: "var(--flow-group)", // brand -> head cluster: a group break
  textAlign: "center",
};
const headingStyle: CSSProperties = {
  maxWidth: "24ch",
  marginInline: "auto",
  textWrap: "balance",
};
const ledeStyle: CSSProperties = {
  margin: 0,
  marginTop: "var(--flow-heading)", // heading -> lede: the heading rung
  marginInline: "auto",
  maxWidth: "46ch",
  fontSize: "var(--type-lg)",
  lineHeight: "var(--leading-relaxed)",
  color: "var(--text-positive-secondary)",
  textAlign: "center",
};
const contactRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginTop: "var(--flow-group)", // lede -> contact: a group break
};

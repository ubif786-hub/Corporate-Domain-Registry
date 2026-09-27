import {
  CSSProperties,
  ComponentProps,
  ReactElement,
  ReactNode,
} from "react";
import Link from "next/link";
import { ArrowRight } from "@carbon/icons-react";
import { Image } from "./Image";
import { Icon } from "./Icon";
import { AccentRuleStyle } from "./AccentRule";
import type { BadgeTone } from "./Badge";
import { srOnly, tokenNumber } from "@/components/internal/styles";

type IconElement = ComponentProps<typeof Icon>["children"];

/* ============================================================
   Card — first composite component in the library.

   Horizontal layouts are intentionally NOT a variant. Use a Row with
   cols=2 to place Card.Image beside Card.Body when a horizontal layout
   is needed. The variant axis (content / link / feature) is about role,
   not orientation, and conflating the two would force every new role to
   double its surface area for an orientation flag that composes cleanly
   already.

   Compound pattern: subcomponents (Card.Image, Card.Body, Card.Footer,
   Card.Icon) are attached to the root function as static properties so
   consumers can write <Card.Body> without separate imports.
   ============================================================ */

type CardVariant = "content" | "link" | "feature";
type CardElevation = "none" | "subtle" | "raised";
// relaxed (v6.30.0): the lg rung, the data-surface panel's padding (HQ v7 system pass, theme
// 5: 26 px at normal on the 17.39 px root). It sits between normal (md) and dramatic (xl).
type CardPadding = "compact" | "normal" | "relaxed" | "dramatic";
type CardAccent = "accent" | "success" | "warning" | "danger" | "info";

export interface CardProps {
  children: ReactNode;
  elevation?: CardElevation;
  href?: string;
  padding?: CardPadding;
  variant?: CardVariant;
  /** "accent": the brand-bordered card (the case-study treatment). The border
   *  takes the accent ink, the surface drops to the page's primary background
   *  so the outline reads as the card's edge, and a link card's hover adds a
   *  subtle neutral fill lift on top of the existing translate + shadow lift.
   *  Default undefined = the current neutral hairline. */
  tone?: "accent";
  /** The border colour, as an OPTION (owner, 15 Sep 2026): any Badge tone, so a card and
   *  the badge on it can share a hue ("Your partner" on a navy-edged card, "Local sponsor"
   *  on a teal one). The 1px border takes that tone's badge ink, `--badge-<tone>-fg`, which
   *  is declared per theme, so the edge mirrors: it equals a subtle badge's text in both
   *  themes, and a solid badge's fill in light (in dark it lifts with the ink while the
   *  solid fill stays constant, so the edge never vanishes into a dark ground). Changes the border
   *  and nothing else: no surface change, no shadow. Default undefined = the current
   *  neutral hairline. With tone="accent" as well, this border wins and the tone keeps
   *  its surface.
   *
   *  "none" (v6.30.0, HQ v7 system pass, theme 5): the BORDERLESS surface. No hairline, and
   *  the card is separated from the page by its ground alone (`surface` still decides which
   *  ground, so a borderless card on a secondary canvas takes the primary surface through the
   *  AppShell flip exactly as a bordered one does). Use: a like-item or a region on a data
   *  surface where a hairline would be a rule the page did not earn; the `accent` left rule
   *  still composes for the current or flagged item. The value lives on the border option
   *  because it IS the border's state, and the name "surface" was taken by the ground option
   *  (seven fork consumers), which is why the pass's "variant=surface" is not the API. */
  border?: BadgeTone | "none";
  /** Which ground the card sits ON, which decides the surface it takes.
   *
   *  "secondary" (default, unchanged): the marketing stack. A primary page with
   *  cards lifted one step to secondary.
   *
   *  "primary": the APP stack, inverted. A secondary canvas with panels sitting on
   *  it in primary, so content reads as paper on a desk. Both are correct; they are
   *  different products, which is why this is a prop and not a new default.
   *
   *  Prefer AppShell's `canvas` prop over setting this per card: it sets the canvas
   *  and flips every card inside it in one move, so a page cannot end up half
   *  inverted. Reach for this directly only for a one-off card outside a shell.
   *
   *  Distinct from `tone="accent"`, which also lands on the primary background but
   *  means something else entirely (an accent-bordered case-study card) and takes
   *  the accent ink with it. */
  surface?: "primary" | "secondary";
  /** The 2px accent LEFT RULE (the ArtistHQ callout treatment): the left edge
   *  thickens to a 2px colored rule while the other three edges keep the
   *  neutral hairline. "accent" draws it in --accent-base (the brand ink);
   *  the four status values draw it in the matching --status-*-accent.
   *  Orthogonal to `tone` (tone recolors the whole hairline; accent replaces
   *  the left edge and wins there). Default undefined = no rule. */
  accent?: CardAccent;
  // Accessible name for the whole-card cover link (variant="link" + href).
  // Pass the card's title. The cover anchor has no visible text of its own;
  // without ariaLabel it falls back to the linkLabel cue ("View") rendered as
  // visually hidden text (pass 3, 27 Aug 2026), so the link is always NAMED
  // (4.1.2) but says nothing about where it goes (2.4.4): a grid of link
  // cards without ariaLabel reads "View, View, View".
  ariaLabel?: string;
  /** The visible clickability cue every link Card renders BY DEFAULT ("View",
   *  with the trailing arrow, animated by the whole-card hover). Mobile has no
   *  hover, so the cue is how a reader knows the card goes somewhere; a link
   *  Card without one is a hidden door. Pass a better verb ("Read article",
   *  "View service") when one exists, or null to suppress it when the card
   *  composes its own Card.LinkAffordance. Ignored on non-link cards. */
  linkLabel?: string | null;
}

// Padding scale applied to --card-padding (the value Body / Footer / Icon read).
// Per spec: compact → --space-sm, normal → --space-md, dramatic → --space-xl.
const paddingMap: Record<CardPadding, string> = {
  compact: "var(--space-sm)",
  normal: "var(--space-md)",
  relaxed: "var(--space-lg)",
  dramatic: "var(--space-xl)",
};

const elevationMap: Record<CardElevation, string> = {
  none: "none",
  subtle: "var(--shadow-subtle)",
  raised: "var(--shadow-raised)",
};

// Covered-link pattern (Linear / Stripe / Vercel; Chakra calls it LinkBox /
// LinkOverlay). A link Card is NOT an <a> wrapping its content — nesting a
// Button inside an anchor is invalid HTML and swallows the Button's click.
// Instead the Card is a positioned container holding one absolutely-positioned
// cover <a> that fills it (z-index 1). Genuinely interactive children (Button,
// links, form controls) are lifted to z-index 2, so their own clicks and focus
// win while a click anywhere else on the Card hits the cover and navigates.
// These 1/2 values are a LOCAL stacking pair inside the Card's own context, not
// the global --z-* chrome scale (see tokens.css) — they only order cover vs
// children, so they stay as plain literals on purpose.
//
// Chose this over wrapping the heading text in the overlay (the other common
// variant) because that needs the global Heading to consume a Card context,
// which would force the server-only Heading client-side everywhere. The cover
// anchor keeps everything server-rendered and decoupled.
//
// Hover/focus live in a hoisted style block (:hover, :focus-visible, :has are
// not expressible from CSSProperties). React 19 dedupes by `precedence`.
const cardCss = `
/* Base surface in the SHEET so the link-card hover below can win the cascade
   (audit F5). Elevation arrives via the inline --card-elevation custom
   property, which a rule may still override. */
[data-mw-card-variant] {
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-primary);
  box-shadow: var(--card-elevation, none);
}
/* The inverted surface stack (2026-07-15). A marketing page is a primary ground
   with cards lifted a step to secondary, which is the default above. An APP is the
   other way round: a secondary canvas with panels sitting on it in primary, so the
   content reads as paper on a desk. Both are correct; they are different products.
   Opt in per card (surface="primary"), or wholesale via AppShell's canvas prop,
   which sets the canvas AND flips its cards in one move. */
[data-mw-card-variant][data-surface="primary"] {
  background: var(--background-positive-primary);
}
[data-mw-card-variant="link"] {
  position: relative;
  cursor: pointer;
}
[data-mw-card-cover] {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
}
[data-mw-card-variant="link"] a:not([data-mw-card-cover]),
[data-mw-card-variant="link"] button,
[data-mw-card-variant="link"] input,
[data-mw-card-variant="link"] select,
[data-mw-card-variant="link"] textarea {
  position: relative;
  z-index: 2;
}
[data-mw-card-variant="link"]:hover {
  border-color: var(--border-positive-secondary);
  transform: translateY(calc(-1 * var(--motion-lift-distance)));
  box-shadow: var(--shadow-raised);
}
/* tone="accent": the accent border at full ink and 1px. --accent-base is
   contrast-tuned per theme (darken-20 on light at 6.5:1, vivid base on dark
   at 3.9:1), so the hairline reads in BOTH themes without a weight bump or a
   color-mix dilution. The surface rests on the primary background so the
   accent outline is the card's edge; a link card holds the accent border on
   hover and adds the neutral fill lift (secondary background) on top of the
   existing translate + shadow lift. Two attribute selectors beat the generic
   link hover above, so the neutral hover border never overrides the accent. */
[data-mw-card-variant][data-tone="accent"] {
  background: var(--background-positive-primary);
  border-color: var(--accent-base);
}
[data-mw-card-variant="link"][data-tone="accent"]:hover {
  border-color: var(--accent-base);
  background: var(--background-positive-secondary);
}
/* border="<badge tone>": the edge takes the tone's badge ink, carried inline as
   --card-border-tone (var(--badge-<tone>-fg), declared per theme, so it mirrors with the
   badge). AFTER the tone rules on purpose: at equal specificity the later rule wins, so an
   explicit border beats tone="accent"'s border while the tone keeps its surface. The hover
   rule matches the link-card and accent-tone hover rules' specificity and sits after them,
   so a link card holds its colour under the pointer. */
[data-mw-card-variant][data-border] {
  border-color: var(--card-border-tone);
}
[data-mw-card-variant="link"][data-border]:hover {
  border-color: var(--card-border-tone);
}
/* border="none": the hairline goes transparent (the 1px geometry stays, so a borderless card
   and a bordered one in the same row share a content box), no shadow, and a link card's hover
   is the hover wash on the surface with no lift: the ground change IS the affordance, the
   raise would put a shadow on a thing that has none at rest. Focus keeps the house ring. */
[data-mw-card-variant][data-border="none"] {
  border-color: transparent;
  box-shadow: none;
}
[data-mw-card-variant="link"][data-border="none"]:hover {
  border-color: transparent;
  transform: none;
  box-shadow: none;
  background: var(--background-hover-wash-strong);
}
/* accent="...": the 2px left rule (the ArtistHQ callout treatment). v4.8.0:
   the rule is no longer a coloured BORDER — a border paints the corner arcs up
   to the 45° miter and colour-seams mid-curve on the radius dial. The card now
   stamps data-mw-accent-rule with the tone and the shared AccentRule sheet owns
   the strip: a transparent 2px left border (content geometry byte-identical to
   the old coloured border) + an inset rounded bar that terminates before the
   curve. Toast, ChatMessage, and the HQ funnel ride the SAME mechanism — the
   strip is defined once (AccentRule.tsx).
   (The matching overflow change is INLINE in baseStyle — accent cards render
   overflow visible so the border-zone strip is never clipped; an inline
   declaration cannot be lifted from the sheet.) */
/* Focus ring lives on the root (via :has), not the cover anchor: the root's
   overflow:hidden would clip an outline drawn on the inset:0 anchor, but never
   clips the root's own outline. The ring is the house --focus-outline, one
   keyboard vocabulary product-wide (A-053; the old accent ring is retired). */
[data-mw-card-variant="link"]:has([data-mw-card-cover]:focus-visible) {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
/* Coordinated WHOLE-CARD hover. Card.LinkAffordance (the "Read article →" cue)
   reuses the Button's label/icon vocabulary (data-mw-button-*), so one set of
   rules drives both the affordance AND any real Button placed inside a link
   Card: hovering anywhere on the card slides the label up while its clone rises
   to replace it, and a trailing icon nudges right / a leading icon nudges left.
   This is the difference from the previous commit, where the cue only animated
   on hovering the cue itself.

   The base transition setup is scoped to the link Card so the affordance
   animates even when no <Button> is mounted on the page (Button only hoists its
   own base rules when it renders). When a real Button IS present these are an
   identical, harmless duplicate of its base rules. Reduced motion removes the
   slide and nudge, matching the Button's own override. */
[data-mw-card-variant="link"] [data-mw-button-label] {
  position: relative;
  display: inline-flex;
  overflow: hidden;
  white-space: nowrap;
  vertical-align: bottom;
}
[data-mw-card-variant="link"] [data-mw-button-label-primary],
[data-mw-card-variant="link"] [data-mw-button-label-clone] {
  display: inline-block;
  transition:
    transform var(--motion-transition),
    opacity var(--motion-transition);
}
[data-mw-card-variant="link"] [data-mw-button-label-clone] {
  position: absolute;
  left: 0;
  top: 0;
  transform: translateY(100%);
  opacity: 0;
}
[data-mw-card-variant="link"] [data-mw-button-icon] {
  display: inline-flex;
  align-items: center;
  transition: transform var(--motion-transition);
}
[data-mw-card-variant="link"]:hover [data-mw-button-label-primary] {
  transform: translateY(-100%);
  opacity: 0;
}
[data-mw-card-variant="link"]:hover [data-mw-button-label-clone] {
  transform: translateY(0);
  opacity: 1;
}
[data-mw-card-variant="link"]:hover [data-mw-button-icon="right"] {
  transform: translateX(var(--motion-nudge-distance));
}
[data-mw-card-variant="link"]:hover [data-mw-button-icon="left"] {
  transform: translateX(calc(-1 * var(--motion-nudge-distance)));
}
@media (prefers-reduced-motion: reduce) {
  [data-mw-card-variant="link"]:hover [data-mw-button-label-primary],
  [data-mw-card-variant="link"]:hover [data-mw-button-label-clone],
  [data-mw-card-variant="link"]:hover [data-mw-button-icon] {
    transform: none;
  }
  [data-mw-card-variant="link"]:hover [data-mw-button-label-primary] { opacity: 1; }
  [data-mw-card-variant="link"]:hover [data-mw-button-label-clone] { opacity: 0; }
}
`;

export function Card({
  children,
  elevation = "none",
  href,
  padding = "normal",
  variant = "content",
  tone,
  border,
  surface,
  accent,
  ariaLabel,
  linkLabel = "View",
}: CardProps) {
  // A link Card needs an href to be interactive; variant="link" without href
  // stays an inert div (no cover anchor, no affordance). The CSS hooks key off
  // the SAME gate (pass 3, 27 Aug 2026): a hrefless "link" card stamps
  // data-mw-card-variant="content", so it draws no pointer cursor and no hover
  // lift, mirroring AssetCard's data-link gate. Before, the attribute came
  // straight from `variant`, and a listing whose href arrived undefined from
  // data (an unpublished row) still lifted and showed a pointer over a card
  // that navigated nowhere.
  const isLinkCard = variant === "link" && Boolean(href);
  const stampedVariant: CardVariant = isLinkCard ? "link" : variant === "link" ? "content" : variant;

  // The `padding` prop overrides --card-padding inline; children (Body, Footer,
  // Icon) read that custom property via cascade, so their internal padding
  // scales with the Card's setting without prop-drilling.
  // overflow:hidden clips Card.Image's top corners to the Card's border-radius.
  /* background/border/box-shadow live in the hoisted sheet; the elevation
     rides a custom property. Inline values were beating the link-card :hover
     rule, degrading it to lift-only (audit F5: border-color and the raised
     shadow never painted on hover). */
  const baseStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    borderRadius: "var(--component-radius)",
    // v4.8.0: accent cards go overflow-visible INLINE (a sheet rule cannot beat
    // this inline declaration) — the AccentRule strip lives in the border zone,
    // which overflow:hidden clips at the padding edge. Accent cards never bleed
    // children to the corners, so the radius child-clip is not needed on them.
    overflow: accent ? "visible" : "hidden",
    "--card-padding": paddingMap[padding],
    "--card-elevation": elevationMap[elevation],
    // Every Badge tone has a --badge-<tone>-fg token, so the name maps straight across.
    ...(border && border !== "none" ? { "--card-border-tone": `var(--badge-${border}-fg)` } : null),
    transition:
      "background var(--motion-transition), border-color var(--motion-transition), box-shadow var(--motion-transition), transform var(--motion-transition)",
  };

  const hoistedStyle = (
    <style href="magentaweb-card" precedence="default">{cardCss}</style>
  );

  return (
    <>
      {hoistedStyle}
      {accent ? <AccentRuleStyle /> : null}
      <div
        data-mw-card-variant={stampedVariant}
        data-tone={tone}
        data-border={border}
        data-surface={surface}
        data-accent={accent}
        data-mw-accent-rule={accent}
        style={baseStyle}
      >
        {/* Cover anchor first in DOM so Tab reaches the whole-card link before
            any interactive children, then the children get focus in order. */}
        {isLinkCard ? (
          /* next/link, per the system's soft-navigation rule (Button href
             documents it): a raw anchor full-reloaded on internal routes.
             External hrefs still render as plain anchors through Link.
             Named by ariaLabel; without one the linkLabel cue (or "View" when
             the cue is suppressed) rides inside the anchor as visually hidden
             text, so the shipped default is never a nameless link. The
             visible cue below stays aria-hidden: naming lives here, once. */
          <Link href={href!} data-mw-card-cover="" aria-label={ariaLabel || undefined}>
            {ariaLabel ? null : <span style={srOnly}>{linkLabel || "View"}</span>}
          </Link>
        ) : null}
        {children}
        {/* The default clickability cue: every link Card SHOWS that it links
            (battle-tested finding: a link card without a visible cue reads as
            static, and mobile has no hover to reveal it). linkLabel={null}
            suppresses this when the card composes its own affordance. */}
        {isLinkCard && linkLabel !== null ? (
          <div style={autoAffordanceWrapStyle}>
            <CardLinkAffordance icon={<ArrowRight size={16} />}>{linkLabel}</CardLinkAffordance>
          </div>
        ) : null}
      </div>
    </>
  );
}

/* Bottom-pinned like Card.Footer (marginTop auto in the root's flex column),
   with the top padding halved so it tucks under a padded Body instead of
   doubling the gap. */
const autoAffordanceWrapStyle: CSSProperties = {
  marginTop: "auto",
  padding: "var(--card-padding)",
  paddingTop: "var(--space-xs)",
};

/* ---------- Card.Image ---------- */

type CardImageProps = ComponentProps<typeof Image>;

function CardImage(props: CardImageProps) {
  // Defaults assume Card sits in a 3-column grid (the common case).
  //
  // Rounding is forced to "sharp" for the bleed pattern: the image's top
  // corners get clipped to the Card's --component-radius by the Card root's
  // overflow:hidden, and the bottom corners stay flush against Card.Body's
  // padded edge. Passing `rounding` explicitly still overrides (e.g. circular
  // avatar in a card-as-tile pattern).
  return (
    <Image
      aspect="wide"
      sizes="(min-width: 1024px) 33vw, 100vw"
      rounding="sharp"
      {...props}
    />
  );
}

/* ---------- Card.Body ---------- */

type CardBodyAlign = "start" | "center";

interface CardBodyProps {
  children: ReactNode;
  align?: CardBodyAlign;
}

function CardBody({ children, align = "start" }: CardBodyProps) {
  const style: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-sm)",
    alignItems: align === "center" ? "center" : "flex-start",
    textAlign: align === "center" ? "center" : "start",
    padding: "var(--card-padding)",
  };
  return <div style={style}>{children}</div>;
}

/* ---------- Card.Footer ---------- */

type CardFooterAlign = "start" | "between" | "end";

interface CardFooterProps {
  children: ReactNode;
  align?: CardFooterAlign;
}

const footerJustify: Record<CardFooterAlign, CSSProperties["justifyContent"]> = {
  start: "flex-start",
  between: "space-between",
  end: "flex-end",
};

function CardFooter({ children, align = "start" }: CardFooterProps) {
  const style: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: footerJustify[align],
    gap: "var(--space-sm)",
    marginTop: "auto",
    padding: "var(--card-padding)",
    // The Body above pads its own bottom, so this edge is Body's (v5.5.0; same class as Card.Icon).
    paddingTop: 0,
  };
  return <div style={style}>{children}</div>;
}

/* ---------- Card.Icon ---------- */

interface CardIconProps {
  children: IconElement;
  label?: string;
}

function CardIcon({ children, label }: CardIconProps) {
  // Outer wrapper takes --card-padding so the icon tile sits inside the same
  // padded area as Body / Footer rather than flush against the card edge.
  const wrapperStyle: CSSProperties = {
    padding: "var(--card-padding)",
    // The Body that follows pads its own top, so this edge is Body's (v5.5.0: measured 34px
    // icon -> heading at normal, two paddings stacked; now one, the card's content rung).
    paddingBottom: 0,
  };
  const tileStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-sm)",
    background: "var(--accent-soft)",
    borderRadius: "var(--component-radius)",
    color: "var(--accent-emphasis)",
    width: "fit-content",
  };
  return (
    <div style={wrapperStyle}>
      <div style={tileStyle}>
        <Icon size="xl" label={label}>{children}</Icon>
      </div>
    </div>
  );
}

/* ---------- Card.LinkAffordance ---------- */

interface CardLinkAffordanceProps {
  children: ReactNode;
  // Trailing arrow (or any icon). Passed as an element so the call site picks
  // the glyph; ArrowRight is the conventional choice.
  icon?: ReactElement;
}

// The "Read more →" cue for a link Card. Renders as button-text styling (accent
// colour, medium weight) but is a plain <span>: no href, no onClick. The Card's
// cover anchor (variant="link" + href) handles navigation, so this is purely a
// visual affordance telling the reader the whole card is clickable. Nesting a
// real anchor here would create a second tab stop and an invalid <a> in <a>.
function CardLinkAffordance({ children, icon }: CardLinkAffordanceProps) {
  // Reuses the Button's label/icon markup so the card-level hover rules in
  // cardCss drive the slide-up + clone + icon nudge. The clone is the same text
  // sitting one line below, clipped by the label wrapper's overflow.
  return (
    <span data-mw-card-affordance="" style={affordanceStyle} aria-hidden="true">
      <span data-mw-button-label="">
        <span data-mw-button-label-primary="">{children}</span>
        <span data-mw-button-label-clone="">{children}</span>
      </span>
      {icon ? (
        <span data-mw-button-icon="right">{icon}</span>
      ) : null}
    </span>
  );
}

const affordanceStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2xs)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--accent-ink)",
};

Card.Image = CardImage;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Icon = CardIcon;
Card.LinkAffordance = CardLinkAffordance;

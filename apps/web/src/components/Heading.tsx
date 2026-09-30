import { CSSProperties, ElementType, HTMLAttributes, ReactNode, createElement } from "react";
import { tokenNumber } from "@/components/internal/styles";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingSize = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps extends Omit<HTMLAttributes<HTMLHeadingElement>, "style"> {
  children: ReactNode;
  level?: HeadingLevel;
  size?: HeadingSize;
  style?: CSSProperties;
  // Variable-font kinetics: the display face (Fraunces) carries a weight axis,
  // so when true the heading sits at wght 500 and morphs to 800 on hover,
  // easing along the axis via font-variation-settings. Stays a server
  // component — the morph is pure hoisted CSS keyed off a data attribute.
  kinetic?: boolean;
  // Render-tag override. Defaults to the semantic h{level}. Set to a non-heading tag (e.g. "div")
  // to keep the visual treatment and the kinetic morph while taking the element out of the document
  // outline, for decorative or demo "headings" that are not page structure. Additive: omitting it
  // renders the heading tag exactly as before.
  as?: ElementType;
  /** The line measure the heading caps itself at (v6.15.0). "auto" (the default) reads the size:
   *  sizes 1 and 2 take --measure-display (20ch, the statement block), size 3 takes
   *  --measure-title (32ch), sizes 4 to 6 are left to their card or column. "display" and
   *  "title" force a rung; "none" removes the cap, for a heading a bespoke layout sizes itself.
   *  The cap sits on the element, so no band needs a narrower container for its heading and
   *  no page types a ch value by hand. */
  measure?: HeadingMeasure;
  /** A glyph above the heading (v6.17.0, owner, 10 Sep 2026: "a common pattern, we will see it
   *  again"): an icon node rendered as a block inside the heading element, decorative
   *  (aria-hidden), in the accent ink, bound to the words at the eyebrow rung (xs). One prop,
   *  so no page stacks a span and a heading by hand; the first fork to do so got the bind wrong
   *  (an inline span whose bottom margin did nothing). Pass a sized icon: `<Growth size={24} />`. */
  glyph?: ReactNode;
}

export type HeadingMeasure = "auto" | "display" | "title" | "none";

// The glyph's block: a flex line so the icon's own box sets the height, the eyebrow hug below it,
// the accent ink (the studio's use on every site so far; a fork that wants another ink styles
// the node it passes).
const glyphStyle: CSSProperties = {
  display: "flex",
  color: "var(--accent-ink)",
  marginBottom: "var(--space-xs)",
};

// The measure by size when measure="auto": display for the two statement sizes, title for the
// section heading, nothing below that (a card title is capped by its card).
const measureBySize: Record<HeadingSize, string | undefined> = {
  1: "var(--measure-display)",
  2: "var(--measure-display)",
  3: "var(--measure-title)",
  4: undefined,
  5: undefined,
  6: undefined,
};
const measureByName: Record<Exclude<HeadingMeasure, "auto" | "none">, string> = {
  display: "var(--measure-display)",
  title: "var(--measure-title)",
};

// A capped heading is a block narrower than its container, and a block sits at the start edge,
// so a heading centred by text-align would read off-centre once capped. The layout usually
// centres the BOX (a flex column with align-items center, the CtaBand recipe's shape) and needs
// nothing; where only the text is centred, by the heading's own style or an ancestor's inline
// style, the box takes auto inline margins. The rule matches React's inline text-align, which
// is how the fleet centres; a heading centred by a class opts out with measure="none".
const headingMeasureCss = `
[data-mw-heading-measure][style*="text-align: center"],
[style*="text-align: center"] [data-mw-heading-measure] {
  margin-inline: auto;
}
`;

// font-variation-settings "wght" overrides font-weight for the weight axis, so
// this drives the morph regardless of the regular weight set inline. Reduced
// motion drops the easing (the heading simply rests at its base weight).
const headingKineticCss = `
[data-mw-heading-kinetic] {
  font-variation-settings: "wght" var(--heading-kinetic-wght);
  transition: font-variation-settings var(--motion-transition);
}
[data-mw-heading-kinetic]:hover {
  font-variation-settings: "wght" var(--heading-kinetic-wght-hover);
}
@media (prefers-reduced-motion: reduce) {
  [data-mw-heading-kinetic] {
    transition: none;
  }
}
`;

// Heading sizes map down a rung from the type scale (2026-06-14): size 1 (the
// hero / h1) is --type-4xl, not --type-6xl, so the dramatic dial stays usable at
// mobile. 5xl/6xl are display-reserved (unmapped from Heading sizes; Glance size="lg"
// consumes --type-5xl for its hero figure, 6xl has no consumer yet).
const sizeMap: Record<HeadingSize, string> = {
  1: "var(--type-4xl)",
  2: "var(--type-3xl)",
  3: "var(--type-2xl)",
  4: "var(--type-xl)",
  5: "var(--type-lg)",
  // h6 is the quiet heading: --type-md-plus sits a half-step above the body
  // size and scales with the type dial at half strength (owner, 9 Jul), so
  // panel and card titles react to the dial without jumping to the lg step.
  6: "var(--type-md-plus)",
};

// One face, every size (owner, 9 Jul, reverting the 7 Jul body-face switch):
// every heading reads the display face. Small sizes take medium weight so
// panel and card titles keep their presence at --type-lg/-md scale without
// the display regular reading thin.
// The weights read two semantic rungs since v6.32.0 (--heading-weight-display for 1 to 3,
// --heading-weight-title for 4 to 6), defaulting to the regular and medium they read before, so
// a surface that sets its titles in a sans retunes the weight once rather than per heading.
const faceMap: Record<HeadingSize, { family: string; weight: string }> = {
  1: { family: "var(--font-display)", weight: "var(--heading-weight-display)" },
  2: { family: "var(--font-display)", weight: "var(--heading-weight-display)" },
  3: { family: "var(--font-display)", weight: "var(--heading-weight-display)" },
  4: { family: "var(--font-display)", weight: "var(--heading-weight-title)" },
  5: { family: "var(--font-display)", weight: "var(--heading-weight-title)" },
  6: { family: "var(--font-display)", weight: "var(--heading-weight-title)" },
};

export function Heading({
  children,
  level = 2,
  size = 2,
  style,
  kinetic = false,
  as,
  measure = "auto",
  glyph,
  ...rest
}: HeadingProps) {
  const measureValue =
    measure === "none" ? undefined : measure === "auto" ? measureBySize[size] : measureByName[measure];
  const merged: CSSProperties = {
    fontFamily: faceMap[size].family,
    fontSize: sizeMap[size],
    fontWeight: tokenNumber(faceMap[size].weight),
    lineHeight: tokenNumber("var(--leading-tight)"),
    // Two tracking rungs since v6.29.0: the display sizes (1 to 3) and the title sizes (4 to 6)
    // read their own semantic token, both defaulting to --tracking-snug, so a fork retunes its
    // heading tracking in brand.css without moving the Modal title, BrandLockup and the rest
    // that share the snug rung. The split is faceMap's.
    letterSpacing: size <= 3 ? "var(--heading-tracking-display)" : "var(--heading-tracking-title)",
    color: "var(--text-positive-primary)",
    // No margin of its own: the universal reset (* { margin: 0 }) zeroes standalone Headings
    // (card titles, the rail, etc.), and a Flow or Prose container owns the heading's margin
    // where vertical rhythm is wanted (the fixed --flow-heading rung). Margin-bottom only.
    // Long display words at narrow widths must break to fit their column without
    // forcing horizontal page scroll. break-word (not anywhere) keeps the box at
    // its column-width min-content and yields to hyphens:auto first, so real
    // browsers hyphenate cleanly and break a word raw only as a last resort.
    // anywhere collapses min-content to a single character, which chops the word
    // before hyphenation is ever considered (defeating hyphens:auto). lang=en on
    // <html> supplies the dictionary. No effect where there is room, so wide
    // layouts are unchanged; the break-to-fit fallback still guards overflow.
    overflowWrap: "break-word",
    // Display sizes never hyphenate (6 Sep 2026): "de-sign" at the top of a phone hero and
    // "Architectu-re" in a dramatic-dial H1 are what hyphens:auto produces at 1 and 2, and a
    // display word is sized for its column instead (CLAUDE.md, "A display heading is sized
    // for its longest word"). Body-sized headings in narrow cards keep the dictionary.
    hyphens: size <= 2 ? "manual" : "auto",
    WebkitHyphens: size <= 2 ? "manual" : "auto",
    // The measure (v6.15.0): the cap on the element, and balanced wrapping on the capped sizes
    // so two lines split evenly rather than leaving one word on the second.
    ...(measureValue ? { maxWidth: measureValue, textWrap: "balance" } : {}),
    ...style,
  };

  const heading = createElement(
    as ?? `h${level}`,
    {
      style: merged,
      ...(kinetic && { "data-mw-heading-kinetic": "" }),
      ...(measureValue && { "data-mw-heading-measure": "" }),
      ...rest,
    },
    // The glyph rides inside the heading element as a decorative block, so the heading stays the
    // root a page styles and measures, and the icon and the words bind at one rung.
    glyph ? <span key="glyph" data-mw-heading-glyph="" aria-hidden="true" style={glyphStyle}>{glyph}</span> : null,
    children,
  );

  return (
    <>
      {measureValue ? <style href="magentaweb-heading-measure" precedence="default">{headingMeasureCss}</style> : null}
      {kinetic ? <style href="magentaweb-heading-kinetic" precedence="default">{headingKineticCss}</style> : null}
      {heading}
    </>
  );
}

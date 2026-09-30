import { CSSProperties, HTMLAttributes, ReactNode, createElement } from "react";
import { tokenNumber } from "@/components/internal/styles";

// Glance: the data-display type role for a prominent number that breaks heading rules. A key
// stat, a highlight figure, the number in the centre of a chart. It is one of the five
// product-design type roles documented on /foundations (heading, glance, body, label, data
// label); this
// is the usable primitive. Same construction pattern as Eyebrow and Heading: a thin wrapper
// that resolves the role's tokens, no client JS.
//
// Glance reads --font-code (the monospace face, so figures align) at --weight-light, and one
// of the three glance steps. It renders a NON-heading element (a number is not a document
// heading, so it stays out of the outline). Use it only for genuinely prominent figures, not
// every number; smaller inline data sits in body / DataLabel.

// Sizes are the house short forms, ascending (A-048; Glance shipped in v2.0.0 as the sole
// long-form scale). The long forms "small" / "medium" / "large" were deprecated aliases and
// were REMOVED at v5.0.0; the alias map went with them, since it had become an identity.
type GlanceSize = "sm" | "md" | "lg";
type GlanceTag = "span" | "div" | "p";

// Omit the global HTML "prefix" attribute (RDFa, typed string) so our ReactNode prefix wins.
export interface GlanceProps extends Omit<HTMLAttributes<HTMLElement>, "style" | "prefix"> {
  children: ReactNode;
  // The three glance steps: sm = --type-2xl (a dense row of several KPIs), md = --type-3xl
  // (a standalone KPI figure), lg = --type-5xl (a single hero number). Defaults to md.
  size?: GlanceSize;
  // Render-tag. A number is not a heading, so this is a plain inline/block element, never an
  // h1-h6. Defaults to span so it composes inside a flex stat stack.
  as?: GlanceTag;
  // Optional affixes: a unit or symbol rendered at the figure's own size but muted, so the
  // figure-plus-unit reads as one number and the muted colour alone keeps the unit subordinate
  // (a "102,750" with an equal-height grey "$" before it, a "95" with an equal-height grey "%"
  // after it; owner, 9 Jul: the earlier half-size affix read as a typo next to the big figure).
  // They render inline, baseline aligned, in DOM order prefix then figure then suffix, so a
  // screen reader reads "$ 102,750" in order.
  prefix?: ReactNode;
  suffix?: ReactNode;
  style?: CSSProperties;
}

const sizeStep: Record<GlanceSize, string> = {
  lg: "var(--type-5xl)",
  md: "var(--type-3xl)",
  sm: "var(--type-2xl)",
};

export function Glance({
  children,
  size = "md",
  as = "span",
  prefix,
  suffix,
  style,
  ...rest
}: GlanceProps) {
  const merged: CSSProperties = {
    fontFamily: "var(--font-code)",
    fontSize: sizeStep[size],
    fontWeight: tokenNumber("var(--weight-light)"),
    lineHeight: "var(--leading-tight)",
    color: "var(--text-positive-primary)",
    margin: 0,
    ...style,
  };

  // No affixes: render exactly as before (a single child, no wrapper spans).
  if (prefix == null && suffix == null) {
    return createElement(as, { style: merged, ...rest }, children);
  }

  // Affixes keep their own muted colour regardless of any colour the caller sets on the figure
  // (e.g. an accent figure with a grey "$"), but inherit the figure's size and weight so unit
  // and figure sit as one full-height number; only the tertiary colour subordinates the unit.
  const affixBase: CSSProperties = {
    color: "var(--text-positive-tertiary)",
  };

  return createElement(
    as,
    { style: merged, ...rest },
    prefix != null
      ? createElement(
          "span",
          { key: "prefix", "data-glance-affix": "prefix", style: { ...affixBase, marginInlineEnd: "var(--space-3xs)" } },
          prefix,
        )
      : null,
    children,
    suffix != null
      ? createElement(
          "span",
          { key: "suffix", "data-glance-affix": "suffix", style: { ...affixBase, marginInlineStart: "var(--space-3xs)" } },
          suffix,
        )
      : null,
  );
}

import { CSSProperties, HTMLAttributes, ReactNode, createElement } from "react";

// DataLabel: the monospace data-label role, the companion to Glance. The small uppercase
// label that sits next to data figures: table headers, stat labels, axis and legend labels,
// metadata captions. Same construction pattern as Eyebrow.
//
// It is DISTINCT from Eyebrow. Eyebrow is the body-font label role for section headers (it
// pairs with a Heading). DataLabel is the monospace label that pairs with the monospace
// figures of Glance in a data context, so a stat reads as one unit (mono label over mono
// number). It reads --font-code at --type-2xs, uppercase, --label-tracking, and the faint text
// tiers a data label wants. This formalises the ad-hoc monospace-label idiom already in use.

type DataLabelTone = "tertiary" | "secondary";
type DataLabelTag = "span" | "div" | "p";

const toneColor: Record<DataLabelTone, string> = {
  tertiary: "var(--text-positive-tertiary)",
  secondary: "var(--text-positive-secondary)",
};

export interface DataLabelProps extends Omit<HTMLAttributes<HTMLElement>, "style"> {
  children: ReactNode;
  // Text tier. tertiary (default) is the faintest, for stat captions and metadata; secondary
  // is for slightly more present labels like table column heads.
  tone?: DataLabelTone;
  // Render-tag. A label is not a heading; this is a plain inline/block element. Defaults to
  // span so it composes inside a stat stack or a flex row.
  as?: DataLabelTag;
  style?: CSSProperties;
}

// C-5, MEASURED AND SANCTIONED 27 Aug 2026, no change to the default.
// The finding read: tone="tertiary" on uppercase --type-2xs micro-type is the shape that fails
// contrast soonest. It is the right shape to suspect and it does not fail here.
// probe-cleanups.mjs, leg 3, cloned a REAL DataLabel node onto every ground the component is used
// on, in both themes, and read the resolved ink against the ground it paints on (12.83px at the
// 1280px viewport, so 4.5:1 is the bar, not 3:1):
//                       light      dark
//   primary surface     7.34:1     7.35:1
//   secondary canvas    6.89:1     6.90:1
//   accent band         4.86:1     4.86:1   <- the tightest pair, and it clears
//   inverted band       7.35:1     7.34:1
//   paper               7.34:1     7.34:1   (theme-constant by design)
// EVERY NUMBER ABOVE IS THE MOTHER'S. Four of the five grounds are neutral and travel, but the
// accent band does not: --text-positive-tertiary resolves there to --accent-band-ink-muted, the
// 18% tier C-13 set on 26 Aug, and the band mixes toward each fork's OWN --raw-magenta-base. So
// the band was measured on all fourteen forks' raws too (skeptic pass, 27 Aug, Chromium doing the
// color-mix), and two forks land UNDER 4.5 in dark theme:
//   readilyhome        3.01:1 dark (#dde0e4 on #708292)   8.73:1 light
//   crescent-moon-art  3.41:1 dark (#d1dad4 on #3d7b77)   5.41:1 light
//   (thin but clear: tears-of-elune 4.55, meridian 4.59, global-medical-services 4.84 dark.
//    zafiro 9.48, readilyhome light 8.73 and the seven forks still on the mother's raw, 4.86.)
// THAT IS NOT THIS DEFAULT'S FAULT AND THIS DEFAULT CANNOT FIX IT. On those two forks the band's
// FULL ink fails as well (readilyhome 3.66:1, crescent-moon-art 4.24:1), and tone="secondary"
// resolves on a band to exactly that full ink, so flipping the default would move 100 live labels
// on seven client sites and leave both forks still under the bar. The lever is the fork's own
// brand.css: global-medical-services already pulls it, swapping --accent-band-ink to a dark ink
// with a 12% muted tier for its powder-blue dark accent, and measures 4.84 because of it. The two
// forks above have a light dark-theme accent and no such swap yet.
// Moving the default to secondary would also buy nothing on four of the five grounds and would
// flatten the label against the figure it captions, which is the role's whole point.
export function DataLabel({ children, tone = "tertiary", as = "span", style, ...rest }: DataLabelProps) {
  const merged: CSSProperties = {
    fontFamily: "var(--font-code)",
    fontSize: "var(--type-2xs)",
    letterSpacing: "var(--label-tracking)",
    textTransform: "uppercase",
    lineHeight: "var(--leading-snug)",
    color: toneColor[tone],
    margin: 0,
    ...style,
  };

  return createElement(as, { style: merged, ...rest }, children);
}

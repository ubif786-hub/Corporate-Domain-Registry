import { CSSProperties } from "react";

/* ============================================================
   internal/styles.ts — system-internal style utilities. Not public
   components; these are shared building blocks consumed by the
   component library itself to keep duplicated recipes in one place.
   ============================================================ */

// The logo home-link recipe: Nav and Footer render the identical wrapper and
// placeholder around the consumer's logo node (audit: the two copies were
// byte-identical, comments included). The logo is a HOME LINK by convention
// (logoHref); inherits color, no underline.
export const logoHomeLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minWidth: 0,
  color: "inherit",
  textDecoration: "none",
  borderRadius: "var(--component-radius)",
};

export const logoPlaceholderStyle: CSSProperties = {
  width: "7rem",
  height: "1.75rem",
  background: "color-mix(in oklch, var(--text-positive-primary) 10%, transparent)",
  borderRadius: "var(--component-radius)",
};

// Visually-hidden but accessible: the element stays in the DOM, focusable and
// announced by screen readers, while occupying no visible space. Used to keep a
// real native control (the checkbox/radio/switch input, a file input, a live
// region) present for assistive tech behind a custom-rendered visual. Was
// duplicated verbatim across Checkbox, Switch, Radio, Input, and DateRangePicker.
//
// CONTRACT for consumers: a FOCUSABLE srOnly element must have a positioned
// wrapper that lives in the same scroll flow as its visible control — normally
// its immediate label/root. position:absolute resolves against the nearest
// positioned ancestor, and with no positioned wrapper the containing block
// escapes to whatever distant ancestor happens to be positioned — inside a
// dialog that is the modal panel itself. The hidden input then leaves the
// body's scroll flow, inflates the PANEL's scrollHeight, and the focus that
// follows a label click scrolls the panel's clipped overflow into view: the
// dialog's real content shifts up and a void opens under the footer (readilyhome
// add-item dialog, 8 Aug 2026; the same report of 3 Aug that min-height:0 on the
// modal body partially addressed). Modal's panel is overflow:clip as a second
// wall, but the wrapper rule is what keeps focus-scroll aimed at the right
// scroll container everywhere else.
//
// The census (8 Aug 2026): Switch, Checkbox, Radio, SegmentedControl, Rating,
// and ScorecardDots position their label via their hoisted SHEET, deliberately
// not inline, so a composer that repositions the indicator against its own
// positioned frame can override the label back to static and take over the
// containing-block role — ChoiceCard's image variant is the worked example.
// FileUpload (root) and Input's file variant (label) position inline; nothing
// composes over them. Non-focusable srOnly spans (live regions, sr labels) can
// never be focus-scroll targets and may stay unwrapped.
export const srOnly: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

// The GROUP legend voice: a fieldset that groups several controls names itself one rung above
// its fields' labels (code face, --type-sm, primary ink) where a field label is --type-xs in the
// secondary ink. FormGroup has always rendered this; RadioGroup renders it on legendVariant="group"
// so FilterPanel's single- and multi-select groups read as peers (typography audit, 23 Aug 2026:
// they differed by a rung and an ink). A rendered legend sits OUTSIDE the fieldset's anonymous flex
// content box, so marginBottom is the sole spacer for legend -> first control (S-1, v5.5.0).
export const groupLegendStyle: CSSProperties = {
  display: "block",
  float: "none",
  width: "100%",
  padding: 0,
  marginBottom: "var(--space-xs)",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-sm)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-positive-primary)",
};

// csstype types fontWeight, lineHeight, and zIndex as number-or-keyword, so a
// token var() string cannot pass without widening. This is the one place in
// the system allowed to perform that widening; components call it instead of
// casting at the site. React stringifies the value either way at runtime.
export function tokenNumber(varExpr: string): number {
  return varExpr as unknown as number;
}

// The paint a hovered chart mark takes (D53). --chart-hover-shift aliases the
// ink, so the mark always moves AWAY from its ground: darker on light, lighter
// on dark, and correct on a band because the token is re-declared there. The
// charts take colour as an arbitrary string prop and cannot index a family
// ramp, so the step is computed rather than looked up. It replaced
// filter: brightness(1.12), which lightens in BOTH themes and so took a bar
// from 4.31:1 to 3.54:1 against the light ground (worst of the twelve, 3.51).
export function chartHoverPaint(color: string): string {
  return `color-mix(in srgb, ${color}, var(--chart-hover-shift) 12%)`;
}

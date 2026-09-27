import { CSSProperties, HTMLAttributes, ReactNode } from "react";

type SectionPadding = "compact" | "normal" | "dramatic";
// "none" (v6.36.2): the band paints no ground of its own and the surface behind it shows through.
// For a page inside an app shell that owns the ground (the HQ's kit pages on G1: the shell's
// secondary page ground with panels a step lighter). A sheet rule cannot do this from outside,
// because the band's ground is declared inline and an inline declaration beats every sheet rule;
// the HQ carried exactly that dead rule for a release.
type SectionBackground = "default" | "inverted" | "accent" | "none";
type SectionTheme = "light" | "dark" | "auto";
type SectionTag = "section" | "div" | "main" | "article";
type SectionBlendMode = "normal" | "difference";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: SectionTag;
  background?: SectionBackground;
  // mix-blend-mode for the whole band against what sits behind it. "difference"
  // makes overlaid content auto-invert (white over dark, dark over light) with
  // no theme wiring. A non-normal mode also drops the band's own opaque background
  // so the layer behind shows through to blend against (an opaque fill would leave
  // nothing to blend with).
  blendMode?: SectionBlendMode;
  children: ReactNode;
  /** The section library code this band is a configuration of ("D2", "E5.3"; docs/SECTION_LIBRARY.md).
   *  Rendered as `data-mw-section-code` so a fork stamps its bands without ever typing the
   *  reserved `data-mw-` prefix itself, the fleet census reads it from source and from the DOM,
   *  and the library's References derive from what ships rather than from a typed list. Pair it
   *  with an `id` when the library should be able to link straight to the band. (5 Sep 2026) */
  code?: string;
  /** The band is BESPOKE: a job or a behaviour no library recipe does, built on the owner's word,
   *  and this is the reason, in a few words ("live prayer times", "the site's own ledger").
   *  Rendered as `data-mw-section-bespoke`, so the record travels with the band instead of
   *  living in a document, the census prints it as `~` (recorded) rather than `?` (unknown),
   *  and a fork's publish refuses a band that is neither stamped nor recorded. Exclusive with
   *  `code`: a band is a configuration of a recipe or it is bespoke, never both. (22 Sep 2026;
   *  docs/SECTION_LIBRARY.md, "A band that is genuinely bespoke".) */
  bespoke?: string;
  /** This band IS its recipe, and it wears something of the fork's own: the thing, named
   *  ("ZafiroPlot, the drawn trilliant geometry"). Rendered as `data-mw-section-carries`.
   *
   *  NOT exclusive with `code`; it REQUIRES one, and that is the whole point. `bespoke` says no
   *  recipe does this job. `carries` says a recipe does the job and the payload inside it is ours,
   *  so the library's References stay true about the SHAPE while warning a picker that what they
   *  would find here is not lifted whole. A band with neither a code nor a bespoke is a `?`.
   *
   *  Why it is a field. The fleet holds 43 fork-owned components across seven forks (measured
   *  22 Sep 2026, against 15 recipe copies), and every one of them was authorised by the owner
   *  under FORK_PROTOCOL's "the mother's primitive first; bespoke only when needed and
   *  authorized", which asks for the authorisation to be written in the file header and the
   *  fork's PROJECT.md. Prose in 43 headers is not a surface anything can read. This is.
   *  (v6.28.0, 22 Sep 2026.) */
  carries?: string;
  padding?: SectionPadding;
  /** A band-local theme pin, rendered as data-theme on the band. "dark" re-declares the semantic
   *  set for this band alone (tokens.css matches [data-theme="dark"] on any element since
   *  v6.12.2; before that the attribute was inert and the band followed the page). "light" pins
   *  nothing inside a dark page, because :root is the light theme and there is no light block by
   *  design: reach for background="inverted" there. "auto" is the page's own dial. */
  theme?: SectionTheme;
}

// Vertical bands read the dedicated --section-pad-* tokens, which are driven by
// --section-spacing-multiplier (aggressive, vertical-only) rather than the gentle
// inline --spacing-multiplier. This is what gives the dramatic dial its editorial
// section breathing without inflating inline gaps. See tokens.css for the
// two-multiplier rationale.
// The band's own pad, per prop. The TOP is read through --mw-band-pad-top, which defaults to
// that same value and is re-declared by the stylesheet below on a page's FIRST band (v6.18.0):
// an INLINE padding always beats a stylesheet, so the override has to travel as a custom
// property, not as a competing padding rule. A consumer that wants the full opening pad back
// sets paddingTop in its own style, which merges after this and wins.
const padVar: Record<SectionPadding, string> = {
  compact: "var(--section-pad-compact)",
  normal: "var(--section-pad-normal)",
  dramatic: "var(--section-pad-dramatic)",
};

// The first band of a page sits under the nav, which already supplies the air above it, so its
// top pad is --section-pad-first-top rather than a full band's. Both shapes the fleet actually
// renders are matched: a Section as main's first child, and a Section inside the first wrapper
// (a route group's fragment, a RevealBlock). Scoped to `main` so a Section inside a card, a
// dialog or the docs shell is untouched.
// `:first-child` alone was not enough: a page that renders its JSON-LD script before its opener
// (magenta-web's /services and /industries) has a first band that is not the first CHILD, and the
// first cut silently skipped both. `section:first-of-type` matches by tag, so it finds the opener
// past any number of non-band siblings; the two `:first-child` arms cover an opener rendered as
// another tag, or wrapped.
const sectionFirstCss = `
main > section:first-of-type,
main > [data-section-bg]:first-child,
main > div:first-child > section:first-of-type,
main > div:first-child > [data-section-bg]:first-child {
  --mw-band-pad-top: var(--section-pad-first-top);
}
`;

// Section is a full-width band: it owns vertical padding, background, theme,
// and the semantic tag. Content width is the consumer's responsibility via
// Container. Canonical composition: <Section><Container>...</Container></Section>.
export function Section({
  as: Tag = "section",
  background = "default",
  blendMode = "normal",
  children,
  code,
  bespoke,
  carries,
  padding = "normal",
  style,
  theme,
  ...rest
}: SectionProps) {
  const isBlend = blendMode !== "normal";
  const merged: CSSProperties = {
    paddingTop: `var(--mw-band-pad-top, ${padVar[padding]})`,
    paddingBottom: padVar[padding],
    paddingInline: 0,
    // A blending band must be transparent so the layer behind shows through to
    // blend against; an opaque background would have nothing to mix with.
    background: isBlend || background === "none" ? "transparent" : "var(--background-positive-primary)",
    color: "var(--text-positive-primary)",
    transition: "background var(--motion-transition), color var(--motion-transition)",
    ...(isBlend && { mixBlendMode: blendMode }),
    ...style,
  };

  return (
    <>
      <style href="magentaweb-section-first" precedence="default">{sectionFirstCss}</style>
      <Tag
        data-section-bg={background}
        data-mw-section-code={code}
        data-mw-section-bespoke={bespoke}
        data-mw-section-carries={carries}
        data-theme={theme}
        style={merged}
        {...rest}
      >
        {children}
      </Tag>
    </>
  );
}

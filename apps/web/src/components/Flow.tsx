import { CSSProperties, HTMLAttributes, ReactNode } from "react";

/* ============================================================
   Flow: the vertical rhythm primitive.

   A content column whose DIRECT children flow with one consistent,
   margin-bottom-only rhythm, so vertical spacing is a property of the
   system, not a per-page decision (the MAST method, adapted).

   - Every direct child gets --flow-block below it.
   - Headings (h1-h6) bind to what they introduce via --flow-heading, a fixed
     --space-* rung (the block rung since v6.7.0, owner decision A1; one below the group gap), so
     a heading owns its content with a consistent gap whatever its own size.
   - The last child resets to 0, so a column never accumulates trailing space.
   - Override one child's gap with data-flow-gap="major" (a hero band -> the
     content it introduces, the ladder's --space-2xl rung), "tight" (kicker/eyebrow ->
     heading), "group" (a labelled subgroup break), or "none" (collapse it).

   Margin-bottom only: the space ABOVE any element is simply the previous
   element's bottom margin, so there are never competing top/bottom margins.

   Mirrors Prose/[data-prose]: a named, documented primitive backed by an
   attribute-scoped rule. The bare data-flow attribute is the escape hatch when
   a wrapper is not wanted. Every value is a token, so the whole rhythm tunes
   from tokens.css (and rides the spacing dial).
   ============================================================ */

const flowCss = `
[data-flow] > * { margin-top: 0; margin-bottom: var(--flow-block); }
[data-flow] > h1,
[data-flow] > h2,
[data-flow] > h3,
[data-flow] > h4,
[data-flow] > h5,
[data-flow] > h6 { margin-bottom: var(--flow-heading); }
[data-flow] > [data-flow-gap="tight"] { margin-bottom: var(--space-xs); }
[data-flow] > [data-flow-gap="group"] { margin-bottom: var(--flow-group); }
/* The major in-band break (2026-07-15): the ladder's --space-2xl rung, one above
   "group". Flow exposed every rung except this one, so a hero band separated from
   the content below it could only reach for "group" (--space-xl) and then sat at
   exactly the gap its own siblings use, reading as one of them rather than above
   them. The ladder already named the rung; this just lets Flow say it. */
[data-flow] > [data-flow-gap="major"] { margin-bottom: var(--space-2xl); }
[data-flow] > [data-flow-gap="none"]  { margin-bottom: 0; }
[data-flow] > :last-child { margin-bottom: 0; }
`;

export interface FlowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  style?: CSSProperties;
}

export function Flow({ children, style, ...rest }: FlowProps) {
  return (
    <div data-flow="" style={style} {...rest}>
      <style href="magentaweb-flow" precedence="default">{flowCss}</style>
      {children}
    </div>
  );
}

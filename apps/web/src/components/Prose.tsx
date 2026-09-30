import { CSSProperties, HTMLAttributes, ReactNode } from "react";

type ProseSize = "sm" | "md" | "lg";

export interface ProseProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
  children: ReactNode;
  size?: ProseSize;
  style?: CSSProperties;
}

const sizeMap: Record<ProseSize, string> = {
  sm: "var(--type-sm)",
  md: "var(--type-md)",
  lg: "var(--type-lg)",
};

// Child-element typography rhythm. Inline-scoped via [data-prose] so the rules
// only target descendants of a Prose container. Margin-bottom-driven rhythm:
// each block element pushes the next one down, with :last-child stripped so
// the container doesn't accumulate trailing space. Headings ALSO carry a top
// margin at the group rung (v5.5.0; this comment promised it since v1 and the
// rule was never written), so a heading sits farther from the block it does
// not own than from the body it does. The first heading in a Prose container
// skips it via :first-child. All visual values reference semantic tokens.
// React 19 hoists and dedupes <style precedence>.
const proseCss = `
[data-prose] p {
  margin: 0;
  line-height: var(--leading-normal);
  color: var(--text-positive-primary);
}
[data-prose] p:not(:last-child) { margin-bottom: var(--flow-block); }

[data-prose] strong { font-weight: var(--weight-semibold); color: var(--text-positive-primary); }
[data-prose] em { font-style: italic; }

[data-prose] a {
  color: var(--text-positive-link);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-decoration-color: currentColor;
  text-underline-offset: 0.2em;
  transition: color var(--motion-transition);
}
[data-prose] a:hover {
  color: color-mix(in srgb, var(--text-positive-link), var(--text-positive-primary) 30%);
}

[data-prose] kbd {
  font-family: var(--font-code);
  font-size: 0.92em;
}
[data-prose] code {
  font-family: var(--font-code);
  font-size: 0.92em;
  background: var(--accent-soft);
  color: var(--accent-emphasis);
  padding: 0.125em 0.4em;
  margin-inline: 0.1em;
  border-radius: var(--radius-sm);
}

[data-prose] ul,
[data-prose] ol {
  margin: 0;
  padding-inline-start: var(--space-lg);
  line-height: var(--leading-normal);
}
[data-prose] ul:not(:last-child),
[data-prose] ol:not(:last-child) { margin-bottom: var(--flow-block); }
[data-prose] ul { list-style: disc; }
[data-prose] ol { list-style: decimal; }
[data-prose] li:not(:last-child) { margin-bottom: var(--space-2xs); }
[data-prose] li::marker { color: var(--text-positive-tertiary); }

[data-prose] blockquote {
  margin: 0;
  padding-left: var(--space-md);
  border-left: 2px solid var(--border-positive-secondary);
  font-family: var(--font-quote);
  font-style: italic;
  color: var(--text-positive-secondary);
  line-height: var(--leading-snug);
}
/* Same margin-bottom-driven rhythm as every other block here: the old
   margin-block gave blockquotes a top margin (competing with the preceding
   block's bottom margin) and trailing space at the container end (audit). */
[data-prose] blockquote:not(:last-child) { margin-bottom: var(--flow-block); }

/* Heading bind: --flow-heading below, a fixed --space-* rung (the block rung since v6.7.0,
   owner decision A1: section air reads 8:1 against it instead of 6:1), so a heading owns its
   content with a consistent gap whatever its own size.

   Heading SEPARATION above: --flow-group (v5.5.0). Until this release Prose was margin-bottom
   only, so a heading following a paragraph sat --flow-block (md) below it and --flow-heading (lg)
   above its own body: closer to the content it does not own than to the content it does, an
   inversion of the ladder on every prose page, and the reverse of what the header comment
   described. Prose is normal flow, not flex, so this top margin COLLAPSES with the preceding
   block's md bottom margin to a single xl: the ladder reads xl above, lg below. :first-child
   skips it so a container never opens with dead space.

   Flow is deliberately NOT changed: it is the composed-layout primitive where the author marks
   a group break explicitly with data-flow-gap="group". Prose is where markdown and long-form
   copy land with no author in the loop, which is exactly why the rule must live in the sheet.

   h2-h6, not h1: prose content never carries the page's single h1 (the page owns it), and h5/h6
   are bound so a deep heading keeps its rhythm gap (audit; Flow binds h1-h6). */
[data-prose] h2,
[data-prose] h3,
[data-prose] h4,
[data-prose] h5,
[data-prose] h6 {
  margin-bottom: var(--flow-heading);
}
[data-prose] h2:not(:first-child),
[data-prose] h3:not(:first-child),
[data-prose] h4:not(:first-child),
[data-prose] h5:not(:first-child),
[data-prose] h6:not(:first-child) {
  margin-top: var(--flow-group);
}
`;

export function Prose({
  children,
  size = "md",
  style,
  ...rest
}: ProseProps) {
  const merged: CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: sizeMap[size],
    lineHeight: "var(--leading-normal)",
    color: "var(--text-positive-primary)",
    ...style,
  };

  return (
    <div data-prose="" style={merged} {...rest}>
      <style href="magentaweb-prose" precedence="default">{proseCss}</style>
      {children}
    </div>
  );
}

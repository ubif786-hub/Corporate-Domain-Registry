import Link from "next/link";
import { ChevronRight } from "@carbon/icons-react";

/* ============================================================
   Breadcrumbs: the hierarchical path trail for DEEP navigable
   hierarchies (the ReadilyHome partner activation wizard is the
   driving case). It exists for three or more genuinely navigable
   levels; the house doctrine (7 Jul) removed breadcrumbs from the
   mother's own component drill-down pages because two levels plus
   a non-navigable group is decoration, and the back button is the
   affordance there. The docs carry that line; this component is
   for the trails that earn it.

   A DUMB, presentational nav: the consumer supplies the whole
   trail as data, root first. Each navigable level is a next/link
   anchor; the LAST item is the current page, rendered as quiet
   non-link text with aria-current="page" (an href passed on the
   last item is ignored). A non-last item without href renders as
   plain text, a non-navigable level the docs discourage.

   One line in --type-sm: links rest in the secondary ink and
   reveal the accent on hover/focus (the ContactStrip link cue),
   the current page sits in the primary ink, and the aria-hidden
   ChevronRight separators sit in the tertiary ink. The trail
   wraps (flex-wrap) rather than clips; each separator lives
   inside the <li> of the crumb it precedes, so a wrapped line
   never ends on a dangling chevron.

   No auto-collapse and no maxItems in this V1: a trail long
   enough to need truncating is a smell, and collapsing is future
   work if a real case appears.

   Server component: no hooks, no handlers, no directive.
   ============================================================ */

export interface BreadcrumbItem {
  /** Visible crumb text, literal. */
  label: string;
  /** Destination for a navigable level. Ignored on the last item (the
   *  current page is never a link). A non-last item without href renders
   *  as plain text; allowed, but a level worth naming is usually worth
   *  a page. */
  href?: string;
}

export interface BreadcrumbsProps {
  /** The trail, root first. The last item is the current page: quiet
   *  non-link text with aria-current="page"; its href, if passed, is
   *  ignored. */
  items: BreadcrumbItem[];
  /** Accessible name for the nav landmark. Default "Breadcrumb". */
  ariaLabel?: string;
}

export function Breadcrumbs({ items, ariaLabel = "Breadcrumb" }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav data-mw-breadcrumbs="" aria-label={ariaLabel}>
      <style href="magentaweb-breadcrumbs" precedence="default">{css}</style>
      <ol data-mw-breadcrumbs-trail="" role="list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${i}-${item.label}`} data-mw-breadcrumbs-item="">
              {i > 0 && (
                <span data-mw-breadcrumbs-sep="" aria-hidden="true">
                  <ChevronRight size={16} />
                </span>
              )}
              {isLast ? (
                <span data-mw-breadcrumbs-current="" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link href={item.href} data-mw-breadcrumbs-link="">
                  {item.label}
                </Link>
              ) : (
                <span data-mw-breadcrumbs-text="">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const css = `
[data-mw-breadcrumbs-trail] {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2xs);
  font-family: var(--font-body);
  font-size: var(--type-sm);
  line-height: var(--leading-normal);
  color: var(--text-positive-secondary);
}
[data-mw-breadcrumbs-item] {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  min-width: 0;
}
/* The ContactStrip link cue: the trail's own ink at rest, the accent
   revealed on hover/focus, so the trail reads as one quiet line until
   pointed at. */
[data-mw-breadcrumbs-link] {
  color: var(--text-positive-secondary);
  text-decoration: none;
  transition: color var(--motion-transition);
}
[data-mw-breadcrumbs-link]:hover {
  color: var(--accent-ink);
}
[data-mw-breadcrumbs-link]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
  color: var(--accent-ink);
}
[data-mw-breadcrumbs-sep] {
  display: inline-flex;
  align-items: center;
  color: var(--text-positive-tertiary);
}
[data-mw-breadcrumbs-current] {
  color: var(--text-positive-primary);
}
`;

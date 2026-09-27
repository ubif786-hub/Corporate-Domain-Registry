import Link from "next/link";

/* ============================================================
   TabLinks: route navigation dressed as tabs. Tabs' visual kin
   for the LINK case: where Tabs is an in-place ARIA tabs widget
   (button triggers switching co-located panels, never touching
   the URL), TabLinks navigates between sibling ROUTES that
   present as tab sections (the ReadilyHome Inventory / Projects
   / Doc vault case). Deliberately NOT role="tablist": a tablist
   promises arrow-key panel switching this component does not do.
   These are next/link anchors in a named nav landmark, so screen
   readers hear honest link navigation, and the active route
   announces via aria-current="page".

   A DUMB, presentational nav (the NavRail doctrine): the
   consumer computes which item is active (its own route match)
   and passes `active`; the component only renders it. Empty
   items renders nothing.

   The list wears Tabs' horizontal voice: the code face at
   --type-sm with wide tracking over the shared hairline,
   inactive items in the secondary ink lifting to primary on
   hover, the active item in the primary ink at semibold with
   the 2px accent underline.

   Overflow: the active underline is an inset ::after layer on the
   link (a border-bottom curled its ends under the focus rule's
   radius at the soft/pronounced dials), not Tabs' list-level
   absolutely positioned indicator (bottom:-1px), so the list can
   take overflow-x: auto and scroll in place at
   narrow viewports with nothing to clip (the Tabs 320px residual
   in REFACTOR_QUEUE is not inherited).

   Server component: no hooks, no handlers, no directive.
   ============================================================ */

export interface TabLinkItem {
  /** Visible tab text, literal. */
  label: string;
  /** Destination route, passed to next/link. */
  href: string;
  /** The consumer decides active (route match); TabLinks only renders it:
   *  primary ink at semibold, the accent underline, aria-current="page". */
  active?: boolean;
}

export interface TabLinksProps {
  /** The tab-shaped sibling routes, in order. Empty renders nothing. */
  items: TabLinkItem[];
  /** Accessible name for the nav landmark. Default "Sections". */
  ariaLabel?: string;
}

export function TabLinks({ items, ariaLabel = "Sections" }: TabLinksProps) {
  if (items.length === 0) return null;
  return (
    <nav data-mw-tablinks="" aria-label={ariaLabel}>
      <style href="magentaweb-tablinks" precedence="default">{css}</style>
      <ul data-mw-tablinks-list="" role="list">
        {items.map((item) => (
          <li key={item.href} data-mw-tablinks-item="">
            <Link
              href={item.href}
              data-mw-tablinks-link=""
              data-active={item.active ? "true" : "false"}
              aria-current={item.active ? "page" : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const css = `
[data-mw-tablinks-list] {
  list-style: none;
  /* No outward margin (v5.5.0, S-10). This carried margin-bottom lg, Tabs' list-to-panel
     bind, but Tabs OWNS its panels and TabLinks does not: the content below is the
     consumer's, so in a gap-spaced column (the house way) the margin summed with the gap
     and the list sat one rung too far from what it navigates. The consumer's layout binds
     the list to its content at --flow-heading (lg); the doc says so. Owner decision,
     22 Aug 2026. */
  margin: 0;
  padding: 0;
  display: flex;
  gap: var(--space-lg);
  border-bottom: 1px solid var(--border-positive-primary);
  /* A long set scrolls in place on narrow viewports instead of widening the
     page. Safe here because the active underline is a border on the link
     itself, so the scrollbox has no positioned indicator to clip. */
  overflow-x: auto;
  scrollbar-width: none;
}
[data-mw-tablinks-list]::-webkit-scrollbar {
  display: none;
}
[data-mw-tablinks-item] {
  flex-shrink: 0;
}
[data-mw-tablinks-link] {
  position: relative;
  display: block;
  white-space: nowrap;
  font-family: var(--font-code);
  /* DECLARED, NOT INHERITED (the leading-pins census, 2 Sep 2026). Same call as
     Tabs above, and the pair must move together or the two tab vocabularies stop
     lining up with each other. */
  line-height: var(--leading-tight);
  font-size: var(--type-sm);
  letter-spacing: var(--tracking-wide);
  color: var(--text-positive-secondary);
  text-decoration: none;
  /* The old bottom padding plus the 2px the border-bottom underline occupied:
     the underline is a layer now (the ::after below), so the box compensates to
     keep the baseline and the total height identical. */
  padding: var(--space-sm) 0 calc(var(--space-sm) + 2px);
  transition: color var(--motion-transition);
}
/* The active underline is a LAYER, not a border (structural audit, 15 Jul).
   As a border-bottom it lived on the same element the focus rule rounds, so a
   keyboard-focused active tab's underline ends curved at the soft and pronounced
   dials - a line reacting to a corner dial. An absolutely positioned child
   ignores the element's border-radius, so it stays straight at every dial while
   the focus ring keeps its rounded shape. Always present (transparent at rest)
   so the active accent never shifts the baseline; sits flush above the list
   hairline, reading as one rule. */
[data-mw-tablinks-link]::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: transparent;
  transition: background var(--motion-transition);
}
[data-mw-tablinks-link]:hover {
  color: var(--text-positive-primary);
}
[data-mw-tablinks-link][data-active="true"] {
  color: var(--text-positive-primary);
  font-weight: var(--weight-semibold);
}
[data-mw-tablinks-link][data-active="true"]::after {
  background: var(--accent-base);
}
[data-mw-tablinks-link]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
  border-radius: var(--component-radius);
}
`;

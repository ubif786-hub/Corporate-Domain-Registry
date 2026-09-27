import { MouseEvent, ReactElement, ReactNode } from "react";
import Link from "next/link";
import { SidePanelClose, SidePanelOpen } from "@carbon/icons-react";
import { NavRailThemeLink } from "@/components/NavRailThemeLink";

/* ============================================================
   NavRail — the left rail of the app shell. A DUMB, presentational component:
   it reads `collapsed` and a list of nav items as props and holds no routing
   logic of its own. The consumer computes which item is active (its own
   usePathname) and passes `active`, and may pass an `onClick` per item (e.g. a
   page-transition exit). That keeps the rail reusable across every fork and its
   own app surfaces.

   Collapsed it is icon-only at 3rem (~48px); expanded it is icon + label at
   16rem (~256px), the width animating between the two. The active item carries
   a short inset accent bar (radius-safe at every dial) plus a subtle accent-soft fill.
   In the collapsed icon-only state each item reuses the Button icon hover
   motion: the glyph rises and fades while a clone rises from below to replace
   it. Widths, colours, and spacing are token-driven.

   Not a client component: it renders Links and passes handlers through, with no
   hooks, so it works server-side (fork pages with a computed active) or inside
   a client shell (which supplies onClick). AppShell owns the responsive fold;
   the rail only reacts to `collapsed`.
   ============================================================ */

export interface NavRailItem {
  href: string;
  label: string;
  icon: ReactElement;
  /** The consumer decides active (route match); the rail only renders it. */
  active?: boolean;
  /** Optional per-item click (e.g. a controlled page-transition exit). */
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

/** A page-local nested group rendered under the core items, behind a divider
 *  (the ArtistHQ pattern: the series list on Works, courses on Learn). Same
 *  item shape as the core list; the styling is one step quieter (tertiary ink
 *  at rest), and its active item wears the 2px accent rule over the
 *  --accent-wash ground at medium weight. */
export interface NavRailSubgroup {
  /** Mono micro title over the group (fades out while collapsed). */
  title?: string;
  items: NavRailItem[];
}

export interface NavRailProps {
  items: NavRailItem[];
  /** Optional page-local subgroup under the core items, behind a divider. */
  subgroup?: NavRailSubgroup;
  collapsed?: boolean;
  /** Optional slot pinned to the foot of the rail. */
  footer?: ReactNode;
  /** Renders the light/dark control at the foot as a REAL rail item (see
   *  NavRailThemeLink), directly above the collapse control. The two pair on
   *  purpose: both change how the UI presents itself rather than anything about
   *  the account, so neither should sit three clicks deep in settings (owner,
   *  15 Jul 2026).
   *
   *  Opt-in, and off by default on purpose: a product that fixes its theme ships
   *  no toggle, so the rail must not assume one. Both shells in this repo pass it
   *  (DocsShell and HqShell; light/dark left MasterControls at v4.5.0, which now
   *  holds only the four design dials), and a fork with the (site) ThemeProvider
   *  should pass it too. Safe either way: NavRailThemeLink is provider-optional
   *  and degrades to a non-persisting dial flip rather than throwing. */
  themeToggle?: boolean;
  /** When set, the rail renders its own collapse/expand control pinned to the
   *  very bottom (below `footer` and the theme link), styled and choreographed
   *  exactly like a rail item: icon-only when collapsed with the dual-stack hover,
   *  icon + label when expanded. Desktop-only (below --mw-bp-desktop the rail is
   *  an overlay and the backdrop / Escape / link-click already close it). AppShell
   *  wires this to its toggle; the rail still never owns the state. */
  onToggle?: () => void;
  /** Accessible name for the <nav> landmark. */
  ariaLabel?: string;
}

export function NavRail({
  items,
  subgroup,
  collapsed = false,
  footer,
  themeToggle = false,
  onToggle,
  ariaLabel = "Primary",
}: NavRailProps) {
  const toggleIcon = collapsed ? <SidePanelOpen size={20} /> : <SidePanelClose size={20} />;
  const toggleLabel = collapsed ? "Expand" : "Collapse";
  // One item renderer for both lists: a subgroup link differs only by the
  // data-subgroup flag the sheet keys its quieter dress on.
  const renderItem = (item: NavRailItem, isSubgroup: boolean) => (
    <li key={item.href}>
      <Link
        href={item.href}
        data-mw-navrail-link=""
        data-subgroup={isSubgroup ? "true" : undefined}
        data-active={item.active ? "true" : "false"}
        aria-current={item.active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        onClick={item.onClick}
      >
        <span data-mw-navrail-ico="">
          <span data-mw-navrail-ico-primary="">{item.icon}</span>
          <span data-mw-navrail-ico-clone="" aria-hidden="true">{item.icon}</span>
        </span>
        <span data-mw-navrail-label="">{item.label}</span>
      </Link>
    </li>
  );
  return (
    <nav data-mw-navrail="" data-collapsed={collapsed ? "true" : "false"} aria-label={ariaLabel}>
      <style href="magentaweb-navrail" precedence="default">{css}</style>
      <ul data-mw-navrail-items="" role="list">
        {items.map((item) => renderItem(item, false))}
      </ul>
      {subgroup && subgroup.items.length > 0 && (
        <div data-mw-navrail-subgroup="">
          {subgroup.title && (
            <span data-mw-navrail-subtitle="">{subgroup.title}</span>
          )}
          <ul
            data-mw-navrail-items=""
            aria-label={subgroup.title || "Page sections"}
            role="list"
          >
            {subgroup.items.map((item) => renderItem(item, true))}
          </ul>
        </div>
      )}
      {(footer || themeToggle || onToggle) && (
        <div data-mw-navrail-foot="">
          {footer}
          {themeToggle && <NavRailThemeLink collapsed={collapsed} />}
          {onToggle && (
            <button
              type="button"
              data-mw-navrail-link=""
              data-mw-navrail-toggle=""
              data-active="false"
              title={collapsed ? toggleLabel : undefined}
              aria-label={`${toggleLabel} navigation`}
              aria-expanded={!collapsed}
              onClick={onToggle}
            >
              <span data-mw-navrail-ico="">
                <span data-mw-navrail-ico-primary="">{toggleIcon}</span>
                <span data-mw-navrail-ico-clone="" aria-hidden="true">{toggleIcon}</span>
              </span>
              <span data-mw-navrail-label="">{toggleLabel}</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

const css = `
[data-mw-navrail] {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  width: var(--rail-width);
  padding-block: var(--space-md);
  /* The same space-sm inline padding the TopBar carries (owner, 9 Jul): the
     links inset from the rail edges and the icon column starts at the same x
     as the bar's brand column, keeping the two on one axis. */
  padding-inline: var(--space-sm);
  box-sizing: border-box;
  overflow: hidden;
  background: var(--background-positive-primary);
  border-right: 1px solid var(--border-positive-primary);
  transition: width var(--motion-reveal-duration) var(--motion-ease);
}
[data-mw-navrail][data-collapsed="true"] {
  /* The 3rem icon column plus the inline padding both sides (the token
     carries the calc; TopBar's brand column reads the same token so the
     bar's divider tracks the rail edge exactly). */
  width: var(--rail-width-collapsed);
}
[data-mw-navrail-items] {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
}
[data-mw-navrail-link] {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--control-size-xl);
  border-radius: var(--component-radius);
  color: var(--text-positive-secondary);
  font-family: var(--font-body);
  font-size: var(--type-sm);
  text-decoration: none;
  white-space: nowrap;
  transition:
    background var(--motion-transition),
    color var(--motion-transition);
}
[data-mw-navrail-link]:hover {
  background: var(--background-positive-secondary);
  color: var(--text-positive-primary);
}
[data-mw-navrail-link][data-active="true"] {
  background: var(--accent-soft);
  color: var(--accent-emphasis);
}
/* Active indicator: a vertically-centred accent bar inset from the left edge
   with its own full radius, so it sits inside the link's rounded corners at
   every radius dial rather than a flush full-height bar the rounding would
   clip. v4.8.0 tune (owner): lengthened 44% -> 62% and widened to 3px to match
   the AccentRule strip weight — the short bar read truncated. */
[data-mw-navrail-link][data-active="true"]::before {
  content: "";
  position: absolute;
  left: var(--space-2xs);
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 62%;
  border-radius: var(--radius-full);
  background: var(--accent-base);
}
/* Subgroup (the page-local nested group): one step quieter than the core
   items. Tertiary ink at rest (hover lifts it back through the shared hover
   rule's primary), and its ACTIVE item wears the ArtistHQ treatment: the 2px
   accent rule (the shared ::before below), the --accent-wash ground (the 8%
   alpha wash, quieter than the core items' --accent-soft fill), and medium
   weight in the primary ink. */
[data-mw-navrail-link][data-subgroup="true"] {
  color: var(--text-positive-tertiary);
}
[data-mw-navrail-link][data-subgroup="true"]:hover {
  color: var(--text-positive-primary);
}
[data-mw-navrail-link][data-subgroup="true"][data-active="true"] {
  background: var(--accent-wash);
  color: var(--text-positive-primary);
  font-weight: var(--weight-medium);
}
[data-mw-navrail-subgroup] {
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-positive-primary);
}
/* The subgroup title: the mono micro metadata voice (the DataLabel role's
   dress), indented to the label column so it aligns with the item labels,
   and fading out with them when the rail collapses to icons. */
[data-mw-navrail-subtitle] {
  display: block;
  padding-left: var(--rail-icon-column); /* the icon column, so the title sits on the label axis */
  margin-bottom: var(--space-2xs);
  font-family: var(--font-code);
  font-size: var(--type-2xs);
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-positive-tertiary);
  white-space: nowrap;
  opacity: 1;
  transition: opacity var(--motion-duration) var(--motion-ease);
}
[data-mw-navrail][data-collapsed="true"] [data-mw-navrail-subtitle] {
  opacity: 0;
}
[data-mw-navrail-link]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: -2px;
}
/* Icon slot: fixed at the collapsed rail width so the glyph never moves across
   the collapse. Clips the dual-stack clone until hover. */
[data-mw-navrail-ico] {
  position: relative;
  flex: 0 0 var(--rail-icon-column);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
[data-mw-navrail-ico-primary] {
  display: inline-flex;
  transition:
    transform var(--motion-transition),
    opacity var(--motion-transition);
}
[data-mw-navrail-ico-clone] {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(100%);
  transition:
    transform var(--motion-transition),
    opacity var(--motion-transition);
}
[data-mw-navrail-label] {
  white-space: nowrap;
  opacity: 1;
  transition: opacity var(--motion-duration) var(--motion-ease);
}
[data-mw-navrail][data-collapsed="true"] [data-mw-navrail-label] {
  opacity: 0;
}
/* Collapsed icon-only: reuse the Button icon dual-stack hover motion. */
[data-mw-navrail][data-collapsed="true"] [data-mw-navrail-link]:hover [data-mw-navrail-ico-primary] {
  transform: translateY(-100%);
  opacity: 0;
}
[data-mw-navrail][data-collapsed="true"] [data-mw-navrail-link]:hover [data-mw-navrail-ico-clone] {
  transform: translateY(0);
  opacity: 1;
}
/* The foot stacks its items on the same rung the main list uses, so the theme
   link and the collapse control read as a continuation of the rail rather than a
   separate cluster. */
[data-mw-navrail-foot] {
  margin-top: auto;
  padding-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
}
/* Rail items that are <button>s rather than Links: the theme link and the
   rail-owned collapse control. This reset is ALL that separates them from the
   Links above (same hover, same dual-stack glyph choreography, same label fade);
   the shared link dress supplies display, font, and colour. */
[data-mw-navrail-action],
[data-mw-navrail-toggle] {
  border: 0;
  margin: 0;
  padding: 0;
  background: none;
  cursor: pointer;
  text-align: left;
}
/* Collapse is desktop-only: below --mw-bp-desktop the rail is an overlay and
   collapse has no meaning there. The theme link carries no such gate, so it stays
   reachable at every width. */
[data-mw-navrail-toggle] {
  display: none;
}
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-navrail-toggle] { display: flex; }
}
/* still + reduced motion: no width / opacity / glyph transition, instant. */
@media (prefers-reduced-motion: reduce) {
  [data-mw-navrail],
  [data-mw-navrail] [data-mw-navrail-label],
  [data-mw-navrail] [data-mw-navrail-subtitle],
  [data-mw-navrail] [data-mw-navrail-ico-primary],
  [data-mw-navrail] [data-mw-navrail-ico-clone] { transition: none; }
  [data-mw-navrail][data-collapsed="true"] [data-mw-navrail-link]:hover [data-mw-navrail-ico-primary] { transform: none; opacity: 1; }
  [data-mw-navrail][data-collapsed="true"] [data-mw-navrail-link]:hover [data-mw-navrail-ico-clone] { transform: none; opacity: 0; }
}
html[data-motion="still"] [data-mw-navrail],
html[data-motion="still"] [data-mw-navrail] [data-mw-navrail-label],
html[data-motion="still"] [data-mw-navrail] [data-mw-navrail-subtitle],
html[data-motion="still"] [data-mw-navrail] [data-mw-navrail-ico-primary],
html[data-motion="still"] [data-mw-navrail] [data-mw-navrail-ico-clone] { transition: none; }
`;

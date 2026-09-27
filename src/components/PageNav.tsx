"use client";

import { useEffect, useId, useState } from "react";
import { Close, TableOfContents } from "@carbon/icons-react";

/* ============================================================
   PageNav — the shared "on this page" rail. A floating frosted panel pinned
   to the top-right below the chrome bar, listing a page's sections with
   live active-section tracking: an IntersectionObserver watches the section
   headings through a reading band in the upper viewport (top 20% to 40%),
   and the section inside it drives the highlight (the house active idiom:
   accent color, semibold, accent left border, aria-current).

   Floating by design: position fixed, so it never pushes content into a
   narrower column (the layout divergence the hand-rolled showroom rail
   created). The head toggle collapses it to a lone icon button in the same
   corner. Below --mw-bp-desktop the rail hides entirely, matching the
   system's breakpoint doctrine (fixed rails are desktop furniture) and the
   behavior of the rails it replaces.

   Offsets derive from --chrome-bar-height (the shared top-bar height in
   tokens.css), never hardcoded chrome numbers. Anchor targets should carry
   scroll-margin-top: calc(var(--chrome-bar-height) + var(--space-fixed-lg))
   so a clicked section lands clear of the bar.

   The `sections` list is a contract with the page's actual heading ids:
   scripts/check-sync-unit.mjs statically extracts both from the kit pages
   and fails on any mismatch, so a renamed id cannot silently dead-end a
   link. Self-contained (own style emission, no layout context), sync-unit,
   works in any route group and in forks.
   ============================================================ */

export interface PageNavSection {
  id: string;
  label: string;
}

export interface PageNavProps {
  /** The page's sections, in document order; ids must match real element ids. */
  sections: PageNavSection[];
  /** Head label and nav landmark name. */
  title?: string;
  /** Start collapsed (the lone toggle button). TRUE by default since v6.7.0 (owner decision A3,
   *  5 Sep 2026): the open rail covered live content at every sanctioned desktop width, on the
   *  docs and on every fork's long pages. Collapsed, it is a thin affordance in the corner that
   *  opens on hover or keyboard focus and pins open on click. Pass false to start it open. */
  defaultCollapsed?: boolean;
}

export function PageNav({ sections, title = "On this page", defaultCollapsed = true }: PageNavProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const listId = useId();

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // The reading band: a section is "current" while its heading sits in the
    // upper-middle of the viewport (same tuning as the docs sidebar).
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <>
      <style href="magentaweb-page-nav" precedence="default">{pageNavCss}</style>
      <nav data-mw-page-nav="" data-collapsed={collapsed ? "true" : "false"} aria-label={title}>
        <div data-mw-page-nav-head="">
          <span data-mw-page-nav-title="">{title}</span>
          <button
            type="button"
            data-mw-page-nav-toggle=""
            aria-expanded={!collapsed}
            aria-controls={listId}
            aria-label={collapsed ? "Show page navigation" : "Hide page navigation"}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <TableOfContents size={16} aria-hidden="true" /> : <Close size={16} aria-hidden="true" />}
          </button>
        </div>
        <ul id={listId} data-mw-page-nav-list="" role="list">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                data-mw-page-nav-link=""
                data-active={s.id === activeId ? "true" : "false"}
                aria-current={s.id === activeId ? "location" : undefined}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

// Hidden below desktop (the base rule); a floating frosted panel at and above
// --mw-bp-desktop. The frosted recipe is the TopBar/modal one: scrim + blur.
const pageNavCss = `
[data-mw-page-nav] { display: none; }
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-page-nav] {
    display: block;
    position: fixed;
    top: calc(var(--chrome-bar-height) + var(--space-fixed-xl));
    right: var(--space-fixed-lg);
    z-index: var(--z-raised);
    width: 13rem;
    max-height: calc(100vh - var(--chrome-bar-height) - 2 * var(--space-fixed-xl));
    overflow-y: auto;
    padding: var(--space-fixed-md);
    background: var(--modal-scrim);
    -webkit-backdrop-filter: blur(var(--overlay-blur));
    backdrop-filter: blur(var(--overlay-blur));
    border: 1px solid var(--border-positive-primary);
    border-radius: var(--component-radius);
    box-shadow: var(--shadow-subtle);
  }
  /* Collapsed is the default (A3). A pointer resting on the disc, or keyboard focus inside the
     rail, opens it in place without changing the pinned state; the click still pins. Both
     conditions are pure CSS, so the open-on-hover panel costs no state and closes by itself. */
  [data-mw-page-nav][data-collapsed="true"]:not(:hover):not(:focus-within) {
    width: auto;
    max-height: none;
    overflow: visible;
    padding: var(--space-fixed-2xs);
  }
  [data-mw-page-nav][data-collapsed="true"]:not(:hover):not(:focus-within) [data-mw-page-nav-title],
  [data-mw-page-nav][data-collapsed="true"]:not(:hover):not(:focus-within) [data-mw-page-nav-list] {
    display: none;
  }
}
[data-mw-page-nav-head] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-fixed-sm);
}
[data-mw-page-nav-title] {
  font-family: var(--font-code);
  font-size: var(--type-2xs);
  letter-spacing: var(--label-tracking);
  text-transform: uppercase;
  color: var(--text-positive-tertiary);
}
[data-mw-page-nav-toggle] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--control-size-sm);
  height: var(--control-size-sm);
  border: 0;
  border-radius: var(--component-radius);
  background: transparent;
  color: var(--text-positive-secondary);
  cursor: pointer;
  transition: color var(--motion-transition), background var(--motion-transition);
}
[data-mw-page-nav-toggle]:hover {
  color: var(--text-positive-primary);
  background: var(--background-positive-secondary);
}
[data-mw-page-nav-toggle]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
[data-mw-page-nav-list] {
  list-style: none;
  margin: var(--space-fixed-sm) 0 0;
  padding: 0;
}
[data-mw-page-nav-link] {
  display: block;
  padding: var(--space-fixed-2xs) 0 var(--space-fixed-2xs) var(--space-fixed-sm);
  border-left: 2px solid transparent;
  font-family: var(--font-code);
  font-size: var(--type-xs);
  line-height: var(--leading-snug);
  color: var(--text-positive-secondary);
  text-decoration: none;
  transition:
    color var(--motion-transition),
    border-color var(--motion-transition),
    font-weight var(--motion-transition);
}
[data-mw-page-nav-link]:hover { color: var(--text-positive-primary); }
[data-mw-page-nav-link][data-active="true"] {
  color: var(--accent-ink);
  font-weight: var(--weight-semibold);
  border-left-color: var(--accent-base);
}
[data-mw-page-nav-link]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
  border-radius: var(--component-radius);
}
`;

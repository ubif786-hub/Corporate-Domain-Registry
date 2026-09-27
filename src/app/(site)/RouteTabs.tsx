"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS } from "@/data/site";

/* The primary navigation as a tab strip: equal tabs across the full width, the body face at
   medium weight, the accent underline on the active route. bltz.com's bar, in the system's
   tokens. Fork-owned: the kit's TabLinks speaks the docs' mono voice and left-aligns, which
   reads as chrome around documentation, not a registrar's nav. Scrolls sideways on a phone. */

const css = `
[data-ds-routetabs] { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
[data-ds-routetabs]::-webkit-scrollbar { display: none; }
[data-ds-routetabs] ul { display: flex; margin: 0; padding: 0; list-style: none; min-width: max-content; }
[data-ds-routetabs] li { flex: 1 1 0; min-width: max-content; }
[data-ds-routetabs] a {
  display: block;
  text-align: center;
  padding: var(--space-sm) var(--space-lg);
  font-family: var(--font-body);
  font-size: var(--type-md);
  font-weight: var(--weight-medium);
  line-height: var(--leading-tight);
  color: var(--text-positive-secondary);
  text-decoration: none;
  border-bottom: var(--rule-weight-strong) solid transparent;
  transition: color var(--motion-transition), border-color var(--motion-transition);
  white-space: nowrap;
}
[data-ds-routetabs] a:hover { color: var(--text-positive-primary); }
[data-ds-routetabs] a[aria-current="page"] { color: var(--text-positive-primary); border-bottom-color: var(--cdr-mark-red); }
[data-ds-routetabs] a:focus-visible { outline: 2px solid var(--border-focus); outline-offset: -2px; }
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-ds-routetabs] ul { min-width: 0; }
}
/* ON A PHONE ALL FOUR TABS FIT, they do not scroll (21 Sep 2026). Measured on the live site at 390:
   "Terms of service" ran from 322 to 499 in a 358 strip, and with the scrollbar hidden on purpose
   nothing said the strip scrolled, so the client read it as cut off. The words stay as approved;
   the tabs take the smaller step and a tight inline pad, and each is as wide as its own label plus
   a share of what is left, because four EQUAL tabs cannot hold one label three times the others.
   overflow-x stays as the net for a phone narrower than any measured here. */
@media (max-width: 639px) { /* under --mw-bp-tablet */
  [data-ds-routetabs] ul { min-width: 0; }
  [data-ds-routetabs] li { flex: 1 1 auto; }
  [data-ds-routetabs] a { padding-inline: var(--space-3xs); font-size: var(--type-sm); }
}
`;

export function RouteTabs() {
  const pathname = usePathname() ?? "";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav data-ds-routetabs="" aria-label="Site">
      <style href="domain-services-routetabs" precedence="default">{css}</style>
      <ul>
        {NAV_TABS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} aria-current={isActive(t.href) ? "page" : undefined}>{t.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

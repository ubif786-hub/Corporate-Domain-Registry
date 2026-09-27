"use client";

import { ReactNode, useMemo, useState } from "react";
import { ChevronRight } from "@carbon/icons-react";
import { Toolbar } from "@/components/Toolbar";
import { Search } from "@/components/Search";
import { Select } from "@/components/Select";
import { Heading } from "@/components/Heading";
import { Badge } from "@/components/Badge";

/* ============================================================
   ShowroomIndex — the client half of the showroom's SURFACE register (v6.36.0,
   the CD reference-surface boards: the Components index in the HQ register).
   The server page derives one row per registry component from the kit manifest
   (glyph, sample and the row's link rendered server-side and passed through as
   slots); this island owns the filter query, the group select and the row
   rendering. The look is the clients index's: the Toolbar (a Search on the sm
   rung, the group Select, the live count under them), sans group heads with a
   solid count chip on the page ground, rows in list density with one hairline
   BETWEEN rows and never under a head, the kind as a caps chip, the variants as
   code chips set as written, the entry's live sample at row height, a chevron
   where the row opens the component's own page.

   At 390 the sample column hides and the row keeps name, kind, options and
   variants (the board's phone rule). The grid lives in the hoisted sheet, not
   inline, so the phone rule can win the cascade.
   ============================================================ */

export interface ShowroomIndexRow {
  name: string;
  label: string;
  slug: string;
  group: string;
  kind: string;
  variants: string[];
  options: number;
  glyph: ReactNode;
  sample: ReactNode;
  /** The component's own page, where one exists; a row without one has no link and no chevron. */
  href?: string;
}

function matches(r: ShowroomIndexRow, q: string): boolean {
  return (
    r.label.toLowerCase().includes(q) ||
    r.name.toLowerCase().includes(q) ||
    r.slug.includes(q) ||
    r.variants.some((v) => v.toLowerCase().includes(q))
  );
}

export function ShowroomIndex({ groups, rows }: { groups: string[]; rows: ShowroomIndexRow[] }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const query = q.trim().toLowerCase();

  const shownGroups = useMemo(() => {
    const wanted = group === "all" ? groups : groups.filter((g) => g === group);
    return wanted
      .map((g) => ({ group: g, items: rows.filter((r) => r.group === g && (!query || matches(r, query))) }))
      .filter((g) => g.items.length > 0);
  }, [groups, rows, group, query]);
  const shown = shownGroups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div data-mw-showroom-index="">
      <style href="magentaweb-showroom-index" precedence="default">{css}</style>
      <Toolbar
        ariaLabel="Component filters"
        filters={
          <>
            <span data-mw-sri-search="">
              <Search id="sri-q" label="Filter components" labelHidden size="sm" placeholder="Filter by name or variant" value={q} onChange={setQ} />
            </span>
            {/* A PAGE toolbar keeps the boxed field on the sm rung beside the Search (the owner's G3;
                the filter look is a panel head's). */}
            <span data-mw-sri-group="">
              <Select
                id="sri-group"
                label="Group"
                labelHidden
                size="sm"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                options={[{ value: "all", label: "All groups" }, ...groups.map((g) => ({ value: g, label: g }))]}
              />
            </span>
          </>
        }
        count={`${shown} shown`}
      />
      {shownGroups.length === 0 ? <p data-mw-sri-empty="">No components match &ldquo;{q}&rdquo;.</p> : null}
      <div data-mw-sri-groups="">
        {shownGroups.map((g) => {
          const id = "atlas-" + g.group.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          return (
            <section key={g.group} aria-labelledby={id} data-mw-sri-group="">
              <div data-mw-sri-head="">
                <Heading level={2} size={6} id={id}>{g.group}</Heading>
                <Badge tone="neutral" emphasis="solid">{String(g.items.length)}</Badge>
              </div>
              <ul data-mw-sri-rows="" role="list">
                {g.items.map((r) => (
                  <li key={r.slug} data-mw-sri-row="">
                    <span data-mw-sri-glyph="" aria-hidden="true">{r.glyph}</span>
                    {r.href ? <a href={r.href} data-mw-sri-name="">{r.label}</a> : <span data-mw-sri-name="">{r.label}</span>}
                    <span data-mw-sri-kind=""><Badge tone="neutral">{r.kind}</Badge></span>
                    <span data-mw-sri-options="">{r.options} option{r.options === 1 ? "" : "s"}</span>
                    <span data-mw-sri-vars="">
                      {r.variants.map((v) => (
                        <span key={v} data-mw-sri-code="">{v}</span>
                      ))}
                    </span>
                    <span data-mw-sri-sample="">{r.sample}</span>
                    {/* The chevron opens the page too (v6.36.1): the row's live sample can be a control of
                        its own, so the row is not one link, and an arrow that did nothing was a defect. */}
                    {r.href ? (
                      <a href={r.href} data-mw-sri-chev="" aria-label={`Open ${r.label}`}><ChevronRight /></a>
                    ) : (
                      <span data-mw-sri-chev="" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// The row grid: glyph, name, kind, options, variants, sample, chevron (16 · 220 · 72 · 104 · 1fr ·
// 240 · 20 on the board at a 16px root). Rules between rows only. The phone rule reflows the row
// to name / kind / options / chevron on one line and the variants under them, the sample hidden.
const css = `
[data-mw-showroom-index] { display: flex; flex-direction: column; gap: var(--space-lg); }
[data-mw-sri-search] { display: inline-flex; width: 20rem; max-width: 100%; }
[data-mw-sri-group] { display: inline-flex; flex: 0 1 12rem; min-width: 9rem; }
/* The head's counts pair up at the phone width via StatBand's own phoneColumns={2}
   sheet rule; this external override could never win against StatBand's inline
   display, which is why it never applied (REF-STATBAND-390). */
[data-mw-sri-empty] { margin: 0; font-family: var(--font-code); font-size: var(--type-xs); color: var(--text-positive-tertiary); }
[data-mw-sri-groups] { display: flex; flex-direction: column; gap: var(--space-xl); }
[data-mw-sri-group] { display: flex; flex-direction: column; gap: var(--space-sm); }
[data-mw-sri-head] { display: flex; align-items: center; gap: var(--space-xs); min-height: var(--control-size-xs); scroll-margin-top: calc(var(--chrome-bar-height) + var(--space-md)); }
[data-mw-sri-rows] { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
[data-mw-sri-row] {
  display: grid;
  grid-template-columns: 1rem 13.75rem 4.5rem 6.5rem minmax(0, 1fr) 15rem 1.25rem;
  column-gap: var(--space-sm);
  align-items: center;
  padding: var(--space-xs) 0;
  min-height: 3rem;
  border-top: 1px solid var(--border-positive-primary);
}
[data-mw-sri-row]:first-child { border-top: 0; }
[data-mw-sri-glyph] { display: inline-flex; width: 1rem; height: 1rem; color: var(--text-positive-tertiary); }
[data-mw-sri-glyph] svg { width: 1rem; height: 1rem; }
[data-mw-sri-name] {
  font-family: var(--font-body); font-weight: var(--weight-semibold); font-size: var(--type-sm);
  color: var(--text-positive-primary); text-decoration: none;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
a[data-mw-sri-name]:hover { text-decoration: underline; text-underline-offset: 0.15em; }
a[data-mw-sri-name]:focus-visible { outline: var(--focus-outline); outline-offset: 2px; }
[data-mw-sri-kind] { display: inline-flex; }
[data-mw-sri-options] { font-family: var(--font-code); font-size: var(--type-xs); color: var(--text-positive-secondary); white-space: nowrap; font-variant-numeric: tabular-nums; }
[data-mw-sri-vars] { display: flex; flex-wrap: wrap; gap: var(--space-2xs); min-width: 0; }
[data-mw-sri-code] {
  display: inline-flex; align-items: center; height: 1.3125rem; padding: 0 var(--space-2xs);
  font-family: var(--font-code); font-size: var(--type-2xs); line-height: 1; white-space: nowrap;
  color: var(--accent-ink); background: var(--accent-soft); border-radius: var(--component-radius);
}
[data-mw-sri-sample] { display: flex; align-items: center; gap: var(--space-xs); min-height: 1.75rem; min-width: 0; overflow: hidden; }
[data-mw-sri-chev] { display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; height: 1.25rem; color: var(--text-positive-tertiary); }
[data-mw-sri-chev] svg { width: 1.25rem; height: 1.25rem; }
a[data-mw-sri-chev] { border-radius: var(--component-radius); transition: color var(--motion-transition); }
a[data-mw-sri-chev]:hover { color: var(--text-positive-primary); }
a[data-mw-sri-chev]:focus-visible { outline: var(--focus-outline); outline-offset: 2px; }
@media (max-width: 767px) { /* --mw-bp-tablet */
  [data-mw-sri-row] {
    grid-template-columns: 1rem minmax(0, 1fr) auto auto 1.25rem;
    column-gap: var(--space-xs); row-gap: var(--space-2xs);
    padding: 0.625rem 0; min-height: 2.75rem;
  }
  [data-mw-sri-glyph] { grid-column: 1; grid-row: 1; }
  [data-mw-sri-name] { grid-column: 2; grid-row: 1; }
  [data-mw-sri-kind] { grid-column: 3; grid-row: 1; }
  [data-mw-sri-options] { grid-column: 4; grid-row: 1; }
  [data-mw-sri-vars] { grid-column: 2 / 5; grid-row: 2; }
  [data-mw-sri-vars]:empty { display: none; }
  [data-mw-sri-sample] { display: none; }
  [data-mw-sri-chev] { grid-column: 5; grid-row: 1; }
}
`;

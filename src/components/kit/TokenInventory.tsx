"use client";

import { CSSProperties, useLayoutEffect, useMemo, useState } from "react";
import { Toolbar } from "@/components/Toolbar";
import { Search } from "@/components/Search";
import { Heading } from "@/components/Heading";
import { Badge } from "@/components/Badge";

/* ============================================================
   TokenInventory — the exhaustive, code-truthful token reference
   the fork /style-guide ships below its curated brand sheet. Every
   token the site actually defines (the system set from tokens.css
   PLUS the fork's brand-local additions from brand.css) is listed,
   with its LIGHT and DARK resolved value side by side, so nothing
   a fork puts in code stays hidden.

   ORGANIZATION (the 2026-07-22 redesign; before this the list ran in
   raw source order — a 121-token raw run on top, a 57-token "Other"
   catch-all, no search): groups MIRROR tokens.css's own layers, read
   semantic-first — the working vocabulary (inks, grounds, status,
   type, space...) up front, the master-control dials after it, the
   raw ramps LAST (one subgroup per hue, light to dark), and an
   honest Internal group for the plumbing. Within a group, tokens
   sort by SCALE (ramp step, size rung, weight ladder), never by
   accident of declaration order. Every group heading carries an
   sg-inv-* anchor id, and a client-side filter narrows the list by
   name or value. ALL tokens always appear somewhere: the last group
   is a catch-all, so a new tokens.css section can never silently
   vanish from the inventory.

   Dual-theme resolution: custom-property getPropertyValue returns the
   DECLARED value (var(...), color-mix(...)), not the resolved one, and
   the resolved value depends on the <html data-theme> in force. So on
   mount this measures both themes once: it paints each token onto an
   offscreen probe, momentarily flips documentElement's data-theme to
   light then dark reading the probe's resolved backgroundColor each
   time, then restores the original theme. The flips happen inside a
   layout effect with no yield between them, so the page never paints an
   intermediate state (no flash). Colors resolve to a swatch; anything
   that is not a color (a length, a duration, an easing) shows its
   declared value in a quieter secondary treatment, still truthful to
   the code.

   SYNC UNIT: no HQ-only imports, self-contained styles, identical in
   every fork. Public contract: the component name and the
   { names, brandLocal } props StyleGuidePage passes.
   ============================================================ */

interface Reading {
  declared: string;
  color: string | null;
  /** Set when the token resolves to nothing at :root and was read inside the accent band
      instead (the three --accent-band-* tokens are BAND-LEVEL, declared under
      [data-section-bg="accent"] only; v6.36.0, the reference boards' dash). */
  scope?: string;
}
interface Measured {
  light: Record<string, Reading>;
  dark: Record<string, Reading>;
}

// Compact hex for opaque colors, hex + alpha percent for alpha, else the raw
// resolved string (exotic color spaces fall through untouched).
function toDisplay(resolved: string): string {
  const rgb = resolved.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/);
  const col = resolved.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/);
  const m = rgb ?? col;
  if (!m) return resolved;
  const scale = col ? 255 : 1;
  const to2 = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  const hex = "#" + [m[1], m[2], m[3]].map((c) => to2(Number(c) * scale)).join("").toUpperCase();
  if (m[4] != null && m[4] !== "1" && m[4] !== "100%") {
    const a = m[4].endsWith("%") ? m[4] : Math.round(Number(m[4]) * 100) + "%";
    return `${hex} ${a}`;
  }
  return hex;
}

/* ---------- taxonomy ---------- */

// The semantic-first group order, each group a name test matched top-down
// (first match wins). Mirrors tokens.css's layers: LAYER 2 vocabulary first,
// the master dials, then LAYER 1 raws; raw ramps expand into one subgroup per
// hue below. The final test is a catch-all by design — the honest home for
// plumbing and for anything a future tokens.css section adds, so the
// inventory can never silently drop a token.
const GROUP_DEFS: { name: string; test: (n: string) => boolean }[] = [
  { name: "Brand and accent", test: (n) => n.startsWith("--accent-") || n === "--nav-link-hover" },
  { name: "Surfaces and grounds", test: (n) => n.startsWith("--background-") },
  { name: "Text inks", test: (n) => n.startsWith("--text-") },
  {
    name: "Borders and focus",
    test: (n) => n.startsWith("--border-") || n.startsWith("--focus-") || n.startsWith("--shadow-focus"),
  },
  {
    // The status hue anchors (--green-base and kin) live here with the badge
    // and destructive-menu inks they anchor — the near-duplicate families the
    // token audit compares side by side.
    name: "Status and badges",
    test: (n) =>
      n.startsWith("--status-") ||
      n.startsWith("--badge-") ||
      n.startsWith("--menu-item-destructive-") ||
      ["--green-base", "--yellow-base", "--red-base", "--cyan-base"].includes(n),
  },
  {
    name: "Data and charts",
    test: (n) =>
      n.startsWith("--chart-") || n.startsWith("--category-") || n.startsWith("--heat-") || n.startsWith("--mw-temp-"),
  },
  {
    name: "Scrims and overlays",
    test: (n) => n.startsWith("--scrim") || n.startsWith("--modal-scrim") || n.startsWith("--media-") || n === "--overlay-blur" || n === "--scrim-drawer",
  },
  {
    // --type-scale-ratio is excluded: it is the master dial the whole scale
    // rides, so it lists with the other dials, not the rungs it drives.
    name: "Type",
    test: (n) =>
      n.startsWith("--font-") ||
      (n.startsWith("--type-") && n !== "--type-scale-ratio") ||
      n.startsWith("--weight-") ||
      (n.startsWith("--leading-") && n !== "--leading-multiplier") ||
      n.startsWith("--tracking-") ||
      n === "--label-tracking",
  },
  {
    name: "Spacing",
    test: (n) => n.startsWith("--space-") || n.startsWith("--flow-") || n.startsWith("--section-pad-"),
  },
  {
    name: "Radius and elevation",
    test: (n) => n.startsWith("--radius-") || n === "--shadow-subtle" || n === "--shadow-raised",
  },
  {
    // The three -radius caps are master dials (tokens.css declares them in the
    // dials layer), so they pass through to that group below.
    name: "Controls",
    test: (n) => n.startsWith("--control-") && !n.endsWith("-radius"),
  },
  { name: "Motion", test: (n) => n === "--motion-transition" },
  { name: "Breakpoints and z", test: (n) => n.startsWith("--mw-bp-") || n.startsWith("--z-") },
  {
    // Component-scoped families, clustered per family by the stem sort below:
    // step-dot, modal, drawer, rail, popover, card, radio, switch, avatar,
    // paper, chrome, frame, containers.
    name: "Component-scoped",
    test: (n) =>
      n.startsWith("--step-dot-") ||
      n.startsWith("--paper-") ||
      n.startsWith("--avatar-") ||
      n.startsWith("--radio-") ||
      n.startsWith("--switch-") ||
      n.startsWith("--modal-") ||
      n.startsWith("--drawer-") ||
      n.startsWith("--rail-") ||
      n.startsWith("--container-") ||
      n === "--chrome-bar-height" ||
      n === "--popover-max-height" ||
      n === "--card-padding" ||
      n === "--frame-weight",
  },
  {
    // The master-control layer: multipliers, ratios, and the motion/radius
    // dials the /kit master controls drive (tokens.css LAYER 2 defaults).
    name: "Master control dials",
    test: (n) =>
      n.endsWith("-multiplier") ||
      n === "--type-scale-ratio" ||
      n.startsWith("--motion-") ||
      n === "--component-radius" ||
      n === "--control-mark-radius" ||
      n === "--control-pill-radius" ||
      n === "--control-glyph-radius" ||
      n === "--mw-scroll-lerp" ||
      n === "--mw-accent-rule-inset",
  },
  // Raw ramps are expanded per hue at build (see groupTokens); this entry
  // catches them for membership, the subgrouping happens below.
  { name: "RAW_RAMPS", test: (n) => /^--raw-[a-z-]+-(base$|lighten-|darken-)/.test(n) || /^--raw-category-\d+$/.test(n) },
  { name: "Raw primitives", test: (n) => n.startsWith("--raw-") },
  { name: "Internal and plumbing", test: () => true },
];

// Scale ladders. Within one stem cluster the suffixes are ranked by the first
// ladder that knows ALL of them, so "normal" can sit third in the leading
// ladder and second in the register ladder without the two colliding.
const LADDERS: string[][] = [
  ["base", "3xs", "2xs", "xs", "sm", "md", "md-plus", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "touch", "full"],
  ["light", "regular", "medium", "semibold", "bold"],
  ["tight", "snug", "normal", "relaxed"],
  ["tight", "snug", "wide", "wider", "widest"],
  ["still", "gentle", "sharp"],
  ["compact", "normal", "dramatic"],
  ["composed", "stately", "dramatic"],
];

// Split a token into stem + step: the ramp step (lighten-40), a trailing
// number (chart-red-2, heat-3, z ladder), or a ladder word (md-plus, bold).
function splitToken(n: string): { stem: string; step: string | null; rampRank: number | null; num: number | null } {
  const ramp = n.match(/^(.*)-(lighten|darken)-(\d+)$/);
  if (ramp) return { stem: ramp[1], step: ramp[2] + "-" + ramp[3], rampRank: (ramp[2] === "lighten" ? -1 : 1) * Number(ramp[3]), num: null };
  if (/-base$/.test(n) && GROUP_DEFS[GROUP_DEFS.length - 3].test(n)) {
    return { stem: n.replace(/-base$/, ""), step: "base", rampRank: 0, num: null };
  }
  const tint = n.match(/^(.*-\d+)-tint$/);
  if (tint) {
    const base = splitToken(tint[1]);
    return { stem: base.stem, step: base.step + "-tint", rampRank: null, num: base.num == null ? null : base.num + 0.5 };
  }
  const num = n.match(/^(.*)-(\d+)$/);
  if (num) return { stem: num[1], step: num[2], rampRank: null, num: Number(num[2]) };
  const word = n.match(/^(.*)-(base|3xs|2xs|xs|sm|md-plus|md|lg|xl|2xl|3xl|4xl|5xl|6xl|touch|full|light|regular|medium|semibold|bold|tight|snug|normal|relaxed|wide|wider|widest|still|gentle|sharp|compact|dramatic|composed|stately)$/);
  if (word) return { stem: word[1], step: word[2], rampRank: null, num: null };
  return { stem: n, step: null, rampRank: null, num: null };
}

// Order a group's tokens: stem clusters keep their first-appearance (source)
// order; inside a cluster, ramp steps run light -> dark, numbers ascend, and
// ladder words rank by the first ladder that knows every word in the cluster.
function orderTokens(tokens: string[]): string[] {
  const clusters = new Map<string, string[]>();
  for (const n of tokens) {
    const { stem } = splitToken(n);
    if (!clusters.has(stem)) clusters.set(stem, []);
    clusters.get(stem)!.push(n);
  }
  const out: string[] = [];
  for (const [, members] of clusters) {
    if (members.length === 1) {
      out.push(members[0]);
      continue;
    }
    const parts = members.map((n) => ({ n, p: splitToken(n) }));
    const words = parts.map(({ p }) => p.step).filter((s): s is string => s !== null && !/\d/.test(s));
    const ladder = LADDERS.find((l) => words.length > 0 && words.every((w) => l.includes(w)));
    const rank = ({ p }: { p: ReturnType<typeof splitToken> }, idx: number): number => {
      if (p.rampRank !== null) return p.rampRank;
      if (p.num !== null) return p.num;
      if (ladder && p.step !== null) {
        const i = ladder.indexOf(p.step);
        if (i >= 0) return i;
      }
      return 1000 + idx;
    };
    out.push(
      ...parts
        .map((x, idx) => ({ ...x, r: rank(x, idx) }))
        .sort((a, b) => a.r - b.r)
        .map((x) => x.n),
    );
  }
  return out;
}

// A raw ramp hue's display name: --raw-spring-green-... -> "spring green".
function rampHue(n: string): string {
  const m = n.match(/^--raw-([a-z-]+?)-(?:base$|lighten-|darken-)/) ?? n.match(/^--raw-(category)-\d+$/);
  return m ? m[1].replace(/-/g, " ") : "ramp";
}

const slugOf = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

interface TokenGroup {
  name: string;
  slug: string;
  tokens: string[];
}

// Bucket every name into the taxonomy, expand the raw ramps into one subgroup
// per hue (source order of first appearance), and scale-order each group. The
// union always equals the input: the last GROUP_DEF matches everything.
function groupTokens(names: string[]): TokenGroup[] {
  const buckets = new Map<string, string[]>();
  for (const n of names) {
    const def = GROUP_DEFS.find((g) => g.test(n))!;
    const key = def.name === "RAW_RAMPS" ? "Raw ramp · " + rampHue(n) : def.name;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(n);
  }
  const ordered: string[] = [];
  for (const def of GROUP_DEFS) {
    if (def.name === "RAW_RAMPS") {
      for (const key of buckets.keys()) if (key.startsWith("Raw ramp · ") && !ordered.includes(key)) ordered.push(key);
    } else if (buckets.has(def.name)) {
      ordered.push(def.name);
    }
  }
  return ordered.map((name) => ({ name, slug: "sg-inv-" + slugOf(name), tokens: orderTokens(buckets.get(name)!) }));
}

export function TokenInventory({ names, brandLocal = [], register = "bordered" }: { names: string[]; brandLocal?: string[]; register?: "bordered" | "surface" }) {
  const [data, setData] = useState<Measured | null>(null);
  const [query, setQuery] = useState("");
  const brandSet = useMemo(() => new Set(brandLocal), [brandLocal]);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute("data-theme");
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:0;height:0";
    document.body.appendChild(probe);
    // The band probe: a token declared only inside the accent band ([data-section-bg="accent"])
    // resolves to nothing at :root, and the sheet showed a dash for it. Read again inside the
    // band's scope and say so, rather than print an empty cell for a token that is real.
    const band = document.createElement("div");
    band.setAttribute("data-section-bg", "accent");
    band.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:0;height:0";
    const bandProbe = document.createElement("div");
    band.appendChild(bandProbe);
    document.body.appendChild(band);

    const isColor = (bg: string) => !!bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
    const read = (theme: string) => {
      html.setAttribute("data-theme", theme);
      const cs = getComputedStyle(html);
      const out: Record<string, Reading> = {};
      for (const n of names) {
        const declared = cs.getPropertyValue(n).trim();
        probe.style.backgroundColor = "";
        probe.style.backgroundColor = `var(${n})`;
        const bg = getComputedStyle(probe).backgroundColor;
        // The band-probe fallback is HQ-surface-only: the bordered/default register (every fork's
        // public /style-guide) must keep printing a dash for a band-only token, exactly as before
        // this probe existed, so the sync unit's default render never changes for existing forks.
        if (register === "surface" && !declared && !isColor(bg)) {
          const bandDeclared = getComputedStyle(band).getPropertyValue(n).trim();
          bandProbe.style.backgroundColor = "";
          bandProbe.style.backgroundColor = `var(${n})`;
          const bandBg = getComputedStyle(bandProbe).backgroundColor;
          if (bandDeclared || isColor(bandBg)) {
            out[n] = { declared: bandDeclared, color: isColor(bandBg) ? bandBg : null, scope: "accent band" };
            continue;
          }
        }
        out[n] = { declared, color: isColor(bg) ? bg : null };
      }
      return out;
    };

    const light = read("light");
    const dark = read("dark");
    if (prev === null) html.removeAttribute("data-theme");
    else html.setAttribute("data-theme", prev);
    probe.remove();
    band.remove();
    // The documented measure-in-layout-effect pattern: the values only exist after
    // mount (they are read from computed styles), so this one-shot state set is the
    // point of the effect, not a cascade. deps are the token list, so it runs once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData({ light, dark });
  }, [names, register]);

  const grouped = useMemo(() => groupTokens(names), [names]);

  // The contains-filter over name + both themes' values. Name-only until the
  // probe has measured (data arrives one layout tick after mount).
  const q = query.trim().toLowerCase();
  const matches = (n: string): boolean => {
    if (!q) return true;
    if (n.toLowerCase().includes(q)) return true;
    if (!data) return false;
    const l = data.light[n];
    const d = data.dark[n];
    return [l?.declared, l?.color, d?.declared, d?.color].some((v) => v != null && v.toLowerCase().includes(q));
  };
  const visible = grouped
    .map((g) => ({ ...g, tokens: g.tokens.filter(matches) }))
    .filter((g) => g.tokens.length > 0);
  const shown = visible.reduce((s, g) => s + g.tokens.length, 0);

  const surface = register === "surface";
  const total = q ? `${shown} of ${names.length} tokens` : `${names.length} tokens`;
  return (
    <div data-mw-token-inventory="" data-register={register}>
      <style href="magentaweb-token-inventory" precedence="default">{inventoryCss}</style>
      {surface ? (
        // The surface register (v6.36.0, the reference boards): the Toolbar with a Search on the
        // sm rung and the live count under it, as every HQ list draws its controls.
        <Toolbar
          ariaLabel="Token filters"
          filters={
            <span data-mw-tokinv-search="">
              <Search id="tokinv-q" label="Filter tokens" labelHidden size="sm" placeholder="Filter by name or value" value={query} onChange={setQuery} />
            </span>
          }
          count={total}
        />
      ) : (
        <div data-mw-tokinv-toolbar="">
          <input
            data-mw-tokinv-filter=""
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name or value…"
            aria-label="Filter tokens by name or value"
          />
          <span data-mw-tokinv-total="" aria-live="polite">{total}</span>
        </div>
      )}
      {visible.map((group) => (
        <section key={group.slug} id={group.slug} data-mw-tokinv-group="">
          <div data-mw-tokinv-grouphead="">
            {surface ? (
              // A sans group head with the solid count chip, on the panel ground, no rule under it.
              <>
                <Heading level={3} size={6}>{group.name}</Heading>
                <Badge tone="neutral" emphasis="solid">{String(group.tokens.length)}</Badge>
              </>
            ) : (
              <>
                <span data-mw-tokinv-groupname="">{group.name}</span>
                <span data-mw-tokinv-groupcount="">{group.tokens.length}</span>
              </>
            )}
          </div>
          <div data-mw-tokinv-rows="">
            {group.tokens.map((n) => {
              const l = data?.light[n];
              const d = data?.dark[n];
              return (
                <div key={n} data-mw-tokinv-row="">
                  <span data-mw-tokinv-name="">
                    {n}
                    {brandSet.has(n) ? <span data-mw-tokinv-brandtag="">brand</span> : null}
                  </span>
                  <span data-mw-tokinv-cell="" data-theme="light" title={l?.scope ? `Resolves inside the ${l.scope}` : undefined}>
                    {l?.color ? <span data-mw-tokinv-swatch="" style={{ background: l.color } as CSSProperties} /> : null}
                    <span data-mw-tokinv-val="" data-declared={l && !l.color ? "true" : undefined}>
                      {l ? (l.color ? toDisplay(l.color) : l.declared || "—") : ""}
                      {l?.scope ? <span data-mw-tokinv-scope="">band</span> : null}
                    </span>
                  </span>
                  <span data-mw-tokinv-cell="" data-theme="dark" title={d?.scope ? `Resolves inside the ${d.scope}` : undefined}>
                    {d?.color ? <span data-mw-tokinv-swatch="" style={{ background: d.color } as CSSProperties} /> : null}
                    <span data-mw-tokinv-val="" data-declared={d && !d.color ? "true" : undefined}>
                      {d ? (d.color ? toDisplay(d.color) : d.declared || "—") : ""}
                      {d?.scope ? <span data-mw-tokinv-scope="">band</span> : null}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {visible.length === 0 ? (
        <p data-mw-tokinv-empty="">No token matches &ldquo;{query}&rdquo;.</p>
      ) : null}
    </div>
  );
}

// The two theme cells carry their own literal ground so a light value reads on a
// light card and a dark value on a dark card, regardless of the page's live theme.
// Theme-constant raws are the sanctioned choice here: the point is to show both
// themes at once, so these two cells must not follow the dial.
const inventoryCss = `
[data-mw-token-inventory] { display: flex; flex-direction: column; gap: var(--space-xl); }
[data-mw-tokinv-toolbar] {
  display: flex; align-items: center; gap: var(--space-sm);
}
[data-mw-tokinv-filter] {
  flex: 1 1 auto; min-width: 0; max-width: 24rem;
  font-family: var(--font-code); font-size: var(--type-xs);
  color: var(--text-positive-primary); background: var(--background-positive-primary);
  border: 1px solid var(--border-positive-primary); border-radius: var(--component-radius);
  padding: var(--space-2xs) var(--space-xs);
}
[data-mw-tokinv-filter]:focus-visible { outline: var(--focus-outline); outline-offset: 2px; }
[data-mw-tokinv-filter]::placeholder { color: var(--text-positive-tertiary); }
[data-mw-tokinv-total] {
  font-family: var(--font-code); font-size: var(--type-2xs);
  color: var(--text-positive-tertiary); flex: 0 0 auto;
}
[data-mw-tokinv-grouphead] {
  display: flex; align-items: baseline; gap: var(--space-sm);
  padding-bottom: var(--space-2xs); margin-bottom: var(--space-sm);
  border-bottom: 1px solid var(--border-positive-primary);
  /* Anchor jumps clear the sticky chrome, same rule as Panel's id anchors. */
  scroll-margin-top: calc(var(--chrome-bar-height) + var(--space-md));
}
[data-mw-tokinv-groupname] {
  font-family: var(--font-code); font-size: var(--type-sm);
  letter-spacing: var(--tracking-wide); color: var(--text-positive-primary);
}
[data-mw-tokinv-groupcount] {
  font-family: var(--font-code); font-size: var(--type-2xs);
  color: var(--text-positive-tertiary);
}
[data-mw-tokinv-rows] { display: flex; flex-direction: column; }
[data-mw-tokinv-row] {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr);
  align-items: center; gap: var(--space-sm);
  padding: var(--space-2xs) 0;
  border-bottom: 1px solid var(--border-positive-secondary);
}
[data-mw-tokinv-name] {
  font-family: var(--font-code); font-size: var(--type-xs);
  color: var(--text-positive-secondary);
  overflow-wrap: anywhere; display: flex; align-items: center; gap: var(--space-2xs);
}
[data-mw-tokinv-brandtag] {
  font-size: var(--type-2xs); letter-spacing: var(--tracking-wide);
  color: var(--accent-emphasis); border: 1px solid var(--accent-emphasis);
  border-radius: var(--component-radius); padding: 0 var(--space-2xs); flex: 0 0 auto;
}
[data-mw-tokinv-cell] {
  display: flex; align-items: center; gap: var(--space-2xs); min-width: 0;
  padding: var(--space-2xs) var(--space-xs); border-radius: var(--component-radius);
}
/* Both cells render at once, one light and one dark, so their grounds and inks are pinned to
   raw neutrals. The pair's job is to show what a token resolves to in EACH theme, so following
   the live theme would paint both cells the same ground and the comparison would say nothing.
   No semantic token names a ground that ignores the theme dial. This covers the six raw reads
   below, the dimmed declared step included. */
[data-mw-tokinv-cell][data-theme="light"] { background: var(--raw-neutral-lighten-95); }
[data-mw-tokinv-cell][data-theme="dark"] { background: var(--raw-neutral-darken-90); }
[data-mw-tokinv-cell][data-theme="light"] [data-mw-tokinv-val] { color: var(--raw-neutral-darken-75); }
[data-mw-tokinv-cell][data-theme="dark"] [data-mw-tokinv-val] { color: var(--raw-neutral-lighten-85); }
/* A declared (non-color) chain reads a step quieter than a resolved swatch
   value: still the exact code truth, dimmed so the color rows lead. */
[data-mw-tokinv-cell][data-theme="light"] [data-mw-tokinv-val][data-declared] { color: var(--raw-neutral-darken-30); }
[data-mw-tokinv-cell][data-theme="dark"] [data-mw-tokinv-val][data-declared] { color: var(--raw-neutral-lighten-40); }
[data-mw-tokinv-swatch] {
  width: 1rem; height: 1rem; flex: 0 0 auto;
  /* The capped mark radius (owner, 15 Jul): this chip used a hardcoded 2px "on
     purpose", which meant it IGNORED the radius dial while TokenRow's swatches
     one panel up reacted, and the style guide read as inconsistent with itself.
     Every small chip now rides --control-mark-radius: dial-reactive (0 sharp,
     4px soft and pronounced), capped so a 1rem chip can never round into a dot. */
  border-radius: var(--control-mark-radius);
  /* Theme-NEUTRAL on purpose, and no token can be (C-12, 22 Aug 2026): this ring delineates a
     swatch of ANY colour, white through black, from the panel behind it. Every semantic border
     token is an alpha wash of the theme's INK, so it would vanish on the swatch that matches
     the ink and shout on the one that matches the ground. A mid-grey at partial alpha reads on
     both extremes in both themes. Same shape as the A-095 proof-pair sanction: the requirement
     is stated here, at the site, rather than borrowed from a carve-out that does not cover it. */
  box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.35);
}
[data-mw-tokinv-val] {
  font-family: var(--font-code); font-size: var(--type-2xs);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
[data-mw-tokinv-empty] {
  font-family: var(--font-code); font-size: var(--type-xs);
  color: var(--text-positive-tertiary);
}
/* A band-scoped reading carries a small tag inside its value, so it inherits the value's ink
   (the cell's pinned neutral) without a raw read of its own: the value is real, and it is the band's. */
[data-mw-tokinv-scope] {
  font-size: var(--type-2xs); letter-spacing: var(--tracking-wide);
  margin-left: var(--space-xs); opacity: 0.7;
}
/* The surface register (v6.36.0, the reference boards): the Toolbar's search at 20rem, sans group
   heads with the count chip and NO rule under them, the name and two theme cells at 1fr · 16.25rem ·
   16.25rem, and the hairline BETWEEN rows only (the first row of a group draws none). */
[data-mw-tokinv-search] { display: inline-flex; width: 20rem; max-width: 100%; }
[data-mw-token-inventory][data-register="surface"] [data-mw-tokinv-grouphead] {
  gap: var(--space-xs); align-items: center; padding-bottom: 0; margin-bottom: var(--space-sm);
  border-bottom: 0; min-height: var(--control-size-xs);
}
[data-mw-token-inventory][data-register="surface"] [data-mw-tokinv-row] {
  grid-template-columns: minmax(0, 1fr) 16.25rem 16.25rem;
  padding: var(--space-2xs) 0; min-height: 2.25rem;
  border-bottom: 0; border-top: 1px solid var(--border-positive-primary);
}
[data-mw-token-inventory][data-register="surface"] [data-mw-tokinv-row]:first-child { border-top: 0; }
[data-mw-token-inventory][data-register="surface"] [data-mw-tokinv-name] { color: var(--text-positive-primary); }
[data-mw-token-inventory][data-register="surface"] [data-mw-tokinv-cell] { height: 1.625rem; padding: 0 var(--space-xs); }
/* The light cell's ring is a literal for the same reason its ground is a raw neutral: the cell
   ignores the theme dial by design, and no semantic border token may be read on it. */
[data-mw-token-inventory][data-register="surface"] [data-mw-tokinv-cell][data-theme="light"] { box-shadow: inset 0 0 0 1px rgba(9, 11, 13, 0.08); }
[data-mw-token-inventory][data-register="surface"] [data-mw-tokinv-swatch] { width: 0.75rem; height: 0.75rem; }
@media (max-width: 767px) { /* --mw-bp-tablet */
  [data-mw-tokinv-row] { grid-template-columns: 1fr; gap: var(--space-2xs); }
  [data-mw-token-inventory][data-register="surface"] [data-mw-tokinv-row] { grid-template-columns: 1fr 1fr; row-gap: var(--space-2xs); padding: var(--space-xs) 0; }
  [data-mw-token-inventory][data-register="surface"] [data-mw-tokinv-name] { grid-column: 1 / -1; }
}
`;

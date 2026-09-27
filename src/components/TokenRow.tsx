"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";

/* ============================================================
   TokenRow — the standard swatch · name · hex row for documenting a color
   token (owner, 7 Jul: the HQ design-system layout promoted to the system).
   One primitive for every surface: the mother's foundations, the HQ
   inventory, and each fork's style guide render the identical row, so the
   three can never drift apart in presentation.

   The swatch chip fills from var(token); the hex is RESOLVED AT RUNTIME from
   the live computed style (never hand-authored, so it cannot drift from
   tokens.css) and re-resolves when the theme flips (data-theme mutation or a
   prefers-color-scheme change under auto). Clicking the row copies the token
   name, the same affordance TokenSwatch established. Client component: it
   reads getComputedStyle and owns the copied flash.

   The button's accessible name is pinned with aria-label ("Copy <label>",
   or "Copy <token>" when no label is given, so the visible text is always
   part of the name, 2.5.3): the hex arrives from an effect after hydration
   and the copied flash swaps the value text, and a name computed from
   contents mutated on both (pass 3, 4.1.3). The title keeps "Copy <token>"
   as the description, so the token name still reaches AT when a label is
   shown. The value cell is plain text, not a live region, so forty rows on a
   style guide resolve their hex in silence. A spoken "copied" confirmation
   would need a region OUTSIDE the button, and the button is the root, so
   that is deferred (REFACTOR_QUEUE) rather than bolted on as a wrapper
   every style guide would have to lay out.

   v1 scope: color tokens (swatch + hex). Non-color tokens have their own
   treatments (TokenMetadata, TokenScale).
   ============================================================ */

export interface TokenRowProps {
  /** The custom property, e.g. "--background-positive-primary". */
  token: string;
  /** Optional display label; defaults to the token name. */
  label?: string;
  /** The look (v6.36.0, the reference-surface boards). "bordered" (default): the sites' row, the
      sm rung, a measure cap, hover fill inset by the row padding. "surface": the HQ style guide's
      row on a data surface: the xs rung, full width, a 1rem swatch, and the hairline BETWEEN rows
      only (the first row draws none), never under a head. */
  register?: "bordered" | "surface";
}

// "rgb(247, 248, 249)" / "rgba(247, 248, 249, 0.08)" -> "#F7F8F9" (+ " 8%" alpha suffix).
// Chromium serializes alpha color-mix() computed values as "color(srgb R G B / A)" with
// 0-1 float channels (e.g. "color(srgb 0.03 0.04 0.05 / 0.08)"), so that form maps
// through the same hex + suffix path. Anything else (exotic color spaces) keeps the
// raw string.
function rgbToHex(rgb: string): string {
  const m =
    rgb.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)/) ??
    rgb.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/);
  if (!m) return rgb;
  const srgbFloats = m[0].startsWith("color(");
  const hex = [m[1], m[2], m[3]]
    .map((c) => (srgbFloats ? Math.round(Number(c) * 255) : Number(c)).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  if (m[4] !== undefined) {
    const a = m[4].endsWith("%") ? parseFloat(m[4]) : parseFloat(m[4]) * 100;
    if (a < 100) return `#${hex} ${Math.round(a)}%`;
  }
  return `#${hex}`;
}

export function TokenRow({ token, label, register = "bordered" }: TokenRowProps) {
  const probeRef = useRef<HTMLSpanElement>(null);
  const [hex, setHex] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = probeRef.current;
    if (!el) return;
    const compute = () => {
      const raw = getComputedStyle(el).backgroundColor;
      let out = rgbToHex(raw);
      if (out === raw) {
        // AUD-11 (1 Sep 2026): a color-mix authored in oklab/oklch computes in its
        // authoring space and serialises as oklab()/oklch(), which the parser above
        // walks past — the seven --category-N-tint rows rendered raw float strings
        // under an intro promising a hex. Force an sRGB serialisation through a real
        // color property (the probes' own wrapper trick) and re-parse.
        el.style.color = `color-mix(in srgb, ${raw} 100%, transparent)`;
        out = rgbToHex(getComputedStyle(el).color);
        el.style.color = "";
      }
      setHex(out);
    };
    compute();
    // Re-resolve when a colour-bearing dial flips: theme, and the neutral ramp
    // (AUD-11: the hex cell sat stale beside a live swatch under data-neutral,
    // on every style guide in the fleet), and on scheme change under auto.
    const mo = new MutationObserver(compute);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-neutral"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", compute);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", compute);
    };
  }, [token]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const copy = () => {
    navigator.clipboard?.writeText(token).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <button type="button" data-mw-tokenrow="" data-register={register} onClick={copy} aria-label={`Copy ${label ?? token}`} title={`Copy ${token}`}>
      <style href="magentaweb-tokenrow" precedence="default">{css}</style>
      <span data-mw-tokenrow-lead="">
        <span ref={probeRef} data-mw-tokenrow-swatch="" style={{ background: `var(${token})` } as CSSProperties} aria-hidden="true" />
        <span data-mw-tokenrow-name="">{label ?? token}</span>
      </span>
      <span data-mw-tokenrow-value="">{copied ? "copied" : hex}</span>
    </button>
  );
}

const css = `
[data-mw-tokenrow] {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  width: 100%;
  /* AUD-4 (4 Sep 2026): with no cap the row filled the whole grid cell and
     space-between stranded the hex hundreds of px from the token name on a
     wide page. --measure-narrow is the closest existing ch measure (no
     narrower token exists in tokens.css, which this file may not edit): it
     keeps name and value read as one row on a wide viewport while never
     constraining anything below it at 390. */
  max-width: var(--measure-narrow);
  padding: var(--space-xs) var(--space-sm);
  background: none;
  border: 0;
  border-radius: var(--component-radius);
  cursor: pointer;
  text-align: left;
  transition: background var(--motion-transition);
}
/* The hairline between rows is a DIVIDER, not part of the frame (owner, 15 Jul).
   It was border-top on this same rounded button, so at the soft and pronounced
   dials the line's ENDS curved down with the corners: a divider reacting to a
   corner dial, which a line must never do. As an absolutely positioned child it
   ignores the parent's border-radius (nothing clips it), so it stays dead
   straight at every dial while the hover fill below it still rounds. */
[data-mw-tokenrow]::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border-positive-secondary);
}
[data-mw-tokenrow]:hover {
  background: var(--background-positive-secondary);
}
[data-mw-tokenrow]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: -2px;
}
[data-mw-tokenrow-lead] {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}
[data-mw-tokenrow-swatch] {
  flex-shrink: 0;
  width: var(--control-mark);
  height: var(--control-mark);
  /* The capped mark radius, not the raw dial: on a --control-mark chip the raw
     dial rounds into a circle at soft/pronounced (the Checkbox-vs-Radio lesson,
     v3.17.0). The cap keeps the chip reacting to the dial without ever reading
     as a colour DOT instead of a colour SWATCH. */
  border-radius: var(--control-mark-radius);
  /* The inset hairline keeps a near-surface chip visible on its own surface. */
  box-shadow: inset 0 0 0 1px var(--border-positive-secondary);
}
[data-mw-tokenrow-name] {
  font-family: var(--font-code);
  font-size: var(--type-sm);
  color: var(--text-positive-primary);
  letter-spacing: var(--tracking-wide);
  overflow-wrap: anywhere;
}
[data-mw-tokenrow-value] {
  font-family: var(--font-code);
  font-size: var(--type-sm);
  color: var(--text-positive-secondary);
  white-space: nowrap;
  /* Shrink guard: a value the hex parser passes through raw can run long, and
     nowrap alone would widen the page. The cell shrinks and ellipsizes instead. */
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* The surface register (v6.36.0): the row as the HQ style guide draws it on a data surface.
   Full width at the xs rung, no inline padding (the hover wash runs edge to edge like the
   hairline), the 1rem swatch, and the divider between rows only: the first row draws none. */
[data-mw-tokenrow][data-register="surface"] {
  max-width: none;
  padding: var(--space-xs) 0;
  min-height: 2.375rem;
}
[data-mw-tokenrow][data-register="surface"]::before { background: var(--border-positive-primary); }
[data-mw-tokenrow][data-register="surface"]:first-child::before { display: none; }
[data-mw-tokenrow][data-register="surface"]:hover { background: var(--background-hover-wash); }
[data-mw-tokenrow][data-register="surface"] [data-mw-tokenrow-name] { font-size: var(--type-xs); letter-spacing: normal; }
[data-mw-tokenrow][data-register="surface"] [data-mw-tokenrow-value] { font-size: var(--type-xs); }
[data-mw-tokenrow][data-register="surface"] [data-mw-tokenrow-swatch] {
  width: 1rem;
  height: 1rem;
  box-shadow: inset 0 0 0 1px var(--border-positive-primary);
}
`;

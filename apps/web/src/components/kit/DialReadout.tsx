"use client";

import { CSSProperties, useEffect, useState } from "react";
import { DataLabel } from "@/components/DataLabel";

/* ============================================================
   DialReadout — which master dials this document is actually running.

   StyleGuidePage's contract, stated at the top of that file, is INVENTORY not
   documentation: what the brand resolves to right now, in this theme, on this
   fork. The teaching surface is the mother's /foundations. So this reads the
   dials off <html> rather than describing them, and the fork's own sheet is
   then the answer to "what is this brand set to", which no ledger can be stale
   about.

   IT EXISTS BECAUSE OF THE NEUTRAL DIAL (v6.2.0). The other five have always
   been visible in their effects: a reader can SEE the radius and the type
   ratio. Neutral moves the grey ramp by hue and chroma while holding every
   rung's lightness, which is exactly the change a reader cannot name by looking
   at one page, and four forks now set it.

   UNSET IS A REAL ANSWER, NOT A MISSING ONE. `kit` is deliberately not a
   selector in tokens.css, so a fork that has never touched the dial resolves at
   :root and gets the kit ramp byte for byte. Printing "not set" there would
   read as a fault; it prints `kit` and says so.

   CLIENT, AND MOUNTED-GUARDED. The server cannot know these: the theme dial is
   written by the pre-paint flash guard before hydration, and MasterControls
   moves all six at runtime. Rendering a guess on the server and correcting it
   on the client is the hydration mismatch React 19 reverts silently on <html>,
   so this renders a placeholder until mounted and never claims a value it has
   not read. It also subscribes, so flipping a dial in the bar above updates the
   row rather than leaving a stale reading on screen.

   TWO REGISTERS (v6.36.0, the CD reference-surface boards). "bordered" (the
   default, the fork's sheet): six cells on the secondary ground with a
   hairline. "surface" (the HQ style guide): a three-column grid on the panel's
   own ground, no cell chrome, and under each value the dial's stops in the mono
   caption voice, so the reader sees where the setting sits on its ladder.
   ============================================================ */

const DIALS: { attr: string; label: string; fallback: string; stops: string }[] = [
  { attr: "data-spacing", label: "Spacing", fallback: "normal", stops: "compact · normal · dramatic" },
  { attr: "data-type", label: "Type", fallback: "composed", stops: "composed · stately · dramatic" },
  { attr: "data-motion", label: "Motion", fallback: "gentle", stops: "still · gentle · sharp" },
  { attr: "data-theme", label: "Theme", fallback: "auto", stops: "auto · light · dark" },
  { attr: "data-radius", label: "Radius", fallback: "sharp", stops: "sharp · soft · pronounced" },
  // The only dial whose unset state is a NAMED stop rather than a default
  // value: `kit` has no selector, so unset and `kit` are the same stylesheet.
  { attr: "data-neutral", label: "Neutral", fallback: "kit", stops: "kit · warm · cool · arctic · glacier · ember · forge" },
];

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
  gap: "var(--space-sm)",
};

const cellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  minWidth: 0,
  padding: "var(--space-sm) var(--space-md)",
  background: "var(--background-positive-secondary)",
  border: "1px solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
};

// The surface cell: the same column, no chrome, the value at the sm rung.
const surfaceCellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  minWidth: 0,
};

const valueStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-primary)",
  // Long enough to matter: "pronounced" overflows a 9rem cell at the dramatic
  // type ratio, and a dial readout that clips its own value is worse than none.
  overflowWrap: "anywhere",
};

const unsetNoteStyle: CSSProperties = {
  fontSize: "var(--type-2xs)",
  color: "var(--text-positive-tertiary)",
};

const stopsStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-tertiary)",
};

export function DialReadout({ register = "bordered" }: { register?: "bordered" | "surface" }) {
  const [values, setValues] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const el = document.documentElement;
    const read = () => {
      const next: Record<string, string> = {};
      for (const d of DIALS) next[d.attr] = el.getAttribute(d.attr) || "";
      setValues(next);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: DIALS.map((d) => d.attr) });
    return () => mo.disconnect();
  }, []);

  const surface = register === "surface";
  return (
    <div data-mw-dial-readout="" data-register={register} style={surface ? undefined : gridStyle} role="list">
      {surface ? <style href="magentaweb-dial-readout" precedence="default">{surfaceCss}</style> : null}
      {DIALS.map((d) => {
        const raw = values ? values[d.attr] : null;
        const unset = values !== null && raw === "";
        return (
          <div key={d.attr} style={surface ? surfaceCellStyle : cellStyle} role="listitem">
            <DataLabel>{d.label}</DataLabel>
            <span style={valueStyle}>{values === null ? "…" : raw || d.fallback}</span>
            {unset ? <span style={surface ? stopsStyle : unsetNoteStyle}>not set, so the default applies</span> : surface ? <span style={stopsStyle}>{d.stops}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

// The surface grid lives in the sheet so the phone rule (two columns) can win the cascade.
const surfaceCss = `
[data-mw-dial-readout][data-register="surface"] {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-lg);
}
@media (max-width: 767px) { /* --mw-bp-tablet */
  [data-mw-dial-readout][data-register="surface"] { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-md); }
}
`;

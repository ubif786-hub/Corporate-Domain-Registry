"use client";

import { CSSProperties, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { srOnly, tokenNumber } from "@/components/internal/styles";
import type { RegionCode } from "@/data/regions";
import { useRegion } from "./RegionProvider";

/* The country chip: a flag, where the visitor appears to be, the currency, and a panel that says
 * what was detected. It REPORTS; it is not a picker.
 *
 * The client asked for exactly this on 9 Sep 2026: "the flag is basically just tells you from
 * where you've logged in what's your IP address, to show legitimacy... flag isn't the toggle."
 * The reference does it as a hover card reading HOST, IP, City, State, Country. So the select came
 * out and the panel went in. The HOST row was dropped on 24 Sep 2026 (owner: not needed, too long);
 * the panel reads IP, City, Region, Country.
 *
 * HOVER ALONE WOULD NOT DO. The reference opens this on hover only, which is unreachable by
 * keyboard and unusable on a phone, where there is no hover at all. Here it is a real button:
 * hover opens it for a mouse, click or Enter opens it for everyone else, Escape and blur close it.
 * Same affordance, reachable by all three input methods.
 *
 * THE CURRENCY IS NOW REGIONAL, so saying it out loud matters more, not less. Canada sees CAD,
 * everywhere else USD, converted from a stated rate rather than relabelled (src/data/regions.ts).
 * The reference gets this wrong in a way worth not copying: its cart chip says USD on one page and
 * CAD on the next for the same number.
 *
 * NOTHING IS STORED. The panel shows the visitor their own data, handed back to the browser that
 * sent it, and the site keeps none of it: no logging, no analytics, no cache.
 */

const wrapStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2xs)",
  padding: "var(--space-2xs) var(--space-xs) var(--space-2xs) var(--space-sm)",
  border: "var(--rule-weight) solid var(--border-positive-primary)",
  borderRadius: "var(--component-radius)",
  minHeight: "var(--control-size-md)",
  color: "var(--text-positive-primary)",
};

// The region's name. It reads at the same weight the select did, so the chip's silhouette in the
// header row is unchanged by losing its control; only the caret and the pointer cursor go.
const labelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "inherit",
  whiteSpace: "nowrap",
};

// The location panel. Absolute under the chip, so opening it never reflows the header row.
const chipWrapStyle: CSSProperties = { position: "relative", display: "inline-flex" };
const panelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + var(--space-2xs))",
  // ANCHORED RIGHT, not left. The chip sits in the header's right-hand utility row, so a panel
  // growing rightward from its left edge runs at the viewport. Growing leftward keeps it on
  // screen at every width without a collision detector.
  right: 0,
  // --z-overlay (200) is the system's rung for "popovers + menus: dropdowns, mega menu, date
  // popovers". THE FIRST CUT WROTE --z-popover, WHICH DOES NOT EXIST. An undefined custom property
  // with no fallback makes the whole declaration invalid at computed-value time, so z-index
  // resolved to `auto`, the panel painted in normal positioned order, and the hero band below it
  // covered its lower half. It looked like a stacking-context problem in the mother and was a
  // typo in this file.
  //
  // The `|| 60` guard I wrote alongside it could never have fired: tokenNumber is a TYPE CAST,
  // not a parser, so it returns the truthy string "var(--z-popover)" and the fallback is dead
  // code. A guard that cannot run is worse than none, because it reads as protection.
  zIndex: "var(--z-overlay)",
  // SIZED BY ITS CONTENT, CAPPED AT A PHONE (24 Sep 2026). A fixed 19rem was chosen for the
  // site's hostname; the live host became www.corporatedomainregistry.com and ran 40px past the
  // panel's edge at 1440. The hostname row is gone, and the width now follows whatever the panel
  // shows (a 39 character IPv6 address is the longest value left), up to 22rem or the screen less
  // both gutters. Past that a value wraps inside the panel rather than out of it.
  width: "max-content",
  maxWidth: "min(22rem, calc(100vw - 2 * var(--space-md)))",
  padding: "var(--space-sm) var(--space-md)",
  background: "var(--background-positive-primary)",
  border: "var(--rule-weight) solid var(--border-positive-primary)",
  borderRadius: "var(--component-radius)",
  boxShadow: "var(--shadow-raised)",
  textAlign: "left",
};
const panelTitleStyle: CSSProperties = {
  margin: "0 0 var(--space-xs)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--text-positive-primary)",
};
const panelListStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  columnGap: "var(--space-md)",
  rowGap: "var(--space-3xs)",
  margin: 0,
  fontSize: "var(--type-xs)",
};
const panelKeyStyle: CSSProperties = { color: "var(--text-positive-tertiary)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)" };
// anywhere, not break-word: break-word does not shrink an item's min-content, so a grid cell holding
// one long unbroken value (an IPv6 address) kept its full width and spilled out of the panel.
const panelValStyle: CSSProperties = { margin: 0, minWidth: 0, fontFamily: "var(--font-code)", fontSize: "var(--type-2xs)", color: "var(--text-positive-primary)", overflowWrap: "anywhere" };
const panelNoteStyle: CSSProperties = { margin: "var(--space-xs) 0 0", fontSize: "var(--type-2xs)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-tertiary)" };
const triggerStyle: CSSProperties = {
  appearance: "none", background: "none", border: "none", padding: 0, margin: 0,
  display: "inline-flex", alignItems: "center", gap: "var(--space-2xs)",
  font: "inherit", color: "inherit", cursor: "pointer",
};

const currencyStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-secondary)",
  whiteSpace: "nowrap",
};

/* The two flags are drawn, not fetched. Two small inline SVGs beat two image requests, they take
   the header's own colours where it matters, and there is no 404 path: the reference site serves
   flags as PNGs. Two regions since 19 Sep 2026: Canada, and the American storefront everyone else
   is served, so the second flag is the default rather than a fallback for a missing file. */

function FlagUS({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
      <rect x="1" y="4" width="22" height="16" fill="#f5f5f5" stroke="var(--border-positive-secondary)" strokeWidth="0.5" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x="1" y={4 + i * 2.46} width="22" height="1.23" fill="#b22234" />
      ))}
      <rect x="1" y="4" width="9.5" height="8.6" fill="#3c3b6e" />
    </svg>
  );
}

function FlagCA({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
      <rect x="1" y="4" width="22" height="16" fill="#f5f5f5" stroke="var(--border-positive-secondary)" strokeWidth="0.5" />
      <rect x="1" y="4" width="5.5" height="16" fill="#d52b1e" />
      <rect x="17.5" y="4" width="5.5" height="16" fill="#d52b1e" />
      <path d="M12 7.2l1 2.1 2-.6-.7 2 1.6.9-1.9 1 .3 1.3-1.9-.4v1.9h-.8v-1.9l-1.9.4.3-1.3-1.9-1 1.6-.9-.7-2 2 .6z" fill="#d52b1e" />
    </svg>
  );
}

function RegionFlag({ code }: { code: RegionCode }) {
  return code === "CA" ? <FlagCA /> : <FlagUS />;
}

export function RegionChip() {
  const { code, region, ready, place } = useRegion();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  // "ANCHORED RIGHT KEEPS IT ON SCREEN AT EVERY WIDTH" WAS WRONG ON A PHONE (21 Sep 2026). It holds
  // while the chip sits near the right edge. At 390 the cart chip sits to its right, the flag's
  // right edge is at 187, and a 318 panel hung from it started at -130: the client saw the keys
  // column sliced off. So the panel is measured once it is open and pushed right by exactly what
  // it overhangs the gutter. Measured from the wrapper, not from the panel's own last position, so
  // a second open does not add a second shift.
  useLayoutEffect(() => {
    if (!open || !panel.current || !wrap.current) return;
    const gutter = 16;
    const left = wrap.current.getBoundingClientRect().right - panel.current.offsetWidth;
    setShift(left < gutter ? gutter - left : 0);
  }, [open]);

  // A tap outside closes it. Blur alone does not: iOS gives a button no focus on tap, so there is
  // nothing to blur, and the panel would stay up over the page until the flag was tapped again.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  return (
    <div
      ref={wrap}
      style={chipWrapStyle}
      // HOVER IS FOR A MOUSE ONLY. A finger fires the mouse events too, enter and then click, so on
      // a phone one tap opened the panel and toggled it shut in the same gesture.
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpen(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setOpen(false); }}
      // Escape closes from anywhere inside, which is what a keyboard user reaches for first.
      onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
      // Tabbing out of the chip closes it. relatedTarget is the element receiving focus; when it
      // is still inside this wrapper the panel stays up.
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      <button
        type="button"
        style={{ ...wrapStyle, ...triggerStyle, padding: "var(--space-2xs) var(--space-xs)" }}
        data-ds-region={ready ? code : ""}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ display: "inline-flex", visibility: ready ? "visible" : "hidden" }}>
          <RegionFlag code={code} />
        </span>
        {/* THE FLAG ALONE, the reference's chip (screenshot, 18 Sep 2026). The region name and the
            currency code used to sit beside it and are gone from the visible chip: the cart chip
            next to it now carries the currency, so the row states it once instead of twice.
            The accessible name keeps every word, because a lone flag announces nothing. */}
        <span style={srOnly}>
          {ready ? region.label : "Detecting your region"}. Prices are shown in {region.currency}.
          Open your location details.
        </span>
      </button>

      {open ? (
        <div id={panelId} ref={panel} style={{ ...panelStyle, transform: shift ? `translateX(${shift}px)` : undefined }} role="group" aria-label="Your location">
          <p style={panelTitleStyle}>Your location</p>
          {place ? (
            <dl style={panelListStyle}>
              <dt style={panelKeyStyle}>Your IP</dt>
              <dd style={panelValStyle}>{place.ip ?? "unknown"}</dd>
              <dt style={panelKeyStyle}>City</dt>
              <dd style={panelValStyle}>{place.city ?? "unknown"}</dd>
              <dt style={panelKeyStyle}>Region</dt>
              <dd style={panelValStyle}>{place.region ?? "unknown"}</dd>
              <dt style={panelKeyStyle}>Country</dt>
              <dd style={panelValStyle}>{place.country ?? "unknown"}</dd>
            </dl>
          ) : (
            // Null is a normal answer, not an error: off Vercel there are no edge headers, and a
            // visitor who picked a region by hand never triggered the lookup. Saying so beats
            // five rows of "unknown".
            <p style={panelNoteStyle}>
              No location was detected for this visit, so prices default to {region.currency}.
            </p>
          )}
          <p style={panelNoteStyle}>Shown to you only. Nothing here is stored.</p>
        </div>
      ) : null}
    </div>
  );
}

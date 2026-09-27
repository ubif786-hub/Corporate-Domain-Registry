"use client";

import { CSSProperties, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   Cursor — a subtle custom cursor that layers ON TOP of the native
   pointer. Additive by DEFAULT: the OS cursor stays visible unless a
   surface opts out of it by calling useCursorOnly (the docs chrome and
   the HQ chrome do), in which case the dot becomes the only pointer.
   The rules and the safety argument for that mode sit in cursorCss
   below. An 8px magenta dot trails the pointer with the dial's
   lerp (--mw-cursor-lerp, the shared scroll tiers) so it eases behind
   fast movement, then grows to 24px at half opacity over interactive
   targets to signal "clickable".

   mix-blend-mode: difference inverts the dot against whatever sits
   behind it, so it reads as light on dark surfaces and dark on light
   without any theme wiring.

   CONTEXTUAL VARIANTS (v3.4.0): any element may declare data-cursor
   to retune the cursor over it (closest() semantics, so children
   inherit the surface):
     data-cursor="view"   the labelled state: the dot yields to an
                          accent pill reading "View" (override the text
                          with data-cursor-label). For work cards and
                          gallery tiles where the whole surface is a
                          link into or out to a piece.
     data-cursor="media"  a large soft disc (48px at 35%), for imagery
                          where the small dot disappears into detail.
     data-cursor="hide"   hides the custom cursor entirely (embedded
                          maps, iframes, canvases with their own
                          pointer affordances).
   data-cursor-label with no data-cursor kind implies "view" with that
   label. The pill drops mix-blend (a label must read as itself) and
   inherits the accent + on-accent tokens.

   Off by default, on only for true mouse pointers: the hoisted CSS
   shows it solely under (hover: hover) and (pointer: fine), and hides
   it entirely under prefers-reduced-motion AND at the still dial (a
   decorative trail is exactly what still turns off, A-106). It also
   hides when the window loses focus or the pointer leaves the document,
   and stays hidden until the first real mouse move so it never flashes
   at 0,0. Both hides are mount-checked in the wiring guard and live in
   CSS for runtime flips; a mid-session flip back OUT of still keeps the
   cursor unwired until the next mount (the A-107 observer class, same
   accepted limit as the PRM guard).

   No React re-render drives the animation: a single rAF loop writes
   transform/opacity straight to the nodes, and refs hold the target
   state set by the listeners.
   ============================================================ */

// Targets that trigger the grow state. closest() means children of these
// (an icon inside a button, text inside a link) count too.
const INTERACTIVE_SELECTOR = 'a, button, [role="button"], [data-cursor-grow]';
const CONTEXT_SELECTOR = "[data-cursor], [data-cursor-label]";

type CursorKind = "default" | "grow" | "view" | "media" | "hide";

// Fallback when the token is unreadable (matches SmoothScroll's fallback);
// the live value comes from --mw-cursor-lerp at wiring time.
const LERP_FALLBACK = 0.1;
const DOT_SIZE = 8; // px; the states scale this up
const GROW_SCALE = 3; // 8px → 24px, the interactive state
const MEDIA_SCALE = 6; // 8px → 48px, the soft disc over imagery
const DEFAULT_LABEL = "View";

// Set on <html> by useCursorOnly while an opted-in surface is mounted. Named for the
// intent (the dot is the only cursor), not the mechanism.
const CURSOR_ONLY_ATTR = "data-mw-cursor-only";
// Set on <html> by the loop below, and ONLY while the dot is actually being painted.
const CURSOR_LIVE_ATTR = "data-mw-cursor-live";

const cursorCss = `
[data-mw-cursor],
[data-mw-cursor-label] {
  display: none;
}
@media (hover: hover) and (pointer: fine) {
  [data-mw-cursor],
  [data-mw-cursor-label] {
    display: block;
  }
}
@media (prefers-reduced-motion: reduce) {
  [data-mw-cursor],
  [data-mw-cursor-label] {
    display: none !important;
  }
}
/* The still dial disables the trail like PRM does; a live dial flip hides it
   here even though the mount wiring stays (A-106). */
html[data-motion="still"] [data-mw-cursor],
html[data-motion="still"] [data-mw-cursor-label] {
  display: none !important;
}
/* the labelled pill rests collapsed and pops in via the spring accent; the
   rest state lives HERE (not inline) so the data-active flip can win. */
[data-mw-cursor-label] {
  opacity: 0;
  scale: 0.6;
}
[data-mw-cursor-label][data-active] {
  opacity: 1;
  scale: 1;
}

/* ---- Hiding the NATIVE cursor, opt-in per surface (useCursorOnly) ----

   TWO attributes must both be present, and that pairing is the entire safety
   argument. data-mw-cursor-only says the surface WANTS the dot to be the only
   pointer. data-mw-cursor-live says the dot is ACTUALLY being painted: the loop
   below sets it on the first real mouse move and clears it whenever it hides the
   dot, so the hide can never outlive the thing it hides.

   Why the second attribute has to exist: the effect reads its guards ONCE, at
   mount, with [] deps, and Cursor mounts a single time in the root layout, so it
   never re-runs. No mid-session change reaches it. OS reduced-motion switched off,
   a mouse plugged into a touch device, or a mount that happened at the still dial
   each leave the dot absent while the surface still wants the native cursor gone,
   and that costs the visitor their pointer completely, with only a reload to
   recover. The same gate closes two ordinary holes: before the first mouse move,
   and while the window is blurred or the pointer has left the document.

   Every clause of the media query is load-bearing, and so is
   :not([data-motion="still"]). Those conditions hide the dot from CSS while the JS
   wiring stays live, so the live attribute cannot see them on its own. Nothing here
   is redundant; do not simplify it.

   The !important is deliberate and temporary. 24 declarations in the fleet still set
   cursor as an INLINE style, which no author rule can outrank, so without it those
   controls would show the native arrow beside the dot, which is worse than not
   shipping this at all. The sheet rules need no help: the census ceiling is (0,2,1)
   and this prefix is (0,3,2). Moving those 24 into their components' own hoisted
   sheets is queued, and doing it retires every !important below.

   The exceptions use :where(), which contributes NO specificity, so they land at the
   sweep's own (0,3,2) and source ORDER decides. That is why they sit below the sweep,
   and why their order is text, then not-allowed, then the data-cursor="hide" restore:
   a disabled text field must read not-allowed, and a declared hide surface must win
   over everything. */
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  html[data-mw-cursor-only][data-mw-cursor-live]:not([data-motion="still"]) body,
  html[data-mw-cursor-only][data-mw-cursor-live]:not([data-motion="still"]) body * {
    cursor: none !important;
  }
  /* Pseudo-elements are unreachable by any selector containing *, so the three that
     carry a cursor today are named. Their own component rules stay untouched, so a
     surface that never opts in keeps its pointer affordance.
     ONE RULE PER VENDOR PSEUDO-ELEMENT, and never in the list above. An unknown
     selector invalidates the WHOLE rule it sits in, not just its own branch, and
     ::-moz-range-thumb is unknown to Chromium while ::-webkit-* is unknown to Firefox.
     Grouping them cost the entire sweep in every browser, which read as "the feature
     silently does nothing" and was caught only by asserting computed styles. */
  html[data-mw-cursor-only][data-mw-cursor-live]:not([data-motion="still"]) body input[type="range"]::-webkit-slider-thumb {
    cursor: none !important;
  }
  html[data-mw-cursor-only][data-mw-cursor-live]:not([data-motion="still"]) body input[type="range"]::-moz-range-thumb {
    cursor: none !important;
  }
  html[data-mw-cursor-only][data-mw-cursor-live]:not([data-motion="still"]) body input[type="time"]::-webkit-calendar-picker-indicator {
    cursor: none !important;
  }
  /* A field that takes typing keeps its caret. */
  html[data-mw-cursor-only][data-mw-cursor-live]:not([data-motion="still"]) body :where(textarea, [contenteditable="true"], input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="color"])) {
    cursor: text !important;
  }
  /* A disabled control still says so. SegmentedControl is why the :has clause exists
     at all: its disabled state lives on a screen-reader-only input inside the label,
     so the label matches none of the three markers. That clause is scoped to
     label:has(> input:disabled) for a reason. A bare :has(:disabled) matches every
     ancestor of any disabled input, and since cursor INHERITS, one disabled field then
     turns its whole surrounding panel not-allowed. Even :has(> input:disabled) without
     the label was too broad, and a test caught it painting a plain wrapper div. Only a
     label wrapping its own disabled input actually means "this control is disabled",
     and that shape covers Checkbox, Switch, Radio, and SegmentedControl. */
  html[data-mw-cursor-only][data-mw-cursor-live]:not([data-motion="still"]) body :where(:disabled, [aria-disabled="true"], [data-disabled="true"], label:has(> input:disabled)) {
    cursor: not-allowed !important;
  }
  /* A surface that turns the dot off on purpose gets the native cursor back. */
  html[data-mw-cursor-only][data-mw-cursor-live]:not([data-motion="still"]) body :where([data-cursor="hide"], [data-cursor="hide"] *) {
    cursor: auto !important;
  }
}
`;

// Refcounted on purpose. Two shells can own the opt-in (the docs chrome and the HQ
// chrome), and a route-group swap can mount the next one before the previous one
// cleans up. A bare set/remove pair would then strip the attribute off the surface
// that just arrived.
let cursorOnlyOwners = 0;

/** Opt this surface into hiding the NATIVE cursor, so the magenta dot is the only
 *  pointer. Call it from a surface's chrome; the rules live in this file's hoisted
 *  sheet above, so the behaviour travels with the primitive rather than being
 *  re-implemented per surface.
 *
 *  The ATTRIBUTE is what scopes the effect, not the stylesheet. React does not
 *  guarantee that a precedence-hoisted <style> is removed on unmount, so a surface
 *  that opted in could otherwise keep hiding the cursor after the visitor navigates
 *  away from it. */
export function useCursorOnly() {
  useEffect(() => {
    cursorOnlyOwners += 1;
    document.documentElement.setAttribute(CURSOR_ONLY_ATTR, "");
    return () => {
      cursorOnlyOwners = Math.max(0, cursorOnlyOwners - 1);
      if (cursorOnlyOwners === 0) {
        document.documentElement.removeAttribute(CURSOR_ONLY_ATTR);
      }
    };
  }, []);
}

export function Cursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);

  // target = where the pointer is; cur = where the dot currently is (lerped).
  const target = useRef({ x: 0, y: 0 });
  const cur = useRef({ x: 0, y: 0, scale: 1 });
  const kind = useRef<CursorKind>("default");
  const label = useRef(DEFAULT_LABEL);
  const hidden = useRef(true);

  // Contextual state resets on route swap (QA deferral 1): a navigation under
  // a stationary pointer replaces the DOM without firing any mouseover, which
  // used to strand the View pill / grow state until the next move. pathname
  // is the reliable reset moment (a mouseout with a null relatedTarget does
  // not fire dependably when the hovered node is simply removed), and the
  // re-render it costs is two static divs. A running loop repaints the
  // default state next frame; an idle loop means the cursor is hidden, and
  // the wake re-derives context from a fresh mouseover anyway.
  const pathname = usePathname();
  useEffect(() => {
    kind.current = "default";
    label.current = DEFAULT_LABEL;
    if (labelRef.current) labelRef.current.textContent = DEFAULT_LABEL;
  }, [pathname]);

  useEffect(() => {
    const el = dotRef.current;
    const pill = labelRef.current;
    if (!el || !pill) return;

    // Skip all wiring on touch / no-fine-pointer devices, under
    // prefers-reduced-motion, AND at the still dial: the CSS hides the nodes
    // in all three cases anyway, but this also avoids attaching idle
    // listeners and running a rAF loop for a cursor that can never show
    // (QA deferral 2, mirroring the pointer-fine guard; still added by A-106).
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      (!window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.getAttribute("data-motion") === "still")
    ) {
      return;
    }

    // The trail damping comes from the dial (read once at wiring, the
    // SmoothScroll pattern; a live gentle<->sharp flip keeps the mount value,
    // the A-107 observer class).
    const lerpRaw = getComputedStyle(document.documentElement)
      .getPropertyValue("--mw-cursor-lerp")
      .trim();
    const parsedLerp = Number.parseFloat(lerpRaw);
    const lerp = Number.isFinite(parsedLerp) && parsedLerp > 0 ? parsedLerp : LERP_FALLBACK;

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      // First move (or first move after the pointer left / window blurred)
      // reveals the dot and snaps it to the pointer so it doesn't streak in.
      if (hidden.current) {
        cur.current.x = e.clientX;
        cur.current.y = e.clientY;
        hidden.current = false;
        // The dot is about to be painted, so an opted-in surface may now hide the
        // native cursor. Written HERE and in hide(), never in the loop: an attribute
        // write on documentElement invalidates style for the whole tree, and both of
        // these branches fire once per state change rather than once per frame.
        document.documentElement.setAttribute(CURSOR_LIVE_ATTR, "");
      }
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as Element | null;
      // Context first: the declared surface wins over the generic grow.
      const ctx = t?.closest(CONTEXT_SELECTOR) as Element | null;
      if (ctx) {
        const declared = ctx.getAttribute("data-cursor");
        const text = ctx.getAttribute("data-cursor-label");
        if (declared === "hide") {
          kind.current = "hide";
        } else if (declared === "media") {
          kind.current = "media";
        } else {
          // "view", an unknown kind, or a bare data-cursor-label all take
          // the labelled state; unknown falls back rather than breaking.
          kind.current = "view";
          label.current = text || DEFAULT_LABEL;
          pill.textContent = label.current;
        }
        return;
      }
      kind.current = t && t.closest(INTERACTIVE_SELECTOR) ? "grow" : "default";
    };

    const hide = () => {
      hidden.current = true;
      // The dot is going away, so the native cursor must come back with it.
      document.documentElement.removeAttribute(CURSOR_LIVE_ATTR);
    };

    let raf: number | null = null;

    const loop = () => {
      cur.current.x += (target.current.x - cur.current.x) * lerp;
      cur.current.y += (target.current.y - cur.current.y) * lerp;
      const k = kind.current;
      const targetScale =
        k === "grow" ? GROW_SCALE : k === "media" ? MEDIA_SCALE : 1;
      cur.current.scale += (targetScale - cur.current.scale) * lerp;

      const half = DOT_SIZE / 2;
      const x = cur.current.x;
      const y = cur.current.y;
      el.style.transform = `translate3d(${(x - half).toFixed(2)}px, ${(y - half).toFixed(2)}px, 0) scale(${cur.current.scale.toFixed(3)})`;
      // The pill centers on the pointer; scale rides CSS (a transition on the
      // wrapper would fight the rAF translate, so it flips via [data-active]).
      pill.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%)`;

      const dotVisible = !hidden.current && k !== "hide" && k !== "view";
      // opacity only changes on state flips, so the CSS transition on it can
      // ease the fade; writing the same value each frame is a no-op.
      el.style.opacity = !dotVisible ? "0" : k === "grow" ? "0.5" : k === "media" ? "0.35" : "1";
      const pillActive = !hidden.current && k === "view";
      if ((pill.getAttribute("data-active") === "") !== pillActive) {
        if (pillActive) pill.setAttribute("data-active", "");
        else pill.removeAttribute("data-active");
      }

      // Idle gate (QA deferral 2): once the pointer is gone (hidden) and the
      // visual state has settled (dot fading via CSS, pill retracted), stop
      // scheduling frames. The resting styles were just written above, so the
      // last frame leaves the settled state painted; onMove / onOver wake the
      // loop, and the first move after hiding snaps position, so no stale
      // lerp ever streaks in.
      if (hidden.current && !pillActive) {
        raf = null;
        return;
      }

      raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (raf === null) raf = requestAnimationFrame(loop);
    };
    const onMoveWake = (e: MouseEvent) => {
      onMove(e);
      wake();
    };
    const onOverWake = (e: MouseEvent) => {
      onOver(e);
      wake();
    };

    window.addEventListener("mousemove", onMoveWake, { passive: true });
    document.addEventListener("mouseover", onOverWake, { passive: true });
    document.addEventListener("mouseleave", hide);
    window.addEventListener("blur", hide);
    wake();

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMoveWake);
      document.removeEventListener("mouseover", onOverWake);
      document.removeEventListener("mouseleave", hide);
      window.removeEventListener("blur", hide);
      // The invariant: this attribute exists only while these listeners do. Without
      // this line a teardown with the attribute set (StrictMode's dev double-invoke,
      // or any future change to the deps below) would leave an opted-in surface
      // hiding the native cursor with no loop left to draw the dot.
      document.documentElement.removeAttribute(CURSOR_LIVE_ATTR);
    };
  }, []);

  return (
    <>
      <style href="magentaweb-cursor" precedence="default">{cursorCss}</style>
      <div ref={dotRef} data-mw-cursor="" aria-hidden="true" style={dotStyle} />
      <div ref={labelRef} data-mw-cursor-label="" aria-hidden="true" style={labelStyle}>
        {DEFAULT_LABEL}
      </div>
    </>
  );
}

const dotStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: `${DOT_SIZE}px`,
  height: `${DOT_SIZE}px`,
  borderRadius: "var(--radius-full)",
  background: "var(--accent-base)",
  mixBlendMode: "difference",
  pointerEvents: "none",
  zIndex: tokenNumber("var(--z-cursor)"),
  opacity: 0,
  // Position + scale ride the rAF loop (no transition, or they would lag);
  // only opacity eases via CSS so the grow/hide fade is smooth.
  transition: "opacity var(--motion-transition)",
  willChange: "transform, opacity",
};

// The labelled state: an accent pill, no blend (the text must read as itself).
// Scale + opacity flip via [data-active] with the spring accent, so the pill
// pops in; translate rides the same rAF loop as the dot.
const labelStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  paddingInline: "var(--space-sm)",
  paddingBlock: "var(--space-2xs)",
  borderRadius: "var(--radius-full)",
  background: "var(--accent-base)",
  color: "var(--text-on-accent)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  letterSpacing: "var(--tracking-wide)",
  whiteSpace: "nowrap",
  pointerEvents: "none",
  zIndex: tokenNumber("var(--z-cursor)"),
  transition:
    "opacity var(--motion-transition), scale var(--motion-duration) var(--motion-ease-spring)",
  willChange: "transform, opacity",
};

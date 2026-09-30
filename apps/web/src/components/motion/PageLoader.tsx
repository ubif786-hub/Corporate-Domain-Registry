"use client";

import { ReactNode, RefObject, TransitionEvent, useEffect, useRef, useState } from "react";
import { GUARD_CEILING_MS, PAGE_LOADER_SEEN_KEY } from "@/components/motion/pageLoaderConfig";
import { CurtainBrand } from "@/components/motion/curtain-brand";

/* ============================================================
   PageLoader — Phase 4: the branded initial-load curtain (ROADMAP Phase 4,
   NAV_PLAN "transition-ready"). A full-viewport surface covers first paint
   and lifts when the page is ready. The dismissal IS the Phase 5 curtain
   vocabulary played once: translateY(-100%) on the motion tokens, the mark
   fading one beat ahead of the lift, so route transitions later inherit a
   proven move instead of inventing a second one.

   Mounting tech vs the Phase 5 curtain: the loader must cover BEFORE
   hydration, so it is plain fixed CSS on its own z rung (--z-loader), NOT a
   Popover top-layer surface (showPopover needs JS). The Phase 5 curtain runs
   post-hydration and can ride the top layer; their windows never overlap, so
   the shared relationship is vocabulary and tokens, not mounting tech.

   The html attribute contract (absent by default, loader opts in):
   - The (site) layout inlines PAGE_LOADER_GUARD pre-paint. It sets
     data-mw-loader="active" on <html> only when this load runs the intro
     (first load of the session, no reduced-motion). The SSR-rendered cover
     is displayed purely by that attribute, so the covering state is painted
     from the first frame with no flash and no CLS: the page renders at its
     final layout underneath a fixed overlay that touches no flow.
   - While the attribute is present (active -> lifting) the Nav mount stagger
     AND the reveal primitives (RevealBlock / RevealText) hold via the CSS
     gates below; removing it releases the whole composition at once, so the
     curtain clears a quiet stage and the page then breathes in (nav stagger,
     hero reveals, their own delays intact). Every skip path (return visit,
     PRM, no JS, docs routes) never has the attribute, so those loads behave
     exactly as before this component.

   Ready = hydration AND document.fonts.ready (the loader's own effect
   running proves hydration; fonts are the one maskable ugliness, the
   Fraunces swap). Floor 936ms, the 3 Jul x1.3 owner retune of the original
   720ms (the gentle reveal duration of its day): a deliberate
   brand beat, not a spinner wait; floor 0 at data-motion="still".
   Ceiling 3250ms (2500 x1.3, scaled with the retune): fonts.ready resolves
   even on failure, but nothing may hold the page hostage. Images are never
   gated (Media owns its own skeleton-and-fade contract).

   Accessibility: decorative chrome, not a dialog. aria-hidden, no focus
   trap, no announcement. Screen reader experience: nothing; the page is
   simply there. What it DOES take while it covers is both kinds of input.
   Pointer since 26 Aug 2026 (the ssr, cover and lift phases): an opaque
   surface that let clicks through landed a blind second click on whatever
   sat unseen beneath it. Keyboard since D34: the same argument reaches Tab,
   which walked the covered page and put focus on controls nobody can see,
   so the cover marks the page under it inert for its duration and hands
   focus back after (useCoverInert below, which also carries the reason the
   target is not the dialogs' single app-root node).
   Once done it is display:none, holds nothing, and intercepts nothing.

   mode="preview": the contained docs demo (/motion). position:absolute in
   the parent frame, no session storage, no html attribute, replays via a
   parent key remount. Page behavior is otherwise identical so the docs show
   the real choreography.
   ============================================================ */

const FLOOR_MS = 936; // 720 x1.3, the owner motion retune (3 Jul); see header note
const CEILING_MS = 3250; // 2500 x1.3, scaled with the retune
const PREVIEW_HOLD_MS = 1100; // docs demo cover hold: a deliberate fixed beat, not dial time

type Phase = "ssr" | "cover" | "lift" | "done";

const css = `
[data-mw-pageloader] {
  display: none;
  align-items: center;
  justify-content: center;
  background: var(--background-positive-primary);
  color: var(--text-positive-primary);
  /* Hidden by default (done, and ssr without the guard's attribute): intercepts
     nothing. The covering phases below take the pointer. */
  pointer-events: none;
  transform: translateY(0);
  /* The curtain lift: 2x --motion-duration so the exit reads as a stage move,
     not a UI transition. Phase 5's route curtain reuses exactly this. */
  transition: transform calc(var(--motion-duration) * 2) var(--motion-ease);
}
[data-mw-pageloader][data-mode="page"] {
  position: fixed;
  inset: 0;
  z-index: var(--z-loader);
}
[data-mw-pageloader][data-mode="preview"] {
  position: absolute;
  inset: 0;
}
/* SSR-painted covering state: pre-hydration visibility is driven purely by
   the html attribute the pre-paint guard set, so the cover exists at first
   paint with no JS-render dependency. Post-hydration the component owns
   visibility through data-phase. */
html[data-mw-loader] [data-mw-pageloader][data-phase="ssr"],
[data-mw-pageloader][data-phase="cover"],
[data-mw-pageloader][data-phase="lift"] {
  display: flex;
}
[data-mw-pageloader][data-phase="lift"] {
  transform: translateY(-100%);
}
/* While it covers, the surface takes pointer input (26 Aug 2026), so a blind click
   during the intro lands on the curtain and not on the unseen page beneath. ssr is
   the pre-hydration cover: it is displayed only under the guard's html attribute and
   is display:none otherwise, and a display:none element never hit-tests, so listing
   it here costs nothing on the skip paths. done keeps pointer-events none. */
[data-mw-pageloader][data-phase="ssr"],
[data-mw-pageloader][data-phase="cover"],
[data-mw-pageloader][data-phase="lift"] {
  pointer-events: auto;
}

/* The brand group (the shared CurtainBrand: mark + rule + entrance) fades one
   beat ahead of the lift (1x duration vs the curtain's 2x), so the mark is
   gone before the surface clears the viewport. The group's layout, geometry,
   and entrance keyframes live in curtain-brand.tsx (one vocabulary, every
   curtain); the loader owns only this phase-keyed fade. */
[data-mw-pageloader] [data-mw-curtain-brand] {
  transition: opacity var(--motion-duration) var(--motion-ease);
}
[data-mw-pageloader][data-phase="lift"] [data-mw-curtain-brand] {
  opacity: 0;
}

/* Nav handoff, the other half of the html attribute contract: while the
   loader owns the stage the Nav mount stagger holds; the attribute's removal
   releases the reveal, which then plays from frame one (re-matching the
   animation starts it fresh). Absent attribute = this rule never matches, so
   every skip path keeps the normal mount stagger. Specificity intentionally
   beats Nav's own reveal rule (four attribute selectors vs three). */
html[data-mw-loader] [data-mw-nav][data-mounted="true"] [data-mw-nav-staggered] {
  animation: none;
}

/* The same gate for the reveal primitives (RevealBlock / RevealText), so the
   curtain reveals a quiet stage and the page composes after it clears rather
   than playing to a covered house. These are transition-driven (a
   data-revealed attribute flip), not keyframe-driven like the Nav stagger,
   but the release mechanism is the same: while the html attribute is present
   these rules hold every reveal at its pre-reveal values (winning specificity
   over the data-revealed="true" state rules), and the attribute's removal
   changes the computed values, which fires the primitives' own declared
   transitions with their stagger and base delays intact. Absent attribute =
   these rules never match = normal mount/viewport reveal everywhere, docs
   and every skip path included. */
html[data-mw-loader] [data-mw-reveal] {
  opacity: 0;
}
html[data-mw-loader] [data-mw-reveal][data-variant="fade-up"] {
  transform: translateY(var(--motion-reveal-distance));
}
html[data-mw-loader] [data-mw-reveal][data-variant="fade-down"] {
  transform: translateY(calc(-1 * var(--motion-reveal-distance)));
}
/* A pre-reveal HOLD, not a settled state (B5 census, 27 Aug 2026): this rule
   matches only while the html attribute is present and lifts with it, after
   which RevealBlock's own data-revealed="true" rule rests the block at
   filter: none. Nothing here holds a filter at rest. */
html[data-mw-loader] [data-mw-reveal][data-variant="blur"] {
  filter: blur(var(--motion-reveal-blur));
}
html[data-mw-loader] [data-mw-reveal][data-variant="scale"] {
  transform: scale(var(--motion-reveal-scale));
}
html[data-mw-loader] [data-mw-reveal-text] [data-mw-reveal-text-piece] {
  opacity: 0;
  transform: translateY(var(--motion-reveal-distance));
}
`;

/* ---------- the cover-inert contract (D34), shared by both curtains ---------- */

// The layout's app-root wrapper, the same node the dialog overlays inert.
const APP_ROOT_ID = "mw-app-root";

/**
 * Inert the covered page for as long as a full-viewport cover is up, and release it
 * afterwards with focus put back where the inert took it from.
 *
 * D34. Both curtains took the POINTER while covering and left the keyboard alone, so a Tab
 * under a cover walked the page beneath and landed focus on controls nobody can see: on the
 * docs curtain, four stops (Components, Motion, Patterns, Theme); on this loader, the skip
 * link, the wordmark and the first two nav items. It runs useDialogOverlay's inertTarget
 * dance, deliberately not a second invention: capture focus, set inert, skip anything already
 * inert so a stacked surface is not trampled, remove exactly what was set on cleanup.
 *
 * WHAT IT INERTS, and why it is not the dialog's single #mw-app-root target. A Modal PORTALS
 * to document.body, so it sits outside the node it inerts. A cover is rendered IN the tree, so
 * the same target would swallow the cover itself, and an inert subtree hit-tests as
 * pointer-events:none: the curtain would stop intercepting the blind click it was given the
 * pointer for on 26 Aug 2026, and the click would fall through to whatever sits OUTSIDE the app
 * root. That is not hypothetical. --z-toast (1000) is under --z-loader (1100), so a live toast
 * is painted over by the curtain, and with the app root inert elementFromPoint over it returned
 * the toast, not the curtain: a blind click on something invisible, the exact defect the pointer
 * fix removed. So the target is every SIBLING on the path from the cover up to #mw-app-root,
 * which is the whole page except the cover's own container chain. The keyboard half is
 * identical, the pointer half is untouched, and nothing outside the app root (the toast
 * viewport, the live regions, the Cursor) changes at all: they keep behaving as they do over an
 * open Modal.
 *
 * Two things a cover needs that a dialog does not:
 *
 *  - A RELEASE THAT DOES NOT DEPEND ON THE ANIMATION. A dialog closes when the user closes it;
 *    a cover clears when a transition ends, and a transitionend that never arrives would leave
 *    the page inert with no way back. The component watchdogs cover the ordinary misses, but
 *    they compute their own timeout FROM the transition, so a pathological duration takes them
 *    with it. The failsafe below is a plain timer that owes the animation nothing, set to the
 *    inline guard's ceiling (GUARD_CEILING_MS, AX-5) so the two safety nets agree: past that
 *    point the page is handed back whatever the curtain is still doing. It is far above the
 *    longest legitimate cover (the route curtain's worst chain is about 4.8s at the gentle
 *    dial; a fork that slowed the sweep past 8s would simply release early and keep the pointer
 *    block, which is the safe direction to fail in).
 *
 *  - FOCUS CAPTURE AND RESTORE. inert on an ancestor BLURS a focused descendant: the link the
 *    visitor clicked drops focus to body the moment the cover goes up, and without a restore
 *    their place in the tab order is gone. Pass 3 spent a release fixing exactly that shape,
 *    so the focused element is captured before the attribute and re-focused after it, with
 *    preventScroll so the restore cannot fight the route scroll reset. It restores only when
 *    nothing else has claimed focus in the meantime (a toast action outside the app root stays
 *    live above every overlay), and only to an element still in the document: a trigger inside
 *    the outgoing page is gone by then, and focus drops to body exactly as it does today.
 *
 * Not a dialog contract: no trap, no scroll lock, no aria-modal. The cover is aria-hidden
 * decorative chrome that happens to be opaque.
 */
export function useCoverInert(
  coverRef: RefObject<HTMLElement | null>,
  covering: boolean,
  ceilingMs: number = GUARD_CEILING_MS,
): void {
  useEffect(() => {
    if (!covering) return;
    const cover = coverRef.current;
    if (!cover) return;
    const root = document.getElementById(APP_ROOT_ID) ?? document.body;
    // Captured BEFORE the first attribute, because setting inert on an ancestor blurs a focused
    // descendant: read it afterwards and it is already document.body.
    const prevFocus = document.activeElement as HTMLElement | null;

    const marked: HTMLElement[] = [];
    const mark = (el: Element) => {
      // Skip what is already inert: an open Modal owns the app-root attribute, and removing it
      // on our release would hand the page back while that dialog is still up.
      if (!(el instanceof HTMLElement) || el.hasAttribute("inert")) return;
      el.setAttribute("inert", "");
      marked.push(el);
    };
    if (!root.contains(cover)) {
      // A fork that mounts its cover outside the app root gets the dialog's single target: the
      // cover is not in the subtree, so nothing here can cost it its hit-testing.
      mark(root);
    } else {
      let node: HTMLElement = cover;
      while (node !== root) {
        const parent: HTMLElement | null = node.parentElement;
        if (!parent) break;
        const siblings: Element[] = Array.from(parent.children);
        for (const sibling of siblings) {
          if (sibling !== node) mark(sibling);
        }
        node = parent;
      }
    }
    if (marked.length === 0) return;

    let failsafe = 0;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      window.clearTimeout(failsafe);
      for (const el of marked) el.removeAttribute("inert");
      // Restore only if focus is where the inert left it. Anything else has claimed it since
      // (a toast action outside the app root), and taking it back would be the same theft in
      // the other direction. Deliberately not gated on having SEEN the blur: the blur an inert
      // ancestor causes is not applied synchronously with the attribute, so a read taken right
      // after the loop above still names the old element and the restore would never fire.
      const active = document.activeElement;
      const undisturbed = active === null || active === document.body || root.contains(active);
      if (prevFocus && prevFocus !== document.body && prevFocus.isConnected && undisturbed) {
        prevFocus.focus({ preventScroll: true });
      }
    };
    failsafe = window.setTimeout(release, ceilingMs);
    return release;
  }, [coverRef, covering, ceilingMs]);
}

export interface PageLoaderProps {
  /** "page" is the production curtain; "preview" is the contained docs demo. */
  mode?: "page" | "preview";
  /** The curtain's centerpiece mark, threaded to CurtainBrand. Defaults to
   *  the MW BrandMark; a fork passes its own mark so the branded first-load
   *  cover shows the fork's brand. */
  mark?: ReactNode;
}

export function PageLoader({ mode = "page", mark }: PageLoaderProps) {
  // The phase is decided in the initializer, not an effect: on the server it
  // is "ssr" (the attribute-gated SSR cover); on the client first render it
  // resolves directly to cover (guard opted in), done (skip paths), or cover
  // for a preview. No synchronous setState-in-effect, no cascading render.
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof document === "undefined") return "ssr";
    if (mode === "preview") return "cover";
    if (document.documentElement.getAttribute("data-mw-loader") !== "active") return "done";
    // Belt over the guard: never run the intro under reduced motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "done";
    return "cover";
  });
  const elRef = useRef<HTMLDivElement | null>(null);

  // Inert the page while the production curtain covers it (D34). "preview" is a contained docs
  // demo inside one card, so it takes nothing: inerting the page around it would be a lie about
  // what the reader can touch. The window is the two covering phases; "ssr" is pre-hydration,
  // where no effect has run yet (see the open question on the inline guard), and "done" is
  // display:none.
  useCoverInert(elRef, mode === "page" && (phase === "cover" || phase === "lift"));

  // Page sequence: stamp the session, then lift at max(floor, fonts-ready),
  // capped by the ceiling. Elapsed time is measured from navigation start
  // (performance.now()), so a slow network has already consumed the floor.
  useEffect(() => {
    if (mode !== "page" || phase !== "cover") return;
    try {
      sessionStorage.setItem(PAGE_LOADER_SEEN_KEY, "1");
    } catch {}
    const still = document.documentElement.getAttribute("data-motion") === "still";
    const elapsed = performance.now();
    const floorDelay = still ? 0 : Math.max(0, FLOOR_MS - elapsed);
    const ceilingDelay = Math.max(0, CEILING_MS - elapsed);
    const timers: number[] = [];
    let cancelled = false;
    const lift = () => {
      if (!cancelled) setPhase("lift");
    };
    const floorP = new Promise((r) => timers.push(window.setTimeout(r, floorDelay)));
    const ceilingP = new Promise((r) => timers.push(window.setTimeout(r, ceilingDelay)));
    Promise.race([Promise.all([document.fonts.ready, floorP]), ceilingP]).then(lift);
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [mode, phase]);

  // Preview sequence: hold the cover, then lift; the demo replays by
  // remounting (key), which re-runs the initializer back to "cover".
  useEffect(() => {
    if (mode !== "preview" || phase !== "cover") return;
    const t = window.setTimeout(() => setPhase("lift"), PREVIEW_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [mode, phase]);

  // Sync the html attribute contract (external writes belong in effects).
  // "lifting" keeps the Nav gate held through the exit; "done" releases it.
  useEffect(() => {
    if (mode !== "page") return;
    const html = document.documentElement;
    if (phase === "lift") html.setAttribute("data-mw-loader", "lifting");
    else if (phase === "done") html.removeAttribute("data-mw-loader");
  }, [mode, phase]);

  // Unmount-only safety: a soft navigation away mid-cover must not strand the
  // attribute (it would gate the Nav forever and re-cover on return).
  useEffect(() => {
    if (mode !== "page") return;
    return () => document.documentElement.removeAttribute("data-mw-loader");
  }, [mode]);

  // Lift watchdog: transitionend never fires for 0s transitions (the still
  // dial and the PRM token collapse both zero --motion-duration), so finish
  // from the computed duration when the event cannot arrive.
  useEffect(() => {
    if (phase !== "lift") return;
    const el = elRef.current;
    const dur = el ? parseFloat(getComputedStyle(el).transitionDuration) * 1000 : 0;
    const t = window.setTimeout(
      () => setPhase("done"),
      Number.isFinite(dur) && dur > 10 ? dur + 400 : 0,
    );
    return () => window.clearTimeout(t);
  }, [phase]);

  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target === elRef.current && e.propertyName === "transform" && phase === "lift") {
      setPhase("done");
    }
  };

  return (
    <>
      <style href="magentaweb-pageloader" precedence="default">
        {css}
      </style>
      {mode === "page" && (
        // Belt over the default-hidden CSS: with JS disabled the guard never
        // runs and the attribute never appears, but the explicit rule makes
        // the no-JS contract greppable.
        <noscript>
          <style>{`[data-mw-pageloader]{display:none !important;}`}</style>
        </noscript>
      )}
      {/* Rendered in EVERY phase, including done: the server always emits the
          cover (phase "ssr"), so the client's first render must too or
          hydration fails structurally on the skip paths and React regenerates
          the whole tree. "done" is display:none by CSS (no rule shows it), so
          the settled cost is one inert hidden div. data-phase server/client
          divergence is the designed pre-paint handoff; suppressed (same idiom
          as the theme flash guard on html). */}
      <div
        ref={elRef}
        data-mw-pageloader=""
        data-mode={mode}
        data-phase={phase}
        aria-hidden="true"
        suppressHydrationWarning
        onTransitionEnd={onTransitionEnd}
      >
        <CurtainBrand animate mark={mark} />
      </div>
    </>
  );
}

/* Styles deliberately all in the hoisted css string: the cover is one element
   with phase-driven attributes, the View Transitions-friendly shape (state as
   attributes + CSS, snapshotable). */

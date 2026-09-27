"use client";

import {
  CSSProperties,
  ReactNode,
  TransitionEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { CurtainBrand } from "@/components/motion/curtain-brand";
// The cover-inert contract (D34) lives with the older curtain and is imported, not copied, so
// the two covers cannot drift the way the pre-extraction overlay copies did. It is not its own
// module because every file under src/components is attributed to a system.json registry entry,
// and this pass does not own that file; if a third cover ever appears, promote it.
import { useCoverInert } from "@/components/motion/PageLoader";

/* ============================================================
   RouteTransition — the shared route-transition preset (owner-approved API),
   consolidating the two per-surface implementations the transition audit
   found: the docs curtain system (DocsCurtain + DocsPageTransition +
   docs-nav + docs-curtain-bus) and the HQ controlled exit (hq-nav exitTo +
   the hq-content-exit keyframes + HqContentReset). One module, two modes:

   COVERED (cover, the docs feel): navigate() blurs the outgoing stage out as
   one block, sweeps a branded curtain over it (CurtainBrand, the PageLoader
   vocabulary), pushes under cover, and lifts on the new route, releasing the
   incoming stage's entrance cascade (held paused by an html gate while
   covered).

   COVERLESS (cover={false}, the HQ feel): navigate() plays the same exit
   blur and pushes when it completes; the new page's entrance belongs to the
   surface (HQ runs Reveal beats).

   Pieces:
   - <RouteCurtain />: mount ONCE per surface layout. Owns navigate() via a
     module singleton (exactly one curtain per surface, client only), the
     skip logic (same-route, still dial, reduced motion, in-flight), the
     watchdogs, and, when covering, the curtain surface itself plus the
     inert it puts on the page underneath for as long as it is up (D34).
   - <RouteStage>: wraps the routable content, keyed by pathname (so exit
     state can never leak onto the next page; this absorbs the old
     HqContentReset). `stagger` plays the capped nth-child entrance cascade;
     `content` scopes both cascade and exit to a selector INSIDE the stage
     (the exit must never animate an ancestor of a position:fixed rail, or
     the filter re-anchors it).
   - useRouteTransition(): returns navigate(href) for imperative callers.
   - routeLinkClick(href): the modified-click-safe onClick every route link
     shares (falls back to a hard navigation if no curtain is mounted).

   Token-driven and dial-tracking throughout; still + reduced motion navigate
   instantly and every animation collapses. Timing values are verbatim ports:
   entrance step = reveal x 0.07 capped at 6 beats, exit = one reveal-duration
   blur-out, cover lead 300ms, cover watchdog 2400ms, coverless fallback
   1800ms, cover lift fallback 600ms, sweep = 2x --motion-duration (the
   `speed` knob). The lift itself carries a computed-duration watchdog, so a
   0s sweep (still dial or PRM flipped mid-flight) cannot strand the phase.
   ============================================================ */

/* ---------- the singleton bus (one curtain per surface) ---------- */

type Navigate = (href: string) => void;
let currentNavigate: Navigate | null = null;

function registerRouteCurtain(navigate: Navigate): () => void {
  currentNavigate = navigate;
  return () => {
    if (currentNavigate === navigate) currentNavigate = null;
  };
}

/** Imperative navigation through the mounted RouteCurtain; false if none. */
export function routeNavigate(href: string): boolean {
  if (!currentNavigate) return false;
  currentNavigate(href);
  return true;
}

/** The shared route-link onClick: plain left clicks run the transition,
 *  modified or non-primary clicks fall through to the browser. No curtain
 *  mounted (never the case on a wired surface): hard navigation, never a
 *  swallowed click. */
export function routeLinkClick(href: string) {
  return (e: MouseEvent<HTMLElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (!routeNavigate(href)) window.location.href = href;
  };
}

/** navigate(href) bound to the mounted curtain, for imperative callers
 *  (overview covers, programmatic redirects). Identity-stable (useCallback,
 *  QA deferral 4) so subscribers can list it in effect deps without churn. */
export function useRouteTransition() {
  return useCallback((href: string) => {
    if (!routeNavigate(href)) window.location.href = href;
  }, []);
}

/* ---------- RouteStage: the routable content wrapper ---------- */

const STAGE_ATTR = "data-mw-route-stage";
const EXITING_ATTR = "data-exiting";
const CURTAIN_GATE = "data-mw-route-curtain"; // html gate holding the incoming cascade
const EXIT_ANIMATION = "mw-route-out";
const ENTER_CAP = 6;

export interface RouteStageProps {
  children: ReactNode;
  /** Play the capped nth-child entrance cascade (the docs feel). false =
   *  the surface owns its entrance (HQ runs Reveal beats). */
  stagger?: boolean;
  /** Selector scoping the cascade and the exit blur to an element INSIDE the
   *  stage (default: the stage's own direct children). Point it at the block
   *  that holds no position:fixed descendants-of-interest, so the exit's
   *  filter never re-anchors a pinned rail. */
  content?: string;
}

function stageCss(content: string | undefined, stagger: boolean): string {
  // The cascade/exit target: a scoped block inside the stage, or the stage itself.
  const enter = content
    ? `[${STAGE_ATTR}]:not([${EXITING_ATTR}="true"]) ${content} > *`
    : `[${STAGE_ATTR}]:not([${EXITING_ATTR}="true"]) > *`;
  const exitBlock = content
    ? `[${STAGE_ATTR}][${EXITING_ATTR}="true"] ${content}`
    : `[${STAGE_ATTR}][${EXITING_ATTR}="true"]`;

  const enterRules = !stagger
    ? ""
    : `
/* ENTRANCE: gentle staggered blur-fade-in of each content section, capped at
   ${ENTER_CAP} beats so a long page does not cascade for seconds. backwards fill
   holds each section hidden until its turn. */
${enter} {
  animation: mw-route-in var(--motion-reveal-duration) var(--motion-ease) backwards;
}
${Array.from(
  { length: ENTER_CAP },
  (_, i) => `${enter}:nth-child(${i + 1}) { animation-delay: calc(var(--mw-route-step) * ${i}); }`,
).join("\n")}
${enter}:nth-child(n+${ENTER_CAP + 1}) { animation-delay: calc(var(--mw-route-step) * ${ENTER_CAP - 1}); }
/* The settled end is filter: none, not blur(0). The backwards fill already
   releases each section to its natural style once done, but any non-none
   filter is a stacking context and a held blur(0) is exactly what put every
   settled Reveal beat over its neighbour's popover (B5, 27 Aug 2026), so the
   whole class ends on none by name. none interpolates from blur() (the
   identity list). */
@keyframes mw-route-in {
  from { opacity: 0; filter: blur(var(--motion-reveal-blur)); }
  to   { opacity: 1; filter: none; }
}

/* CURTAIN GATE: hold the incoming cascade paused at frame 0 while the curtain
   covers, so the reveal plays as it lifts (RouteCurtain sets/removes the gate). */
html[${CURTAIN_GATE}] ${enter} {
  animation-play-state: paused;
}`;

  return `
[${STAGE_ATTR}] {
  /* Entrance stagger, derived from the slow reveal tier (0 at still). */
  --mw-route-step: calc(var(--motion-reveal-duration) * 0.07);
}
${enterRules}

/* EXIT: the scoped block blurs out as one slow block (the curtain, when
   covering, then masks the rest). */
${exitBlock} {
  animation: ${EXIT_ANIMATION} var(--motion-reveal-duration) var(--motion-ease) both;
}
@keyframes ${EXIT_ANIMATION} {
  /* Starts from the natural style (filter none), the same value the settled
     entrance rests on, so the exit's first frame is the page as it stood. */
  from { opacity: 1; filter: none; }
  to   { opacity: 0; filter: blur(var(--motion-reveal-blur)); }
}

/* still + reduced motion: nothing animates (navigate() already skipped the
   choreography; any stray state shows no animation). */
@media (prefers-reduced-motion: reduce) {
  ${stagger ? `${enter},` : ""}
  ${exitBlock} { animation: none; }
}
html[data-motion="still"] ${exitBlock} { animation: none; }
${stagger ? `html[data-motion="still"] ${enter} { animation: none; }` : ""}
`;
}

export function RouteStage({ children, stagger = true, content }: RouteStageProps) {
  const pathname = usePathname();
  return (
    <>
      <style
        href={`magentaweb-route-stage:${stagger ? "s" : "p"}:${content ?? "*"}`}
        precedence="default"
      >
        {stageCss(content, stagger)}
      </style>
      {/* Keyed by pathname: each route gets a fresh stage, so an exit state can
          never leak onto the next page. */}
      <div key={pathname} data-mw-route-stage="" data-stagger={stagger ? "true" : "false"}>
        {children}
      </div>
    </>
  );
}

/* ---------- RouteCurtain: navigation orchestration (+ the cover) ---------- */

// Let the exit blur read for a beat before the curtain sweeps over it.
const LEAD_MS = 300;
// Watchdog so a missed transitionend (or a route that never resolves) never
// strands the cover.
const COVER_SAFETY_MS = 2400;
// Lift fallback grace: a push that only changes query or hash never flips
// usePathname, so the route-change lift can never fire; the cover lifts from
// this settle after the push instead (and from COVER_SAFETY_MS + this, if
// even the safety push produced no signal).
const COVER_LIFT_FALLBACK_MS = 600;
// Coverless fallback if the exit's animationend never fires. Must exceed the
// longest exit (one gentle reveal-duration, 1582ms after the 12 Aug retune)
// or the fallback preempts the choreography it guards.
const EXIT_SAFETY_MS = 1800;
// Coverless stall grace after the push: how long the exited (blank) stage may wait for the new
// route before the outgoing page is released back to view. Long enough that a normal commit
// (an RSC round trip, well under a second on a warm route) never sees it; short enough that a
// slow route reads as slow rather than as broken.
const EXIT_STALL_MS = 1200;

type Phase = "idle" | "cover" | "lift";

export interface RouteCurtainProps {
  /** false = the coverless mode: exit blur + push, no branded sweep (HQ). */
  cover?: boolean;
  /** The cover's centerpiece; defaults to the shared CurtainBrand. */
  brand?: ReactNode;
  /** The default CurtainBrand's mark, for forks that keep the shared
   *  mark-over-rule group but swap in their own mark. Ignored when `brand`
   *  replaces the whole centerpiece. */
  mark?: ReactNode;
  /** The cover surface color. */
  background?: string;
  /** Sweep duration as a multiple of --motion-duration (2 = the stage-move feel). */
  speed?: number;
  /** Where the cover sweeps in from ("bottom": rises to cover, lifts on past the top). */
  from?: "bottom" | "top";
}

function curtainCss(speed: number, from: "bottom" | "top"): string {
  const inY = from === "bottom" ? "100%" : "-100%";
  const outY = from === "bottom" ? "-100%" : "100%";
  return `
[data-mw-route-curtain-surface] {
  position: fixed;
  inset: 0;
  z-index: var(--z-loader);
  display: flex;
  align-items: center;
  justify-content: center;
  /* Idle never intercepts input (the page underneath stays live). The cover and
     lift phases below take the pointer while the surface actually covers. */
  pointer-events: none;
  transform: translateY(${inY});
  /* The sweep: ${speed}x --motion-duration so it reads as a stage move. */
  transition: transform calc(var(--motion-duration) * ${speed}) var(--motion-ease);
}
/* Idle rests offscreen, hidden, and resets between cycles with NO transition
   (the snap back after a lift is instant and unseen). */
[data-mw-route-curtain-surface][data-phase="idle"] {
  transform: translateY(${inY});
  transition: none;
  visibility: hidden;
}
[data-mw-route-curtain-surface][data-phase="cover"] { transform: translateY(0); }
[data-mw-route-curtain-surface][data-phase="lift"]  { transform: translateY(${outY}); }
/* While it covers, the surface takes pointer input (26 Aug 2026). Until then it was
   pointer-events:none in every phase, so a visitor who took the blank branded surface for
   a missed click and clicked again landed that click on whatever control sat unseen
   beneath it. Hit-testing follows the transform, so during the sweep only the covered
   region intercepts, and idle is offscreen and visibility:hidden, so it can never
   intercept once settled. Keyboard is the other half, and it is not held here: the
   component marks the page under the cover inert for the covering phases (D34,
   useCoverInert), because CSS cannot take an element out of the tab order.

   The two are deliberately kept APART, and this rule is the reason. useCoverInert inerts
   the cover's SIBLINGS, never the app root and never any ancestor of this surface, because
   an inert subtree hit-tests as pointer-events:none: an inert that reached the surface
   would spend the 26 Aug fix silently, and the blind click would fall through to whatever
   sits outside the app root (a live toast, which the curtain paints over at --z-loader 1100
   against --z-toast 1000). Measured on the first draft of D34, which did inert the app
   root: elementFromPoint over a covered toast returned the toast. So the rule below is what
   blocks the blind click, for the whole cover and not for one frame, and the inert holds
   only the keyboard. Do not delete it as redundant with the inert. */
[data-mw-route-curtain-surface][data-phase="cover"],
[data-mw-route-curtain-surface][data-phase="lift"] {
  pointer-events: auto;
}

/* The brand group fades in as the curtain covers and out as it lifts (the
   loader's one-beat-ahead feel; the group itself is the shared CurtainBrand). */
[data-mw-route-curtain-surface] [data-mw-curtain-brand] {
  opacity: 0;
  transition: opacity var(--motion-duration) var(--motion-ease);
}
[data-mw-route-curtain-surface][data-phase="cover"] [data-mw-curtain-brand] { opacity: 1; }
`;
}

export function RouteCurtain({
  cover = true,
  brand,
  mark,
  background = "var(--background-positive-primary)",
  speed = 2,
  from = "bottom",
}: RouteCurtainProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  // href is what gets pushed; path is what usePathname can be compared to
  // (it never carries search or hash, so comparing the raw href wedged the
  // cover on any querystringed target).
  const pendingRef = useRef<{ href: string; path: string } | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);
  // The navigate closure reads the mode at call time; synced in an effect
  // (never during render, per the refs rule).
  const coverRef = useRef(cover);
  useEffect(() => {
    coverRef.current = cover;
  }, [cover]);

  // Inert the covered page for the covering phases (D34). Gated on `cover`: the coverless mode
  // never leaves "idle" (nothing is hidden, so nothing may be taken), and the gate says so
  // rather than relying on that.
  useCoverInert(surfaceRef, cover && phase !== "idle");

  const set = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };
  // The one way down from cover: release the gate and lift. Route-change,
  // same-path settle, and the safety fallback all land here. Stable identity
  // (useCallback) so the effects that reach it can list it without churn.
  const liftIfCovered = useCallback(() => {
    if (phaseRef.current !== "cover") return;
    pendingRef.current = null;
    clearTimers();
    document.documentElement.removeAttribute(CURTAIN_GATE);
    set("lift");
  }, []);

  // Register the imperative navigate() the route links reach through the bus.
  useEffect(() => {
    const navigate = (href: string) => {
      const html = document.documentElement;
      // Resolve before comparing: the raw-string check no-opped "/pricing"
      // against a location of "/pricing?plan=pro" and choreographed
      // "/pricing#top" against "/pricing" (A-116's cousin).
      const target = new URL(href, window.location.href);
      if (
        target.pathname === window.location.pathname &&
        target.search === window.location.search &&
        target.hash === window.location.hash
      ) {
        return;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const still = html.getAttribute("data-motion") === "still";
      const stage = document.querySelector<HTMLElement>(`[${STAGE_ATTR}]`);
      const busy = coverRef.current
        ? phaseRef.current !== "idle"
        : stage?.getAttribute(EXITING_ATTR) === "true";
      // Motion off, no stage to choreograph, or a transition already running: just go.
      if (reduced || still || !stage || busy) {
        router.push(href);
        return;
      }

      // 1. blur the outgoing content out as one block.
      stage.setAttribute(EXITING_ATTR, "true");

      if (!coverRef.current) {
        // COVERLESS: push when the exit completes (animationend), with a fallback.
        let done = false;
        const go = () => {
          if (done) return;
          done = true;
          stage.removeEventListener("animationend", onEnd);
          router.push(href);
          // STALL WATCHDOG (23 Sep 2026). The exit keyframe fills `both`, so once it has played
          // the stage sits at opacity 0 until the new route commits and RouteStage remounts
          // under its new pathname key. A route whose server render is slow (the HQ drill-in
          // measured 5 to 11 seconds of live reads) therefore showed a blank, blurred page for
          // the whole wait, with the URL unchanged: the covered mode has COVER_SAFETY_MS and
          // COVER_LIFT_FALLBACK_MS for exactly this class, and the coverless mode had nothing
          // after the push. If the SAME stage element is still mounted and still exiting after
          // the grace, release it: the outgoing page returns, still live, and the new one
          // arrives with its own entrance when it is ready. A loading boundary on the slow
          // route is the other half (it lets the route commit at once); this is the floor.
          timersRef.current.push(
            window.setTimeout(() => {
              if (stage.isConnected && stage.getAttribute(EXITING_ATTR) === "true") {
                stage.removeAttribute(EXITING_ATTR);
              }
            }, EXIT_STALL_MS),
          );
        };
        const onEnd = (e: AnimationEvent) => {
          if (e.animationName === EXIT_ANIMATION) go();
        };
        stage.addEventListener("animationend", onEnd);
        timersRef.current.push(window.setTimeout(go, EXIT_SAFETY_MS));
        return;
      }

      // COVERED: after a short lead, sweep the curtain up and gate the incoming reveal.
      pendingRef.current = { href, path: target.pathname };
      timersRef.current.push(
        window.setTimeout(() => {
          html.setAttribute(CURTAIN_GATE, "");
          set("cover");
          // Safety: if the cover transitionend is missed, swap anyway...
          timersRef.current.push(
            window.setTimeout(() => {
              if (phaseRef.current === "cover" && pendingRef.current) {
                router.push(pendingRef.current.href);
              }
            }, COVER_SAFETY_MS),
          );
          // ...and if no route-change signal arrives even after that push,
          // lift rather than strand the cover (A-116).
          timersRef.current.push(
            window.setTimeout(liftIfCovered, COVER_SAFETY_MS + COVER_LIFT_FALLBACK_MS),
          );
        }, LEAD_MS),
      );
    };
    return registerRouteCurtain(navigate);
  }, [router, liftIfCovered]);

  // The new route has mounted under cover -> lift and release the reveal gate.
  useEffect(() => {
    if (phaseRef.current === "cover" && pathname === pendingRef.current?.path) {
      liftIfCovered();
    }
  }, [pathname, liftIfCovered]);

  // Never strand the gate or timers if the curtain unmounts (leaving the surface).
  useEffect(
    () => () => {
      clearTimers();
      document.documentElement.removeAttribute(CURTAIN_GATE);
    },
    [],
  );

  // Lift watchdog: transitionend never fires for 0s transitions (a dial flip
  // to still or a PRM change mid-lift zeroes the sweep), so finish from the
  // computed duration when the event cannot arrive. PageLoader carries the
  // same guard for its own lift (A-108).
  useEffect(() => {
    if (phase !== "lift") return;
    const el = surfaceRef.current;
    const dur = el ? parseFloat(getComputedStyle(el).transitionDuration) * 1000 : 0;
    const t = window.setTimeout(
      () => {
        clearTimers();
        set("idle");
      },
      Number.isFinite(dur) && dur > 10 ? dur + 400 : 0,
    );
    return () => window.clearTimeout(t);
  }, [phase]);

  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== surfaceRef.current || e.propertyName !== "transform") return;
    if (phaseRef.current === "cover" && pendingRef.current) {
      // Fully covered -> swap underneath (the lift fires from the route change above).
      const { href, path } = pendingRef.current;
      router.push(href);
      // A push that only changes query or hash never flips usePathname, so
      // the route-change lift can never fire; lift from a short settle (A-116).
      if (path === window.location.pathname) {
        timersRef.current.push(window.setTimeout(liftIfCovered, COVER_LIFT_FALLBACK_MS));
      }
    } else if (phaseRef.current === "lift") {
      clearTimers();
      set("idle");
    }
  };

  if (!cover) return null;

  const surfaceStyle: CSSProperties = { background };
  return (
    <>
      <style href={`magentaweb-route-curtain:${speed}:${from}`} precedence="default">
        {curtainCss(speed, from)}
      </style>
      <div
        ref={surfaceRef}
        data-mw-route-curtain-surface=""
        data-phase={phase}
        style={surfaceStyle}
        aria-hidden="true"
        onTransitionEnd={onTransitionEnd}
      >
        {brand ?? <CurtainBrand mark={mark} />}
      </div>
    </>
  );
}

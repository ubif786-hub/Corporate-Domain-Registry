"use client";

import { CSSProperties, MouseEvent, ReactNode, useRef, useState, useSyncExternalStore } from "react";
import { OverlayMotion } from "@/components/motion/OverlayMotion";
import { useDialogOverlay } from "@/components/useDialogOverlay";
import { FocusSentinel } from "@/components/internal/FocusSentinel";

/* ============================================================
   AppShell — the layout wrapper that binds TopBar + NavRail into one working
   system. It is the SINGLE SOURCE OF TRUTH for the collapsed state: TopBar and
   NavRail never own it. The two slots are render props that receive the shell
   state ({ collapsed, toggle }), so the consumer composes each piece with its
   own content (brand, utilities, nav items) while the shell wires the state.

   Behaviour:
   - Desktop (>= --mw-bp-desktop, 1024px): the rail is inline and sticky; the
     hamburger toggles `collapsed` (icon-only <-> full) and the content offsets
     as the rail width changes (flexbox).
   - Below 1024px: the rail folds to an off-canvas overlay with a backdrop; the
     hamburger opens it, and a backdrop click, Escape, or a nav-link click
     closes it. The overlay always shows the full (expanded) rail. It is a
     modal dialog on the shared useDialogOverlay contract (26 Aug 2026): focus
     moves into it, Tab cycles within it, the content region goes inert, and
     focus returns to the hamburger on close. Closed, the rail is inert, so its
     off-canvas links sit outside the tab order and the accessibility tree.

   No persistence, by design for now: `collapsed` lives in memory and resets on
   reload. The mother is where this is proven before it fans to the forks.
   ============================================================ */

export interface AppShellRenderState {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
}

export interface AppShellProps {
  /** Top row. Receives the shell state; render a <TopBar onToggle={toggle} .../>. */
  topBar: (state: AppShellRenderState) => ReactNode;
  /** Left rail. Receives the shell state; render a <NavRail collapsed={collapsed} .../>. */
  navRail: (state: AppShellRenderState) => ReactNode;
  children: ReactNode;
  /** id applied to the <main> content landmark (e.g. a skip-link target). */
  mainId?: string;
  /** Render the content region as a <main> landmark (the default). Set false
   *  when the shell composes INSIDE a page that already has one (the docs
   *  live demo): HTML allows one main per document, and a second landmark
   *  makes assistive-tech navigation ambiguous (A-102). id, styling, and
   *  behavior are unchanged either way. */
  mainLandmark?: boolean;
  /** The app-page content frame (v4.5.0). Off by default (marketing shells stay
   *  full-bleed). Set it on a PRODUCT shell and EVERY page under it gets one
   *  consistent inset — padding, a max content width, and centring — so no page
   *  hand-rolls its own gutter and they cannot drift (the padding-drift bug this
   *  fixes at the source). The <main> itself is padded/capped; a page owns only
   *  its internal flow. */
  contentFrame?: boolean;
  /** OPT-IN reading cap for the content frame. By DEFAULT the frame FILLS the
   *  space right of the rail (just the padding inset) — an app content area is
   *  dashboards, tables, and panel grids, and wants the available width. Pass a
   *  token (e.g. "var(--container-width)") ONLY on a surface that genuinely wants
   *  a reading measure (settings, long-form); it then caps AND centres. */
  contentMaxWidth?: string;
  /** The ground the content sits on.
   *
   *  "primary" (default, unchanged): the page ground, with Cards lifted a step to
   *  secondary. Every existing shell, HQ included.
   *
   *  "secondary": the inverted APP ground. A straight swap of the pair across the
   *  WHOLE shell: the content area, the rail, and the bar all drop to secondary and
   *  read as one continuous surface, while the Cards on it rise to primary so the
   *  panels are the only thing lifted out. One prop does every half on purpose: a
   *  secondary canvas whose cards stayed secondary would render invisible panels,
   *  and a rail whose hover stayed secondary would lose its hover, so neither is a
   *  state worth being able to express. A card that must opt out passes
   *  surface="secondary". */
  canvas?: "primary" | "secondary";
}

// Below the desktop breakpoint the rail is an overlay. 1023.98 so the boundary
// sits exactly at --mw-bp-desktop (1024px), matching the CSS min-width rule.
const NARROW_QUERY = "(max-width: 1023.98px)";
const subscribeNarrow = (onChange: () => void) => {
  const m = window.matchMedia(NARROW_QUERY);
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
};
const getNarrow = () => window.matchMedia(NARROW_QUERY).matches;
const getNarrowServer = () => false;

// The drawer's focusable set is the hook's DIALOG_FOCUSABLE_SELECTOR (hoisted in
// pass 4, 27 Aug 2026, from the verbatim copy that sat here, the fifth of Modal's
// string); containment past an <iframe> is the FocusSentinel pair at the rail's
// edges in the JSX below, rendered only while the rail is the narrow dialog.

export function AppShell({ topBar, navRail, children, mainId, mainLandmark = true, canvas = "primary", contentFrame = false, contentMaxWidth }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isNarrow = useSyncExternalStore(subscribeNarrow, getNarrow, getNarrowServer);
  const railRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);

  // Widening past the fold while the drawer is open: close it, during render (the
  // sanctioned adjust-state-on-prop-change pattern Nav uses for pathname; an effect
  // would set state post-paint and trip react-hooks/set-state-in-effect). The
  // desktop rail is inline and never "open", so a mobileOpen left true kept the
  // body lock and the content inert with nothing on screen to explain them (it
  // did, until 26 Aug 2026). Closing flips the hook's `open` off in the same
  // render; the hook then restores focus to the hamburger, which TopBar hides at
  // desktop, so that focus() is a no-op and focus stays where it was. An accepted
  // drop, preferable to focusing a display:none control.
  const [wasNarrow, setWasNarrow] = useState(isNarrow);
  if (wasNarrow !== isNarrow) {
    setWasNarrow(isNarrow);
    if (!isNarrow && mobileOpen) setMobileOpen(false);
  }
  // The landmark decision: <main> normally, a plain div when composing inside
  // a page that already has one (mainLandmark=false, the docs demo).
  const ContentRegion = mainLandmark ? ("main" as const) : ("div" as const);

  // One handler, viewport-aware: below the breakpoint it opens the overlay,
  // above it collapses the inline rail. Reads matchMedia live so it never goes
  // stale. The bars call this; they never touch the state directly.
  const toggle = () => {
    if (typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches) {
      setMobileOpen((o) => !o);
    } else {
      setCollapsed((c) => !c);
    }
  };

  // Below the fold the rail is a modal dialog on the shared overlay contract
  // (26 Aug 2026). Until then this was a hand-rolled copy that took Escape and
  // the body lock (A-117 had put it on the overlay stack) but moved no focus
  // in, trapped nothing, restored nothing, and announced nothing, under a
  // scrim that blocked every pointer. `open` is gated on isNarrow so the inline
  // desktop rail never traps or inerts anything.
  //   trapRef / initialFocusRef: the rail itself (tabIndex -1 while narrow), so
  //     focus lands on the dialog and Tab cycles through its links.
  //   inertTarget: the content region ONLY. The top bar stays live: the trap
  //     already confines Tab, and inerting the bar would take the drawer's own
  //     close toggle out of the accessibility tree.
  //   lockScroll: the default, the body lock this drawer always had.
  useDialogOverlay({
    open: isNarrow && mobileOpen,
    trapRef: railRef,
    initialFocusRef: railRef,
    onClose: () => setMobileOpen(false),
    inertTarget: () => mainRef.current,
  });

  // The overlay always shows the full rail; only the inline (desktop) rail obeys
  // the collapsed toggle.
  const railCollapsed = isNarrow ? false : collapsed;
  const state: AppShellRenderState = { collapsed: railCollapsed, mobileOpen, toggle };

  // In overlay mode a nav-link click closes the drawer (no-op on desktop / when
  // already closed).
  const onRailClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) setMobileOpen(false);
  };

  return (
    <div data-mw-appshell="" data-canvas={canvas} data-mobile-open={mobileOpen ? "true" : "false"}>
      <style href="magentaweb-appshell" precedence="default">{css}</style>
      {/* The rail's off-canvas slide and the backdrop fade ride the shared
          OverlayMotion preset (slide-left + backdrop markers, data-open). */}
      <OverlayMotion />
      <div data-mw-appshell-top="">{topBar(state)}</div>
      <div data-mw-appshell-body="">
        <div
          ref={railRef}
          data-mw-appshell-rail=""
          data-mw-overlay="slide-left"
          data-open={mobileOpen ? "true" : "false"}
          // Narrow: the preset only moves the closed rail off-canvas, so inert is
          // what takes its links out of the tab order and the a11y tree (Nav's
          // idiom). Gated on isNarrow: the inline desktop rail is never "open",
          // and an ungated inert would kill it. While narrow the rail is the
          // dialog the hook above drives: role, aria-modal, a name, and a
          // focus target of its own.
          inert={isNarrow && !mobileOpen}
          role={isNarrow ? "dialog" : undefined}
          aria-modal={isNarrow ? "true" : undefined}
          aria-label={isNarrow ? "Navigation" : undefined}
          tabIndex={isNarrow ? -1 : undefined}
          onClick={onRailClick}
        >
          {/* The sentinel pair is gated like the dialog semantics above: it is a trap
              boundary, and only the narrow rail is a trap. Ungated, the end sentinel
              would wrap a Tab leaving the desktop rail's last link (relatedTarget
              inside the rail reads as LEAVING) straight back to its first link, so the
              inline rail nobody is trapped in would pin the tab order inside itself. */}
          {isNarrow && <FocusSentinel edge="start" trapRef={railRef} />}
          {navRail(state)}
          {isNarrow && <FocusSentinel edge="end" trapRef={railRef} />}
        </div>
        <ContentRegion
          ref={mainRef}
          id={mainId}
          data-mw-appshell-main=""
          data-frame={contentFrame ? "true" : undefined}
          style={
            contentMaxWidth
              ? ({ ["--mw-content-max"]: contentMaxWidth, ["--mw-content-mi"]: "auto" } as CSSProperties)
              : undefined
          }
        >
          {children}
        </ContentRegion>
        <button
          type="button"
          data-mw-appshell-backdrop=""
          data-mw-overlay-backdrop=""
          data-open={mobileOpen ? "true" : "false"}
          aria-label="Close navigation"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={() => setMobileOpen(false)}
        />
      </div>
    </div>
  );
}

const css = `
[data-mw-appshell] {
  --mw-appshell-top-h: var(--chrome-bar-height); /* one source: tokens.css chrome geometry */
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
[data-mw-appshell-top] {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}
[data-mw-appshell-body] {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}
[data-mw-appshell-main] {
  flex: 1 1 auto;
  min-width: 0;
}
/* The app-page content frame (v4.5.0; fill-by-default since v4.6.0, opt-in via
   contentFrame). The <main> is padded on all sides so every page under a product
   shell inherits ONE gutter and none can drift. border-box so the padding composes.
   Off by default, so marketing shells (HQ/docs/site) are byte-unchanged.

   FILL by default: no cap, no centring. 72rem (--container-width) is a READING
   measure — right for docs/prose/marketing, wrong for an app. An app content area
   is dashboards, tables, and panel grids; it wants the available width right of the
   rail. This is an APP primitive and must not inherit a website constraint. (Before
   v4.6.0 it capped at 72rem + margin-inline:auto, which floated the content with
   grey bands both sides once the post-rail space — wide monitor, or a collapsed
   rail — exceeded 72rem.)

   OPT-IN cap: pass contentMaxWidth on a surface that genuinely wants a reading
   measure (settings, long-form). It sets --mw-content-max (the cap) and
   --mw-content-mi:auto (centres it); unset, the frame fills flush. */
[data-mw-appshell-main][data-frame="true"] {
  box-sizing: border-box;
  width: 100%;
  max-width: var(--mw-content-max, 100%);
  margin-inline: var(--mw-content-mi, 0);
  padding: var(--space-xl);
}
/* The inverted canvas (2026-07-15). A marketing page is a primary ground with
   cards lifted a step to secondary. An APP is the other way round: a secondary
   ground with panels sitting on it in primary, so content reads as paper on a
   desk. ReadilyHome's design draws exactly this, and it is the ordinary shape for
   a dashboard.

   It is a straight SWAP of the pair, not just a canvas tint, and it covers the
   whole shell: the chrome takes the ground too, so the rail, the bar, and the
   content area read as one continuous surface with only the panels lifted out of
   it. (The design agrees by omission: its <nav> carries no fill of its own, so it
   inherits the body's secondary ground.)

   Because it is a swap, every rule that leaned on the old pairing has to move with
   it, or it inverts into a bug:
   - Cards rise to primary. A secondary canvas whose cards stayed secondary would
     render invisible panels, which is why ONE prop does both halves and pages do
     not each remember a surface per card. A card that must opt out passes
     surface="secondary" and wins on specificity.
   - The rail's hover rises to primary. Left at secondary it would equal the rail's
     own new ground and the hover would simply stop existing.

   Opt-in, so every existing shell (HQ included) is untouched. */

/* ONE app ground (2026-07-18). tokens.css grounds html,body in
   --background-positive-primary — correct for a primary shell, but for a
   SECONDARY canvas the ground behind the shell stayed primary while main/rail/bar
   dropped to secondary, so the lighter primary peeked through as a tonal SEAM
   wherever the content frame did not reach: a capped frame's auto-margins, or
   overscroll. Reground the shell ROOT and the html/body behind it to secondary so
   the app ground is one continuous surface. The :has() reground scopes to pages
   that actually mount a secondary-canvas shell; primary shells are untouched. */
[data-mw-appshell][data-canvas="secondary"] {
  background: var(--background-positive-secondary);
}
html:has([data-mw-appshell][data-canvas="secondary"]),
html:has([data-mw-appshell][data-canvas="secondary"]) body {
  background: var(--background-positive-secondary);
}
[data-mw-appshell][data-canvas="secondary"] [data-mw-appshell-main],
[data-mw-appshell][data-canvas="secondary"] [data-mw-topbar],
[data-mw-appshell][data-canvas="secondary"] [data-mw-navrail] {
  background: var(--background-positive-secondary);
}
[data-mw-appshell][data-canvas="secondary"] [data-mw-card-variant]:not([data-surface]) {
  background: var(--background-positive-primary);
}
/* Surface hierarchy (v4.8.0): the outlined controls ride the SAME canvas flip as
   cards — raised to the panel surface on the secondary canvas, so a secondary
   button / input field / segmented control reads as a prominent object on the
   recessive shell (its own outline separates it on any ground, panels included).
   On a PRIMARY canvas (marketing/default) this rule doesn't apply, so the controls
   keep their default secondary fill — raised there too, since that canvas's cards
   are secondary. Theme-correct: resolves to the dark panel surface in dark. */
[data-mw-appshell][data-canvas="secondary"] [data-mw-button][data-variant="secondary"],
[data-mw-appshell][data-canvas="secondary"] [data-mw-menu-trigger][data-variant="secondary"],
[data-mw-appshell][data-canvas="secondary"] [data-mw-input-field],
[data-mw-appshell][data-canvas="secondary"] [data-mw-segmented]:not([data-variant="track"]) {
  background: var(--background-positive-primary);
}
/* The TRACK variant keeps its own ground (v6.33.0): the track is the control wash and its active
   segment lifts onto primary, so raising the track to primary with the rest put the active
   segment on its own colour and the selection disappeared (the owner could not see which of
   Rows and Cards was on). */
/* ChoiceCard rides the flip too, but RESTING only — the selected state keeps its
   accent-soft fill (its :has(input:checked) rule, which this :not() excludes so
   the raised surface never washes out the selection). The image variant's bg is
   hidden behind the media, so this only re-grounds the plain resting card. */
[data-mw-appshell][data-canvas="secondary"] [data-mw-choicecard]:not(:has(input:checked)) {
  background: var(--background-positive-primary);
}
[data-mw-appshell][data-canvas="secondary"] [data-mw-navrail-link]:not([data-active="true"]):hover {
  background: var(--background-positive-primary);
}
/* Mobile-first: the rail is an off-canvas overlay below the top bar. The slide
   and the backdrop fade come from the shared OverlayMotion preset (slide-left
   surface + backdrop markers); this sheet keeps the shell geometry only. */
[data-mw-appshell-rail] {
  position: fixed;
  top: var(--mw-appshell-top-h);
  left: 0;
  height: calc(100vh - var(--mw-appshell-top-h));
  z-index: var(--z-overlay);
  box-shadow: var(--shadow-raised);
}
[data-mw-appshell-backdrop] {
  position: fixed;
  inset: var(--mw-appshell-top-h) 0 0 0;
  z-index: calc(var(--z-overlay) - 1);
  border: 0;
  padding: 0;
  background: var(--modal-scrim);
  cursor: pointer;
}
/* The narrow drawer takes focus itself on open (a tabIndex -1 dialog container,
   the Modal panel's pattern), so the container draws no ring of its own; the
   first Tab lands on a link that carries its own focus style. */
[data-mw-appshell-rail][role="dialog"] {
  outline: none;
}
/* Desktop: the rail is inline and sticky; content offsets as its width changes.
   The ancestor keeps these overrides above the preset's closed-state transform
   (a lone attribute selector) at any sheet order. */
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-appshell] [data-mw-appshell-rail] {
    position: sticky;
    top: var(--mw-appshell-top-h);
    height: calc(100vh - var(--mw-appshell-top-h));
    align-self: flex-start;
    z-index: auto;
    transform: none;
    transition: none;
    box-shadow: none;
  }
  [data-mw-appshell] [data-mw-appshell-backdrop] { display: none; }
}
`;

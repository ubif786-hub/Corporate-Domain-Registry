"use client";

import {
  Children,
  CSSProperties,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
} from "react";

/* ============================================================
   Tabs — compound component with horizontal and vertical orientations
   plus optional autoplay. Tabs.Root provides Context; Tabs.List holds
   the triggers, Tabs.Panels holds the content. Tab and Panel children
   receive their index by cloning inside the parent containers.

   Active tab carries a 2px accent-base bar. With autoplay, the bar
   fills from 0 to full over autoplayInterval; on completion, the next
   tab becomes active (focus does not move). A latching pause control
   sits after the tab list whenever autoplay is on (WCAG 2.2.2 Pause,
   Stop, Hide, Level A): it gates the indicator animation, and paused
   stays paused when the pointer leaves. Hovering the root, focus inside
   the root, and losing window focus also pause, as a courtesy, not as
   the mechanism. Manual click resets the fill.
   ============================================================ */

type TabsOrientation = "horizontal" | "vertical";

interface TabsContextValue {
  activeIndex: number;
  autoplay: boolean;
  autoplayInterval: number;
  baseId: string;
  count: number;
  generation: number;
  orientation: TabsOrientation;
  appearance: TabsAppearance;
  paused: boolean;
  /** Accessible name of the pause control: one constant name, aria-pressed carries the state. */
  pauseLabel: string;
  /** False once the pause control has been pressed; the control's own state. */
  playing: boolean;
  registerCount: (n: number) => void;
  setActiveIndex: (i: number) => void;
  togglePlaying: () => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(`${component} must be used inside <Tabs>.`);
  }
  return ctx;
}

const isPauseControl = (el: EventTarget | null): boolean =>
  el instanceof Element && el.hasAttribute("data-mw-tabs-toggle");

/* The look of the strip (v6.31.0, the HQ v7 boards): "underline" is the original, a rule under
   the list with the accent indicator on the active tab; "pill" is the data-surface register, the
   tabs as words on the ground with the active tab lifted onto the primary surface (no track since
   v6.34.0: the track is SegmentedControl's, and a page's tabs must not read as a view switch), for
   a record's tab strip on a tinted canvas where a rule would be one more line. An option: it composes with either orientation (the pill
   strip stacks vertically as a list of lifted rows), which is why it is not the orientation prop. */
export type TabsAppearance = "underline" | "pill";

export interface TabsProps {
  autoplay?: boolean;
  autoplayInterval?: number;
  children: ReactNode;
  defaultIndex?: number;
  // Fires with the new index whenever the active tab changes (click, keyboard, or
  // autoplay). Optional and observe-only: Tabs stays uncontrolled and owns its own
  // active state, so a consumer can react to the change without driving it.
  onActiveChange?: (index: number) => void;
  orientation?: TabsOrientation;
  /** The look of the strip. Default "underline"; "pill" is the lifted-tab strip for a data surface. */
  appearance?: TabsAppearance;
  /** Accessible name of the pause control that renders with autoplay. Default
   *  "Pause tab rotation". ONE constant name, with aria-pressed carrying the
   *  state (the toggle-button pattern), so there is one prop and not Carousel's
   *  pauseLabel / playLabel pair. User-facing text: a site in another language
   *  overrides it, as it overrides Carousel's and Marquee's pauseLabel. */
  pauseLabel?: string;
}

export function Tabs({
  autoplay = false,
  autoplayInterval = 5000,
  children,
  defaultIndex = 0,
  onActiveChange,
  orientation = "horizontal",
  appearance = "underline",
  pauseLabel = "Pause tab rotation",
}: TabsProps) {
  const baseId = useId();
  const [activeIndex, setActiveIndexState] = useState(defaultIndex);
  const [generation, setGeneration] = useState(0);
  const [count, setCount] = useState(0);
  // Pointer events, not mouse events: a touch pointer is transient (pointerleave
  // fires after pointerup), so a tap cannot hold the pause. The compat mouseenter
  // a tap synthesises gets no mouseleave until the next tap outside the root,
  // which held the rotation off after any tap inside and made the Play half of
  // the control dead exactly where it matters (AX-13). Carousel reads pointer
  // events too.
  const [pointerInside, setPointerInside] = useState(false);
  // Window focus drives the autoplay pause. Subscribe to focus/blur via
  // useSyncExternalStore so the read happens at render time (no setState in an
  // effect): server snapshot is `true` (matches the prior initial state), the
  // client snapshot reads document.hasFocus() after hydration.
  const windowFocused = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("focus", onChange);
      window.addEventListener("blur", onChange);
      return () => {
        window.removeEventListener("focus", onChange);
        window.removeEventListener("blur", onChange);
      };
    },
    () => document.hasFocus(),
    () => true,
  );

  // Focus inside the root joins hover as a pause input so keyboard users can
  // halt rotation by tabbing in: without it an auto-advance hides the panel
  // holding focus and drops focus to body (WCAG 2.2.2). Blur clears the flag
  // only when focus leaves the subtree, not when it moves between a tab and
  // its panel.
  const [focusInside, setFocusInside] = useState(false);

  // The pause control's latch. Hover, focus and window blur are conveniences
  // (the thing you are reaching for stops moving) and none of them is a
  // "mechanism" in the WCAG 2.2.2 sense: hover cannot be held on a touch
  // screen, and a reader scrolling past the block focuses nothing. This one
  // is a real button and it LATCHES: paused stays paused when the pointer
  // leaves. It gates the indicator animation through `paused` below, because
  // animationend is autoplay's only advance mechanism (there is no timer).
  const [playing, setPlaying] = useState(true);
  const togglePlaying = useCallback(() => setPlaying((p) => !p), []);

  const paused = !playing || pointerInside || focusInside || !windowFocused;

  const setActiveIndex = useCallback((i: number) => {
    setActiveIndexState(i);
    setGeneration((g) => g + 1);
    onActiveChange?.(i);
  }, [onActiveChange]);

  const registerCount = useCallback((n: number) => {
    setCount((prev) => (prev === n ? prev : n));
  }, []);

  const value: TabsContextValue = {
    activeIndex,
    autoplay,
    autoplayInterval,
    baseId,
    count,
    generation,
    orientation,
    appearance,
    paused,
    pauseLabel,
    playing,
    registerCount,
    setActiveIndex,
    togglePlaying,
  };

  // S-11, sanctioned at D35 (27 Aug 2026). The 2xl between a VERTICAL rail and its panel is
  // a major in-band group break on the spacing ladder, not control geometry: it separates two
  // content regions, so it is right that it rides the spacing dial. The horizontal orientation
  // takes 0 because the underline rule is the separation there.
  const rootStyle: CSSProperties = {
    display: orientation === "vertical" ? "flex" : "block",
    gap: orientation === "vertical" ? "var(--space-2xl)" : 0,
    alignItems: orientation === "vertical" ? "flex-start" : "stretch",
  };

  return (
    <TabsContext.Provider value={value}>
      <div
        data-mw-tabs=""
        data-orientation={orientation}
        data-appearance={appearance}
        style={rootStyle}
        onPointerEnter={() => setPointerInside(true)}
        onPointerLeave={() => setPointerInside(false)}
        // Focus ON the pause control is not a pause input: the control neither
        // moves nor hides on an advance, and someone who presses Play while
        // standing on it (a mouse click leaves focus there too) must see the
        // rotation resume rather than wait for a blur.
        onFocus={(e) => setFocusInside(!isPauseControl(e.target))}
        onBlur={(e) => {
          const next = e.relatedTarget;
          setFocusInside(next !== null && e.currentTarget.contains(next) && !isPauseControl(next));
        }}
      >
        <style href="magentaweb-tabs" precedence="default">{tabsCss}</style>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: ReactNode;
  /** Accessible name for the tab strip (the role="tablist" element has none of its own). */
  ariaLabel?: string;
}

export function TabsList({ children, ariaLabel }: TabsListProps) {
  const { autoplay, orientation, pauseLabel, playing, registerCount, togglePlaying } = useTabsContext("Tabs.List");
  const items = Children.toArray(children).filter(isValidElement);

  useEffect(() => {
    registerCount(items.length);
  }, [items.length, registerCount]);

  const list = (
    <div
      data-mw-tabs-list=""
      data-orientation={orientation}
      role="tablist"
      aria-orientation={orientation}
      aria-label={ariaLabel}
    >
      {items.map((child, i) =>
        cloneElement(child as ReactElement<{ __index?: number }>, {
          __index: i,
        }),
      )}
    </div>
  );

  // Static tab sets keep the exact markup they always had.
  if (!autoplay) return list;

  // WCAG 2.2.2 Pause, Stop, Hide (Level A): the mechanism. A real button with
  // aria-pressed, rendered only when there is a rotation to stop, and placed
  // AFTER the tablist rather than inside it, because a tablist may own only
  // tabs. The strip wrapper exists so the list's rule can run under the
  // control too. Same dress as Carousel's toggle, so the two read as one control.
  // The name is constant (pauseLabel, a prop since B4 so a non-English site can
  // rename it) and aria-pressed carries the state.
  return (
    <div data-mw-tabs-strip="" data-orientation={orientation}>
      {list}
      <button
        data-mw-tabs-toggle=""
        type="button"
        aria-pressed={!playing}
        aria-label={pauseLabel}
        onClick={togglePlaying}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" focusable="false">
          {playing ? (
            <>
              <rect x="1" y="1" width="3" height="8" />
              <rect x="6" y="1" width="3" height="8" />
            </>
          ) : (
            <path d="M2 1l7 4-7 4z" />
          )}
        </svg>
      </button>
    </div>
  );
}

export interface TabsPanelsProps {
  children: ReactNode;
}

export function TabsPanels({ children }: TabsPanelsProps) {
  const ctx = useTabsContext("Tabs.Panels");
  const items = Children.toArray(children).filter(isValidElement);

  const panelsStyle: CSSProperties = {
    flex: ctx.orientation === "vertical" ? 1 : undefined,
    minWidth: 0,
  };

  return (
    <div data-mw-tabs-panels="" style={panelsStyle}>
      {items.map((child, i) =>
        cloneElement(child as ReactElement<{ __index?: number }>, {
          __index: i,
        }),
      )}
    </div>
  );
}

export interface TabsTabProps {
  __index?: number;
  children: ReactNode;
}

export function TabsTab({ __index = 0, children }: TabsTabProps) {
  const ctx = useTabsContext("Tabs.Tab");
  const isActive = ctx.activeIndex === __index;
  const tabId = `${ctx.baseId}-tab-${__index}`;
  const panelId = `${ctx.baseId}-panel-${__index}`;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const nextKey = ctx.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    const prevKey = ctx.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    let next = __index;
    if (e.key === nextKey) next = (__index + 1) % ctx.count;
    else if (e.key === prevKey) next = (__index - 1 + ctx.count) % ctx.count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ctx.count - 1;
    else return;
    e.preventDefault();
    ctx.setActiveIndex(next);
    queueMicrotask(() => {
      const el = document.getElementById(`${ctx.baseId}-tab-${next}`);
      el?.focus();
    });
  };

  const onIndicatorAnimationEnd = () => {
    if (!ctx.autoplay) return;
    const next = (__index + 1) % ctx.count;
    ctx.setActiveIndex(next);
  };

  return (
    <button
      type="button"
      id={tabId}
      role="tab"
      data-mw-tabs-tab=""
      data-active={isActive ? "true" : "false"}
      data-orientation={ctx.orientation}
      data-appearance={ctx.appearance}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      onClick={() => ctx.setActiveIndex(__index)}
      onKeyDown={onKeyDown}
    >
      <span>{children}</span>
      {isActive && ctx.appearance !== "pill" ? (
        <span
          key={`indicator-${ctx.generation}`}
          data-mw-tabs-indicator=""
          data-orientation={ctx.orientation}
          data-autoplay={ctx.autoplay ? "true" : "false"}
          style={
            ctx.autoplay
              ? ({
                  animationDuration: `${ctx.autoplayInterval}ms`,
                  animationPlayState: ctx.paused ? "paused" : "running",
                } as CSSProperties)
              : undefined
          }
          onAnimationEnd={onIndicatorAnimationEnd}
        />
      ) : null}
    </button>
  );
}

export interface TabsPanelProps {
  __index?: number;
  children: ReactNode;
}

export function TabsPanel({ __index = 0, children }: TabsPanelProps) {
  const ctx = useTabsContext("Tabs.Panel");
  const isActive = ctx.activeIndex === __index;
  const tabId = `${ctx.baseId}-tab-${__index}`;
  const panelId = `${ctx.baseId}-panel-${__index}`;

  // An inactive panel is parked with the `hidden` attribute (display:none): it costs no layout,
  // no paint and no animation while parked. display:none also RESETS every CSS animation in the
  // subtree, so a panel's content used to re-play its whole entrance (a Reveal blur-fade of over a
  // second on the HQ drill-in) every time its tab was re-selected, which read as the panel
  // failing to render. The first cut of the fix (v6.29.1, 23 Sep 2026) kept every panel rendered
  // and parked it by CSS instead; that put six panels' worth of blur-filter entrances on the
  // compositor at mount, and in a real GPU browser the tab strip itself dropped out of the paint
  // for seconds at a time (reproduced in Edge on the drill-in). So the panel stays display:none
  // and REMEMBERS having been shown: once it has been active and then parked, it carries
  // data-played, and the entrance family (Reveal beats) inside it does not animate again. The
  // first showing plays in full; every later one shows settled content under the short panel
  // fade. Tracked as state adjusted during render (React's "storing information from previous
  // renders" shape), never in an effect.
  const [prevActive, setPrevActive] = useState(isActive);
  const [played, setPlayed] = useState(false);
  if (prevActive !== isActive) {
    setPrevActive(isActive);
    if (prevActive && !isActive) setPlayed(true);
  }

  return (
    <div
      id={panelId}
      role="tabpanel"
      data-mw-tabs-panel=""
      data-active={isActive ? "true" : "false"}
      data-played={played ? "true" : undefined}
      aria-labelledby={tabId}
      hidden={!isActive}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

const tabsCss = `
[data-mw-tabs-list][data-orientation="horizontal"] {
  display: flex;
  gap: var(--space-lg);
  border-bottom: 1px solid var(--border-positive-primary);
  margin-bottom: var(--space-lg);
  /* A long tab set scrolls in place on narrow viewports instead of widening
     the page (the five-tab doc pages measured 426px at a 360px viewport). */
  overflow-x: auto;
  scrollbar-width: none;
}
[data-mw-tabs-list][data-orientation="horizontal"]::-webkit-scrollbar {
  display: none;
}
[data-mw-tabs-tab][data-orientation="horizontal"] {
  white-space: nowrap;
  flex-shrink: 0;
}
/* S-11, sanctioned at D35 (27 Aug 2026). 12rem is a WRAP THRESHOLD for the rail: the
   narrowest a vertical tab label column can be before labels wrap and stop reading as a
   list. A content decision, so it stays off the spacing dial (the Footer 12rem precedent).
   Repeated on the autoplay strip below for the same reason. */
[data-mw-tabs-list][data-orientation="vertical"] {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  border-right: 1px solid var(--border-positive-primary);
  padding-right: var(--space-lg);
  min-width: 12rem;
}

/* The autoplay strip. Only rendered with autoplay, so nothing here touches a
   static tab set. It takes over the list's rule so the line runs under the
   pause control too, and the list gives its own up. */
[data-mw-tabs-strip][data-orientation="horizontal"] {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  border-bottom: 1px solid var(--border-positive-primary);
  margin-bottom: var(--space-lg);
}
[data-mw-tabs-strip][data-orientation="horizontal"] > [data-mw-tabs-list] {
  flex: 1;
  min-width: 0;
  border-bottom: 0;
  margin-bottom: 0;
}
[data-mw-tabs-strip][data-orientation="vertical"] {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
  border-right: 1px solid var(--border-positive-primary);
  padding-right: var(--space-lg);
  min-width: 12rem;
}
[data-mw-tabs-strip][data-orientation="vertical"] > [data-mw-tabs-list] {
  align-self: stretch;
  border-right: 0;
  padding-right: 0;
  min-width: 0;
}
[data-mw-tabs-strip][data-orientation="vertical"] > [data-mw-tabs-toggle] {
  /* Sits on the tab text's left edge (the vertical tab's inline padding). */
  margin-left: var(--space-md);
}
/* The pause control. WCAG 2.2.2 wants a MECHANISM; hover and focus are not one.
   Carousel's toggle dress (a --target-min round carrying the 10px glyph), on the
   frost vocabulary Carousel uses for its rail and dots: this one sits on a plain
   surface rather than over an image, where a background-tinted frost vanishes. */
[data-mw-tabs-toggle] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--target-min);
  height: var(--target-min);
  padding: 0;
  border: 0;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--text-positive-primary);
  /* The two wash tiers are tokens now (owner decision D31): --background-control-wash is the
     10% REST ground a 10px glyph needs, --background-hover-wash-strong the 18% step above it.
     Identical values to the literals they replace, at :root and on a band alike. The band part
     is not free: the literal was a color-mix of --text-positive-primary resolved HERE, so it
     followed an inverted or accent band, and a token declared only at :root would have frozen
     at the root ink. Both tokens are re-declared in the band blocks of tokens.css for that
     reason, so do not assume a wash token follows a band unless its block says so. */
  background: var(--background-control-wash);
  transition: background var(--motion-transition);
}
[data-mw-tabs-toggle]:hover {
  background: var(--background-hover-wash-strong);
}
[data-mw-tabs-toggle]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}

[data-mw-tabs-tab] {
  position: relative;
  background: none;
  border: 0;
  cursor: pointer;
  /* DECLARED, NOT INHERITED (the leading-pins census, 2 Sep 2026). The other half of
     AUD-2's "fold in or sanction" on the Tabs/TabLinks labels: a single-line label in
     a row of siblings, so it takes the control leading. */
  line-height: var(--leading-tight);
  font-family: var(--font-code);
  font-size: var(--type-sm);
  letter-spacing: var(--tracking-wide);
  color: var(--text-positive-tertiary);
  padding: var(--space-sm) 0;
  transition: color var(--motion-transition);
}
[data-mw-tabs-tab][data-orientation="vertical"] {
  text-align: left;
  padding: var(--space-sm) var(--space-md);
}
[data-mw-tabs-tab]:hover {
  color: var(--text-positive-primary);
}
[data-mw-tabs-tab][data-active="true"] {
  color: var(--accent-ink);
  font-weight: var(--weight-semibold);
}
/* PILL (v6.31.0; the track removed in v6.34.0): the tabs sit on the ground as words in the body
   face at the sm rung, secondary ink, and the active tab lifts onto the primary surface in the
   primary ink at the semibold weight; no rule, no indicator, and NO TRACK. The grey track is the
   SegmentedControl's (a view of one dataset); a strip of pages carries none, so a page's tabs and
   a panel's view switch never read as two navs of the same weight (the owner, on the HQ fleet:
   "two oddly placed navs instead of a tab / control nested system"; the boards draw it this way).
   The list scrolls in place on a narrow viewport. */
[data-mw-tabs][data-appearance="pill"] [data-mw-tabs-list][data-orientation="horizontal"] {
  display: inline-flex;
  /* v6.33.0: the strip never runs wider than its column; it scrolls in place, as the underline
     strip does (at 390 six tabs overflowed the page and the whole screen scrolled sideways). */
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  gap: var(--space-2xs);
  padding: 0;
  border-bottom: 0;
}
[data-mw-tabs][data-appearance="pill"] [data-mw-tabs-list][data-orientation="vertical"] {
  gap: var(--space-2xs);
  padding: 0;
  border-right: 0;
}
[data-mw-tabs-tab][data-appearance="pill"] {
  font-family: var(--font-body);
  font-size: var(--type-sm);
  letter-spacing: normal;
  color: var(--text-positive-secondary);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--component-radius);
  transition: color var(--motion-transition), background var(--motion-transition);
}
[data-mw-tabs-tab][data-appearance="pill"]:hover:not([data-active="true"]) {
  color: var(--text-positive-primary);
  background: var(--background-hover-wash);
}
[data-mw-tabs-tab][data-appearance="pill"][data-active="true"] {
  color: var(--text-positive-primary);
  font-weight: var(--weight-semibold);
  background: var(--background-positive-primary);
}
[data-mw-tabs-tab]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
  border-radius: var(--component-radius);
}

[data-mw-tabs-indicator] {
  position: absolute;
  background: var(--accent-base);
  transform-origin: left center;
}
[data-mw-tabs-indicator][data-orientation="horizontal"] {
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
}
[data-mw-tabs-indicator][data-orientation="vertical"] {
  left: -1px;
  top: 0;
  bottom: 0;
  width: 2px;
  transform-origin: center top;
}
[data-mw-tabs-indicator][data-autoplay="false"][data-orientation="horizontal"] {
  transform: scaleX(1);
  animation: mw-tabs-fill-x var(--motion-duration) var(--motion-ease);
}
[data-mw-tabs-indicator][data-autoplay="false"][data-orientation="vertical"] {
  transform: scaleY(1);
  animation: mw-tabs-fill-y var(--motion-duration) var(--motion-ease);
}
[data-mw-tabs-indicator][data-autoplay="true"][data-orientation="horizontal"] {
  animation-name: mw-tabs-fill-x;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
[data-mw-tabs-indicator][data-autoplay="true"][data-orientation="vertical"] {
  animation-name: mw-tabs-fill-y;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes mw-tabs-fill-x {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
@keyframes mw-tabs-fill-y {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}

/* A panel that has been shown and parked once (data-played, see TabsPanel) does not re-play the
   mount-time entrance family when it is shown again: display:none reset those animations, and
   the re-play read as the panel failing to render. Only the Reveal beats are named; anything
   else that animates inside a panel (a meter, a spinner) keeps its own behaviour. */
[data-mw-tabs-panel][data-played="true"] [data-mw-reveal-beat] {
  animation: none;
}
[data-mw-tabs-panel][data-active="true"] {
  animation: mw-tabs-panel-fade var(--motion-duration) var(--motion-ease);
}
@keyframes mw-tabs-panel-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* LOAD-BEARING: killing the indicator animation also stops autoplay, because
   onAnimationEnd is autoplay's only advance mechanism. That is intentional
   (no auto-rotation for motion-sensitive users), not a bug (audit F23). */
@media (prefers-reduced-motion: reduce) {
  /* Three attribute selectors, on purpose: the autoplay rules above carry three,
     so a bare [data-mw-tabs-indicator] here lost on animation-name and the fill
     kept running. Under the global reduced-motion duration clamp it then ended in
     0.01ms, animationend fired on every remount, and one click on a tab became a
     runaway rotation (caught 27 Aug 2026 while adding the pause control). */
  [data-mw-tabs-indicator][data-autoplay][data-orientation],
  [data-mw-tabs-panel][data-active="true"] {
    animation: none;
  }
  /* No rotation here (above), so no control to stop it: the same block removes
     both, as Carousel hides its toggle when its clock never starts. */
  [data-mw-tabs-toggle] {
    display: none;
  }
}
`;

// Tabs and its sub-parts are exported as separate named exports above.
// Compound-style access (Tabs.List, Tabs.Tab) is not used because static
// properties on a "use client" function do not cross the server/client
// module boundary in Next.js App Router — accessing Tabs.List from a server
// component yields undefined. Named exports work in both contexts.

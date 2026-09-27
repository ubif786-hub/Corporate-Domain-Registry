import { CSSProperties, ReactNode } from "react";

/* ============================================================
   Marquee — scrolling band that loops infinitely, horizontal or
   vertical. Pure CSS animation, no JavaScript scroll. Children render
   twice; the track translates 0 to -50% along its axis, looping
   seamlessly because the track is exactly two copies long.

   Horizontal: a flex row at width:max-content, translateX, horizontal
   edge-fade mask. Vertical: a flex column at height:max-content inside
   a fixed-height container, translateY, vertical edge-fade mask.

   The pause control (WCAG 2.2.2) renders in flow AFTER the strip, never on
   top of it (AUD-4, 4 Sep 2026): the root is a flex row/column laying the
   band and the control side by side, dressed like Tabs.tsx's autoplay
   toggle so both pause controls read as one system control.

   Server component. Edge fade uses mask-image so content fades at the
   edges rather than hard-cutting against the page background.
   prefers-reduced-motion pauses the animation entirely.
   ============================================================ */

type MarqueeSpeed = "glacial" | "slow" | "normal" | "fast";
type MarqueeOrientation = "horizontal" | "vertical";
type MarqueeDirection = "left" | "right" | "up" | "down";
type MarqueeGap = "sm" | "md" | "lg" | "xl";

export interface MarqueeProps {
  children: ReactNode;
  direction?: MarqueeDirection;
  orientation?: MarqueeOrientation;
  // Outer container height. Only meaningful for vertical, which needs a bounded
  // viewport to scroll within; ignored for horizontal.
  height?: string;
  edgeFade?: boolean;
  gap?: MarqueeGap;
  pauseOnHover?: boolean;
  speed?: MarqueeSpeed;
  /** Seconds for one full loop, overriding `speed`. `speed` names a DURATION, so perceived speed is
   *  track width over duration and the same preset runs fast on a long track and crawls on a
   *  short one: ninety-nine names in one row moved at about 150px a second at "glacial" (aicf,
   *  21 Sep 2026). When the content's length is known, say how long a loop should take: track
   *  width in px divided by the px per second you want (35 to 50 reads as text; a logo strip
   *  tolerates more). A number, in seconds, so it cannot be handed a colour or a rem by mistake. */
  duration?: number;
  /** Accessible name of the pause control. Default "Pause scrolling".
   *  A prop because it is user-facing text and a site in another language
   *  should not announce an English one. */
  pauseLabel?: string;
}

const speedMap: Record<MarqueeSpeed, string> = {
  // glacial: an extra-slow preset for large display ribbons. Perceived speed is
  // track width / duration, so a wide ribbon of big type reads fast at "slow";
  // glacial keeps it calm.
  glacial: "80s",
  slow: "60s",
  normal: "40s",
  fast: "25s",
};

const gapMap: Record<MarqueeGap, string> = {
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
};

const marqueeCss = `
/* AUD-4 (4 Sep 2026): the pause control used to sit position:absolute over
   the strip, so it read as a stray glyph on top of the marquee text rather
   than a control. It now takes its own place in flow, after the strip (the
   Tabs.tsx pattern: the autoplay toggle renders as a sibling AFTER the
   tablist, never on top of it), so the root is the flex row (horizontal) or
   column (vertical) that lays the band and the control out side by side
   instead of only a positioning context for an overlay. */
[data-mw-marquee-root] {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
[data-mw-marquee-root][data-orientation="horizontal"] { width: 100%; }
[data-mw-marquee-root][data-orientation="vertical"] {
  width: max-content;
  max-width: 100%;
  flex-direction: column;
}
[data-mw-marquee] {
  position: relative;
  min-width: 0;
}
/* Clip only the scroll axis; leave the cross axis visible so tall content (large
   display type, descenders, ascenders) is never sheared. Using clip rather than
   hidden on the scroll axis avoids the visible -> auto coercion, so the cross
   axis stays truly visible with no stray scrollbar. flex: 1 1 0 (rather than a
   fixed 100%) is what leaves room for the pause control beside/after the strip
   instead of the control overlapping it. */
[data-mw-marquee][data-orientation="horizontal"] {
  flex: 1 1 0%;
  overflow-x: clip;
  overflow-y: visible;
}
[data-mw-marquee][data-orientation="vertical"] {
  flex: 1 1 0%;
  min-height: 0;
  width: max-content;
  max-width: 100%;
  overflow-x: visible;
  overflow-y: clip;
}
[data-mw-marquee][data-edge-fade="true"][data-orientation="horizontal"] {
  -webkit-mask-image: linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%);
}
[data-mw-marquee][data-edge-fade="true"][data-orientation="vertical"] {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 10%, black 90%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, black 10%, black 90%, transparent 100%);
}
[data-mw-marquee-track] {
  display: flex;
  gap: var(--mw-marquee-gap, var(--space-lg));
  animation-duration: var(--mw-marquee-duration, 40s);
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}
[data-mw-marquee-track][data-orientation="horizontal"] {
  flex-direction: row;
  width: max-content;
}
[data-mw-marquee-track][data-orientation="vertical"] {
  flex-direction: column;
  height: max-content;
}
[data-mw-marquee-track][data-direction="left"]  { animation-name: mw-marquee-left; }
[data-mw-marquee-track][data-direction="right"] { animation-name: mw-marquee-right; }
[data-mw-marquee-track][data-direction="up"]    { animation-name: mw-marquee-up; }
[data-mw-marquee-track][data-direction="down"]  { animation-name: mw-marquee-down; }
/* :focus-within joins :hover so keyboard users can stop the motion by tabbing
   in — moving content with no keyboard pause fails WCAG 2.2.2 the moment a
   consumer puts a link inside (audit). */
[data-mw-marquee][data-pause-on-hover="true"]:hover [data-mw-marquee-track],
[data-mw-marquee][data-pause-on-hover="true"]:focus-within [data-mw-marquee-track] {
  animation-play-state: paused;
}
/* Loop period root-cause fix. The track is two copies laid out with a uniform
   flex gap, so the distance from copy 1's item-k to copy 2's item-k is
   (one copy width + one gap) = 50% of the track PLUS half a gap. Translating a
   flat -50% therefore stops half a gap short and the loop visibly jumps. Adding
   gap/2 to the travel lands copy 2 exactly where copy 1 began — seamless. */
@keyframes mw-marquee-left {
  from { transform: translateX(0); }
  to   { transform: translateX(calc(-50% - var(--mw-marquee-gap, var(--space-lg)) / 2)); }
}
@keyframes mw-marquee-right {
  from { transform: translateX(calc(-50% - var(--mw-marquee-gap, var(--space-lg)) / 2)); }
  to   { transform: translateX(0); }
}
@keyframes mw-marquee-up {
  from { transform: translateY(0); }
  to   { transform: translateY(calc(-50% - var(--mw-marquee-gap, var(--space-lg)) / 2)); }
}
@keyframes mw-marquee-down {
  from { transform: translateY(calc(-50% - var(--mw-marquee-gap, var(--space-lg)) / 2)); }
  to   { transform: translateY(0); }
}
/* The latching pause. :has() lets the checkbox stop the track without JS. */
[data-mw-marquee]:has([data-mw-marquee-pause]:checked) [data-mw-marquee-track] {
  animation-play-state: paused;
}
/* Its own place beside/after the strip, not an overlay: same dress as
   Tabs.tsx's [data-mw-tabs-toggle] (a --target-min round on the house wash
   tokens) so the two pause controls read as one control across the system,
   rather than Marquee inventing a translucent-chip treatment of its own. */
[data-mw-marquee-pause-control] {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--target-min);
  height: var(--target-min);
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--text-positive-primary);
  background: var(--background-control-wash);
  transition: background var(--motion-transition);
}
[data-mw-marquee-pause-control]:hover {
  background: var(--background-hover-wash-strong);
}
/* The input is the control; it is hidden visually but stays focusable, so the
   focus ring is drawn on the label around it. */
[data-mw-marquee-pause] {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  margin: 0;
  pointer-events: none;
}
[data-mw-marquee-pause-control]:has([data-mw-marquee-pause]:focus-visible) {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
[data-mw-marquee-pause-glyph] { display: inline-flex; }
/* Two glyphs in one svg: show the bars while running, the triangle while paused. */
[data-play-tri] { display: none; }
[data-mw-marquee-pause-control]:has([data-mw-marquee-pause]:checked) [data-pause-bar] { display: none; }
[data-mw-marquee-pause-control]:has([data-mw-marquee-pause]:checked) [data-play-tri] { display: inline; }
/* The label text names the control for assistive tech without showing. */
[data-mw-marquee-pause-text] {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
@media (prefers-reduced-motion: reduce) {
  /* The track is already still, so a pause control would do nothing. */
  [data-mw-marquee-pause-control] { display: none; }
  [data-mw-marquee-track] {
    animation: none;
  }
}
`;

export function Marquee({
  children,
  direction = "left",
  orientation = "horizontal",
  height = "20rem",
  edgeFade = true,
  gap = "lg",
  pauseOnHover = true,
  speed = "normal",
  duration,
  pauseLabel = "Pause scrolling",
}: MarqueeProps) {
  // Coerce a mismatched direction/orientation pair to a sensible default so a
  // vertical marquee never inherits a horizontal "left" and vice versa.
  const resolvedDirection: MarqueeDirection =
    orientation === "vertical" && (direction === "left" || direction === "right")
      ? "up"
      : orientation === "horizontal" && (direction === "up" || direction === "down")
        ? "left"
        : direction;

  const trackStyle: CSSProperties = {
    // A positive, finite `duration` wins; anything else falls back to the named preset, so a bad
    // number can never produce a marquee that does not move or that strobes.
    "--mw-marquee-duration": typeof duration === "number" && Number.isFinite(duration) && duration > 0 ? `${duration}s` : speedMap[speed],
    "--mw-marquee-gap": gapMap[gap],
  };

  const containerStyle: CSSProperties =
    orientation === "vertical" ? { height } : {};

  return (
    <div data-mw-marquee-root="" data-orientation={orientation} style={containerStyle}>
      <style href="magentaweb-marquee" precedence="default">{marqueeCss}</style>
      <div
        data-mw-marquee=""
        data-orientation={orientation}
        data-edge-fade={edgeFade ? "true" : "false"}
        data-pause-on-hover={pauseOnHover ? "true" : "false"}
      >
      <div
        data-mw-marquee-track=""
        data-orientation={orientation}
        data-direction={resolvedDirection}
        style={trackStyle}
      >
        {children}
        {/* The duplicate is hidden from assistive tech AND from the tab order.
            aria-hidden alone left any focusable child (a link, a button) present
            twice in the tab order while invisible to a screen reader, so a
            keyboard user tabbed into a control that AT could not describe and
            that scrolled away under them. `inert` is what actually removes it. */}
        <div aria-hidden="true" inert style={duplicateStyle}>
          {children}
        </div>
        </div>
      </div>
      {/* WCAG 2.2.2 Pause, Stop, Hide (Level A). This band scrolls forever, which
          is exactly what the criterion is about, and until 25 Aug 2026 the only
          way to stop it was to hold a pointer over it or to have something
          focusable inside for :focus-within to catch. Neither is a "mechanism":
          hover cannot be held on a touch screen at all, and the canonical marquee
          content (logos, a line of text) has nothing focusable in it, so a
          keyboard-only visitor had no way to stop it whatsoever. The docs claimed
          otherwise, which is how it survived.

          It is a CHECKBOX and CSS, not React state, so Marquee stays a server
          component and the control keeps working with no JavaScript at all. The
          checked state IS the paused state, which is what a checkbox is for; a
          screen reader announces "Pause scrolling, checked". */}
      <label data-mw-marquee-pause-control="">
        <input type="checkbox" data-mw-marquee-pause="" />
        <span data-mw-marquee-pause-glyph="" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" focusable="false">
            <rect data-pause-bar="" x="1" y="1" width="3" height="8" />
            <rect data-pause-bar="" x="6" y="1" width="3" height="8" />
            <path data-play-tri="" d="M2 1l7 4-7 4z" />
          </svg>
        </span>
        <span data-mw-marquee-pause-text="">{pauseLabel}</span>
      </label>
    </div>
  );
}

// display: contents removes the wrapper from the flex layout so the
// duplicated children participate as direct flex items of the track.
// The wrapper exists solely to attach aria-hidden to the second set.
const duplicateStyle: CSSProperties = {
  display: "contents",
};

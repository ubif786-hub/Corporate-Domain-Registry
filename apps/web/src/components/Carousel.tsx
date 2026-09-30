"use client";

import { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// The reduced-motion preference as an external store: subscribe to the media
// query so a mid-session OS toggle stops or resumes the autoplay live, instead
// of the stale mount-time snapshot the old effect kept.
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void): () => void {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// Focus ON the pause control is not a pause input (the Tabs rule): the control
// neither moves nor hides on an advance, and a mouse click on Play leaves focus
// there, so counting it held the clock paused until a blur (B4, 27 Aug 2026).
const isToggle = (el: EventTarget | null): boolean =>
  el instanceof Element && el.hasAttribute("data-mw-carousel-toggle");

/* ============================================================
   Carousel — a quiet image slideshow: autoplay crossfade, no arrows, a thin
   frosted progress bar on the left that fills over each slide's duration and
   resets on switch, and frosted nav dots (active = accent, with a surface ring
   so it reads on any image). Manual dot nav restarts the autoplay clock so the
   bar stays in sync. A latching pause control sits with the dots (WCAG 2.2.2
   Pause, Stop, Hide, Level A); hover and focus also pause the clock, but only as
   a courtesy, because neither is a "mechanism" in the sense the criterion means.
   Respects prefers-reduced-motion (no autoplay, no crossfade).

   Brand-agnostic: the images come from `slides`, and any decorative overlay (a
   FrostedEmblem, a wordmark, nothing) is passed as `emblem` and positions
   itself. The frost vocabulary rides --text-positive-primary, so the bar and
   dots mirror light/dark for free.
   ============================================================ */

export interface CarouselSlide {
  src: string;
  alt?: string;
}

export interface CarouselProps {
  slides: CarouselSlide[];
  /** Autoplay interval in ms; 0 disables autoplay. Default 5200. */
  interval?: number;
  /** Aspect ratio of the frame. Default "16 / 9". */
  aspect?: string;
  /** A decorative overlay (e.g. a FrostedEmblem); it positions itself. */
  emblem?: ReactNode;
  /** Show the left progress bar (only meaningful with autoplay). Default true. */
  progress?: boolean;
  /** Accessible name of the slideshow group. Default "Slideshow" (pass 3, 27 Aug 2026;
   *  PhotoStrip defaults to "Photos" the same way): the frame carries role="group" with
   *  aria-roledescription="carousel", and a roledescription needs a named host or
   *  assistive tech skips the group and its boundaries with it. A page with two
   *  slideshows should name each ("Studio reel", "Case studies"). A prop, not a
   *  literal, like pauseLabel: user-facing text a site in another language overrides. */
  ariaLabel?: string;
  /** Accessible name of the pause control while it is playing. Default "Pause slideshow".
   *  A prop, not a literal: it is user-facing text, and a site in another language
   *  should not announce an English one. */
  pauseLabel?: string;
  /** Accessible name of the same control while it is paused. Default "Play slideshow". */
  playLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function Carousel({
  slides,
  interval = 5200,
  aspect = "16 / 9",
  emblem,
  progress = true,
  ariaLabel = "Slideshow",
  pauseLabel = "Pause slideshow",
  playLabel = "Play slideshow",
  className,
  style,
}: CarouselProps) {
  const [active, setActive] = useState(0);
  // Server snapshot false: motion-safe markup, corrected before paint on a
  // reduced-motion machine by the store's client snapshot.
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
  const timer = useRef<number | null>(null);
  const autoplay = interval > 0 && slides.length > 1;
  // Hover and focus-within pause the clock as a COURTESY, so the thing you are
  // reaching for stops moving. They are NOT the accessibility mechanism, and
  // this file used to claim they were: WCAG 2.2.2 asks for a way for the user to
  // pause, and neither hover nor focus is one. Hover cannot be held by someone
  // using a touch screen at all, and focus-within only helps if something inside
  // is focusable. The real mechanism is the toggle below, which LATCHES. Focus
  // on that toggle itself is excluded from focus-within (see isToggle).
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [playing, setPlaying] = useState(true);
  const paused = hovered || focusWithin || !playing;

  const start = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    if (reduced || !autoplay || paused) return;
    timer.current = window.setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, interval);
  }, [reduced, autoplay, paused, interval, slides.length]);

  useEffect(() => {
    start();
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [start]);

  const go = (i: number) => {
    setActive(i);
    start();
  };

  const showProgress = progress && autoplay;

  return (
    <div
      data-mw-carousel=""
      className={className}
      style={{ ...style, aspectRatio: aspect } as CSSProperties}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={(e) => setFocusWithin(!isToggle(e.target))}
      onBlur={(e) => {
        const next = e.relatedTarget;
        setFocusWithin(next !== null && e.currentTarget.contains(next) && !isToggle(next));
      }}
    >
      <style href="magentaweb-carousel" precedence="default">{carouselCss}</style>
      {/* Only the active slide is exposed to the accessibility tree. Inactive
          slides sit at opacity 0 and take no interaction, so hiding them stops
          a screen reader from announcing every slide's alt at once. A slide
          with no alt stays hidden even while active (decorative). */}
      {slides.map((s, i) => (
        <img
          key={s.src}
          data-mw-carousel-slide=""
          data-active={i === active ? "true" : "false"}
          src={s.src}
          alt={s.alt ?? ""}
          aria-hidden={i !== active || !s.alt ? "true" : undefined}
          draggable={false}
        />
      ))}
      {emblem}
      {showProgress ? (
        <div data-mw-carousel-progress="" aria-hidden="true">
          {/* The fill remounts on pause flips and holds paused at zero, so on
              resume the rail and the restarted clock begin together instead of
              the rail finishing early against a fresh interval. */}
          <div
            key={`${active}-${paused ? "paused" : "running"}`}
            data-mw-carousel-progress-fill=""
            style={{ animationDuration: `${interval}ms`, animationPlayState: paused ? "paused" : "running" }}
          />
        </div>
      ) : null}
      {/* Plain buttons with aria-current, the Pagination current-marking idiom.
          The old role=tablist/tab pair promised structure that never existed
          (no aria-controls, no tabpanels), which reads worse to assistive
          technology than making no tabs claim at all. */}
      {slides.length > 1 ? (
        <div data-mw-carousel-dots="">
          {slides.map((s, i) => (
            <button
              key={s.src}
              data-mw-carousel-dot=""
              data-active={i === active ? "true" : "false"}
              type="button"
              aria-current={i === active ? "true" : undefined}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
            />
          ))}
          {/* WCAG 2.2.2 Pause, Stop, Hide (Level A): the mechanism. Rendered only
              when there is actually a clock to stop, so a carousel with autoplay
              disabled does not grow a control that does nothing. */}
          {autoplay && !reduced ? (
            <button
              data-mw-carousel-toggle=""
              type="button"
              aria-label={playing ? pauseLabel : playLabel}
              onClick={() => setPlaying((p) => !p)}
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const carouselCss = `
[data-mw-carousel] {
  position: relative;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--border-positive-primary);
  background: var(--background-positive-secondary);
}
[data-mw-carousel-slide] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  /* Ambient carve-out: the crossfade keeps its own length at data-motion="still"
     (like Marquee); PRM collapses it below. Recorded in REFACTOR_QUEUE Known
     design choices. */
  transition: opacity 1200ms var(--motion-ease, ease);
}
[data-mw-carousel-slide][data-active="true"] { opacity: 1; }
/* The slide progress bar: a thin frosted line on the left (ink/ivory mirror).

   The 10 / 24 / 30 / 46% dot-and-rail percentages here are a SCALE (rail, rail hover, dot,
   dot hover, one ramp), not the two named tiers --background-control-wash and
   --background-hover-wash-strong. Owner decision D31 sanctions them as literals, so do not
   migrate them onto those names. They are also written inline on purpose: an inline
   color-mix of --text-positive-primary resolves HERE and so follows a band remap, which a
   token declared only at :root does not. */
[data-mw-carousel-progress] {
  position: absolute;
  left: var(--space-md);
  top: var(--space-md);
  bottom: var(--space-md);
  width: 3px;
  border-radius: var(--radius-full);
  overflow: hidden;
  background: color-mix(in srgb, var(--text-positive-primary) 10%, transparent);
  pointer-events: none;
}
[data-mw-carousel-progress-fill] {
  width: 100%;
  height: 0;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--text-positive-primary) 24%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  animation-name: mw-carousel-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
@keyframes mw-carousel-progress { from { height: 0; } to { height: 100%; } }
[data-mw-carousel-dots] {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--space-md);
  display: flex;
  /* gap 0: each dot button IS 24px, so flush buttons put the painted dots
     exactly 24px apart, which is what WCAG 2.5.8 measures. A gap here would
     only add to an already-conformant pitch. */
  gap: 0;
  justify-content: center;
}
/* The pause control keeps its own breathing room from the last dot. */
[data-mw-carousel-toggle] { margin-left: var(--space-xs); }
/* The dot is 9px of PAINT inside a real 24px TARGET.
   It used to be a 9x9 button with an 8px gap: 17px centre to centre, which fails
   WCAG 2.5.8 target size (AA, 24x24) and cannot claim the spacing exception
   either, because that is measured centre-to-centre as well.
   The dot itself stays 9px, drawn as a ::before, so the design is unchanged.
   What DOES change is the pitch: the row gap goes to 0 and the 24px buttons sit
   flush, putting the painted dots 24px apart instead of 17px.
   That spread is not optional and it is not cosmetic. A first attempt kept the
   old 17px rhythm by pulling the 24px boxes together with negative margins, and
   that silently does nothing: hit areas cannot overlap, so boxes whose centres
   are 17px apart still resolve to ~17px of clickable area each and the extra
   size is a lie you can measure in the inspector but not tap. Meeting 2.5.8
   here REQUIRES the dots to physically move apart. */
[data-mw-carousel-dot] {
  position: relative;
  width: 24px;
  height: 24px;
  border: 0;
  padding: 0;
  background: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}
[data-mw-carousel-dot]::before {
  content: "";
  position: absolute;
  inset: 50% auto auto 50%;
  translate: -50% -50%;
  width: 9px;
  height: 9px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--text-positive-primary) 30%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: background var(--motion-transition), transform var(--motion-transition), box-shadow var(--motion-transition);
}
[data-mw-carousel-dot]:hover::before { background: color-mix(in srgb, var(--text-positive-primary) 46%, transparent); }
/* The pause control. WCAG 2.2.2 wants a MECHANISM; hover and focus are not one. */
[data-mw-carousel-toggle] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--text-positive-primary);
  background: color-mix(in srgb, var(--background-positive-primary) 62%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  transition: background var(--motion-transition);
}
[data-mw-carousel-toggle]:hover { background: color-mix(in srgb, var(--background-positive-primary) 86%, transparent); }
[data-mw-carousel-dot]:focus-visible,
[data-mw-carousel-toggle]:focus-visible { outline: var(--focus-outline); outline-offset: 2px; }
/* Moves with the paint: the dot is drawn by ::before now, so the active
   treatment has to live there too or it fills the whole 24px target. */
[data-mw-carousel-dot][data-active="true"]::before {
  background: var(--accent-base);
  transform: scale(1.15);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--background-positive-primary) 62%, transparent);
}
@media (prefers-reduced-motion: reduce) {
  [data-mw-carousel-slide] { transition: none; }
  [data-mw-carousel-progress-fill] { animation: none; height: 100%; }
}
`;

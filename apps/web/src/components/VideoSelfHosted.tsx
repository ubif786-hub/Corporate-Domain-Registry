"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";

/* ============================================================
   SelfHostedVideo — the client-only branch of Video. Renders a
   native <video> with a custom play button overlay before first
   playback. The overlay is an 80px circle filled with --accent-base
   centered on the frame; clicking it starts playback and the
   overlay hides forever (we don't re-show on subsequent pauses
   because the native controls handle that gracefully). Native
   controls remain visible after first play; only the very first
   start of the clip gets the branded play moment.

   First-play handoff is a three-phase machine: "visible" → "fading"
   → "gone". On the first play the overlay does not snap out; it fades
   its opacity to 0 over --motion-duration (so the motion dial governs
   the feel) while flipping pointer-events off immediately so the
   native controls underneath take over with zero overlap. When the
   opacity transition ends the overlay unmounts entirely — it is
   removed from the DOM, not left hidden, so there is no chance of a
   stale second control surface. A timeout backstops the unmount in
   case transitionend never fires (still/reduced motion = 0ms).

   Autoplay short-circuits the overlay (phase starts "gone") since the
   clip starts immediately.

   controls={false} WITHOUT autoplay (pass 3, 27 Aug 2026): the disc is
   the only start affordance and, once the clip runs, there are no
   native controls and a <video> without them is not even focusable,
   so nothing could stop, pause, or restart it (with `loop`, forever).
   In that pairing the overlay never unmounts: it becomes a play/pause
   TOGGLE (aria-pressed) covering the frame. While the clip plays it
   fades out but stays live, so a click anywhere on the clip (or Enter
   on the focused button) pauses it, and it reappears on hover or
   keyboard focus and whenever the clip pauses or ends. A short
   decorative clip that ends on its own keeps its intended feel; a
   long or looping one gains the control surface it was missing.
   autoplay + controls={false} (the decorative loop) is unchanged: no
   overlay at all, as before.

   Captions: `tracks` renders WebVTT <track> children inside the
   <video>. The native control surface is the only way to switch a
   track on, so a non-empty `tracks` coerces `controls` on (it still
   waits for first play, like every other self-hosted clip), and a
   track marked `default` shows without any user action. An absolute
   track URL puts the element in CORS mode (crossOrigin="anonymous"),
   which the browser requires before it loads a cross-origin track.
   ============================================================ */

/**
 * One WebVTT text track for a self-hosted clip. Rendered as a <track> child of
 * the <video>; the browser lists it in its captions menu by `label`.
 */
export interface VideoTrack {
  /** URL of the WebVTT file. An absolute URL is treated as cross-origin. */
  src: string;
  /** BCP 47 language tag of the track text, for example "en" or "de-CH". */
  srcLang: string;
  /** Name shown in the browser captions menu. */
  label: string;
  /** Track kind. Defaults to "captions". */
  kind?: "captions" | "subtitles" | "descriptions";
  /**
   * Show this track without user action. Give it to one track at most: when
   * several carry it, browsers enable only the first.
   */
  default?: boolean;
}

export interface SelfHostedVideoProps {
  src: string;
  poster?: string;
  /**
   * Native controls after first play. With controls={false} and no autoplay the
   * branded play disc stays mounted as a play/pause toggle instead, so the clip
   * it starts can also be stopped; with autoplay as well, no overlay renders.
   */
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  title?: string;
  /**
   * WebVTT text tracks rendered as <track> children of the <video>. Captions
   * are only reachable through the native control surface, so a non-empty
   * list coerces `controls` on, overriding controls={false}; a track with
   * `default` shows without user action. An absolute track URL sets
   * crossOrigin="anonymous" on the <video>, which puts the video file itself
   * in CORS mode: a cross-origin video host must then send
   * Access-Control-Allow-Origin or the clip fails to load.
   */
  tracks?: VideoTrack[];
}

export function SelfHostedVideo({
  src,
  poster,
  controls = true,
  autoplay = false,
  loop = false,
  muted = false,
  title,
  tracks,
}: SelfHostedVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackList = tracks ?? [];
  // Captions live behind the native controls, so tracks force the control
  // surface on even for a consumer that asked for controls={false}.
  const effectiveControls = controls || trackList.length > 0;
  // No native controls and no autoplay: the overlay is the whole control
  // surface, so it stays mounted as a play/pause toggle (see the header).
  const toggleMode = !effectiveControls && !autoplay;
  // A cross-origin track needs the element in CORS mode or the browser drops
  // the track silently. The document origin is unknown at render time, so any
  // absolute URL counts as cross-origin; a same-origin absolute URL in CORS
  // mode is harmless.
  const needsCors = trackList.some((track) => isAbsoluteUrl(track.src));
  // Overlay lifecycle. autoplay starts the clip before any user gesture, so the
  // overlay would flash up and immediately hide — start it "gone" in that case.
  type OverlayPhase = "visible" | "fading" | "gone";
  const [phase, setPhase] = useState<OverlayPhase>(autoplay ? "gone" : "visible");
  // Toggle mode only: mirrors the element's play/pause state onto the overlay.
  const [playing, setPlaying] = useState(false);

  // Begin the fade once, on the first play (whether from our button or the
  // native control). Idempotent: only "visible" advances to "fading". In
  // toggle mode the overlay never leaves "visible".
  const dismissOverlay = () => {
    if (toggleMode) return;
    setPhase((p) => (p === "visible" ? "fading" : p));
  };

  const onPlayClick = () => {
    const el = videoRef.current;
    if (!el) return;
    if (toggleMode && !el.paused) {
      el.pause();
      return;
    }
    dismissOverlay();
    void el.play().catch(() => {
      // Autoplay policy or codec issue — let the native controls take over.
    });
  };

  // Backstop unmount: if the opacity transition never fires (motion still /
  // prefers-reduced-motion collapses the duration to ~0), drop the overlay
  // anyway so it can't linger over the native controls.
  useEffect(() => {
    if (phase !== "fading") return;
    const t = window.setTimeout(() => setPhase("gone"), 600);
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        // Native controls stay hidden in the initial "visible" phase so only the
        // custom magenta play button shows (no double control surface). After
        // the first play (phase advances to fading → gone) they appear and stay
        // for the session. Still gated by the `controls` prop: a consumer that
        // sets controls=false (decorative clip) never gets native controls,
        // unless `tracks` is non-empty (captions need the native CC control).
        controls={effectiveControls && phase !== "visible"}
        crossOrigin={needsCors ? "anonymous" : undefined}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        playsInline
        // The accessible name lives on the video element itself. (A src-less
        // <track kind="descriptions"> is invalid HTML that browsers discard
        // and never named anything; audit.)
        aria-label={title}
        style={videoStyle}
        onPlay={() => {
          setPlaying(true);
          dismissOverlay();
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      >
        {trackList.map((track) => (
          <track
            key={`${track.kind ?? "captions"}:${track.srcLang}:${track.src}`}
            src={track.src}
            srcLang={track.srcLang}
            label={track.label}
            kind={track.kind ?? "captions"}
            default={track.default}
          />
        ))}
      </video>

      {phase !== "gone" ? (
        <button
          type="button"
          // The toggle keeps ONE name and reports its state through aria-pressed
          // (the APG toggle-button pattern); the glyph flips play/pause visually.
          aria-label={title ? `Play ${title}` : "Play video"}
          aria-pressed={toggleMode ? playing : undefined}
          data-mw-video-play=""
          data-playing={toggleMode ? (playing ? "true" : "false") : undefined}
          data-fading={phase === "fading" ? "true" : "false"}
          onClick={onPlayClick}
          onTransitionEnd={(e) => {
            // Only the overlay's own first-play opacity transition unmounts it
            // (ignore bubbled transitions from the disc's hover transform, and
            // the toggle's own fade while a clip plays).
            if (phase === "fading" && e.propertyName === "opacity" && e.currentTarget === e.target) {
              setPhase("gone");
            }
          }}
          style={overlayButtonStyle}
        >
          <span data-mw-video-play-disc="" style={discStyle}>
            <svg
              viewBox="0 0 24 24"
              width="32"
              height="32"
              aria-hidden="true"
              focusable="false"
            >
              {toggleMode && playing ? (
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="var(--text-on-accent)" />
              ) : (
                <path
                  d="M7 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 7 5.5Z"
                  fill="var(--text-on-accent)"
                />
              )}
            </svg>
          </span>
        </button>
      ) : null}

      <style href="magentaweb-video-self-hosted" precedence="default">{selfHostedCss}</style>
    </>
  );
}

// Scheme-qualified ("https://cdn.example.com/x.vtt") and protocol-relative
// ("//cdn.example.com/x.vtt") URLs are absolute; anything else resolves against
// the page and stays same-origin.
function isAbsoluteUrl(url: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url);
}

const videoStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  border: 0,
};

const overlayButtonStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: 0,
  padding: 0,
  cursor: "pointer",
  // opacity is driven by data-fading / data-playing in the hoisted CSS so it can transition.
  transition: "opacity var(--motion-transition)",
};

const discStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "5rem",
  height: "5rem",
  borderRadius: "var(--radius-full)",
  background: "var(--accent-base)",
  color: "var(--text-on-accent)",
  boxShadow: "var(--shadow-raised)",
  transition: "transform var(--motion-transition)",
};

const selfHostedCss = `
/* First-play fade: pointer-events drop the instant fading begins so the native
   controls underneath receive the click, while opacity eases out over the
   motion duration. onTransitionEnd then unmounts the button entirely. */
[data-mw-video-play][data-fading="true"] {
  opacity: 0;
  pointer-events: none;
}
/* The controls={false} toggle: while the clip plays the disc fades out but the
   button stays live over the frame (a click anywhere pauses), and it comes back
   for a hovering pointer or keyboard focus. Pause, or the end of the clip, flips
   data-playing back and the disc is shown again. */
[data-mw-video-play][data-playing="true"] {
  opacity: 0;
}
[data-mw-video-play][data-playing="true"]:hover,
[data-mw-video-play][data-playing="true"]:focus-visible {
  opacity: 1;
}
[data-mw-video-play]:hover [data-mw-video-play-disc],
[data-mw-video-play]:focus-visible [data-mw-video-play-disc] {
  transform: scale(1.08);
}
[data-mw-video-play]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 4px;
  border-radius: var(--component-radius);
}
`;

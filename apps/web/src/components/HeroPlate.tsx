import { CSSProperties } from "react";
import { Parallax } from "@/components/motion/Parallax";

/* HeroPlate: a looping plate behind a hero's claim, blended into the ground.
 *
 * Promoted from two identical hand-rolled layers (magenta-web and meridian, 6 to 7 Sep 2026;
 * PLATE-1) the moment zafiro asked for a third. The layer is BEHAVIOUR, not arrangement: a
 * muted, looping, inline video with its poster; hidden under reduced motion and the still dial,
 * where the poster stands in; blended into the band's ground (multiply on the light theme shows
 * its darks as texture, screen on the dark theme shows its lights) at a per-theme opacity; and,
 * optionally, masked so it reads as a soft field rather than a placed rectangle.
 *
 * THE OPACITIES ARE THE VIDEO'S, NOT THIS COMPONENT'S (owner, 7 Sep 2026). A plate's right
 * opacity depends on how bright the clip is under the words, so the fork declares them beside
 * the file it tunes (the slot's `plate` in its assets.ts) and measures them with
 * scripts/probe-plate-contrast.mjs; this component carries the mechanics and the defaults. Do
 * not copy another fork's numbers.
 *
 * PLACEMENT. Render it as the FIRST child of a Section that carries position: relative and
 * overflow: hidden, and give the Container that follows position: relative, so the words paint
 * above the plate. The hero recipes (B1, B4) take a `plate` prop and do this themselves.
 *
 * A STILL PLATE, AND A DRIFTING ONE (v6.14.0, 10 Sep 2026: the CTA band's parallax texture, the
 * owner's ask on the studio site). A plate needs no loop: given a `poster` and no `src`, the
 * still is the plate on every dial. And `parallax` gives it a speed, through the mother's
 * Parallax primitive rather than a scroll handler of its own: at 0.85 the picture lags the page
 * by fifteen percent and the band reads as a window onto something deeper. The media is
 * overscanned by enough to cover the drift, the mask stays fixed on the band rather than moving
 * with the picture, and under reduced motion or the still dial Parallax renders inert, so the
 * plate simply holds. Hosted by the H1 recipe's `plate` prop as well as B1 and B4's.
 *
 * ON AN INVERTED BAND the plate swaps its numbers (same release): inverted means the OTHER
 * theme's ground, so the light theme's inverted band takes the dark tuning and blend, and the
 * dark theme's takes the light ones.
 *
 * Masks are presets, because a mask is a design decision worth naming, plus an escape hatch:
 *   "none"   the plate fills the band edge to edge.
 *   "pool"   one soft ellipse, centred by `focus`, full at its centre and gone by its rim, so the
 *            plate pools behind and beyond the claim, leaves the ground under the words clean and
 *            feathers before all four edges (magenta-web's).
 *   "veil"   the plate everywhere, feathered at the four edges only.
 *   any other string is used verbatim as the mask-image value.
 */

export type HeroPlateMask = "none" | "pool" | "veil" | (string & {});
export type HeroPlateBlendLight = "multiply" | "soft-light" | "luminosity" | "normal";
export type HeroPlateBlendDark = "screen" | "soft-light" | "luminosity" | "normal";

export interface HeroPlateProps {
  /** The loop (mp4 or webm), from the fork's manifest. Omit for a still plate: the poster alone. */
  src?: string;
  /** The still: first paint, and the plate under reduced motion or the still dial; the whole
   *  plate when there is no loop. */
  poster?: string;
  /** Scroll drift, as a Parallax speed: 0.85 lags the page by fifteen percent, 1 (or unset) is
   *  none. Declared on the slot's plate beside the opacities. */
  parallax?: number;
  /** Opacity on the light theme. Declared per video on the slot; measured, never copied. */
  light?: number;
  /** Opacity on the dark theme. */
  dark?: number;
  /** Blend on the light theme; multiply shows the clip's darks as texture on a light ground. */
  blendLight?: HeroPlateBlendLight;
  /** Blend on the dark theme; screen shows the clip's lights on a dark ground. */
  blendDark?: HeroPlateBlendDark;
  /** The mask preset, or a raw mask-image value. */
  mask?: HeroPlateMask;
  /** Where the "pool" mask centres, as a CSS position ("66% 50%"); ignored by other masks. */
  focus?: string;
  /** Overrides merged onto the layer (a z-index, an inset), rarely needed. */
  style?: CSSProperties;
}

const MASKS: Record<string, string> = {
  none: "none",
  pool: "radial-gradient(ellipse 62% 88% at var(--mw-plate-focus, 66% 50%), #000 12%, transparent 74%)",
  veil: "linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent), linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)",
};

export function HeroPlate({
  src,
  poster,
  light = 0.18,
  dark = 0.35,
  blendLight = "multiply",
  blendDark = "screen",
  mask = "none",
  focus,
  parallax,
  style,
}: HeroPlateProps) {
  const maskValue = MASKS[mask] ?? mask;
  const drifts = typeof parallax === "number" && parallax !== 1;
  // The overscan, in percent of the band's height, top and bottom. The drift at speed s is
  // (1 - s) of the band's offset from the viewport's centre, which while any of the band is on
  // screen is at most about three quarters of the viewport, so one and a half times the lag
  // covers it with margin; clamped so a slow plate never overscans absurdly.
  const overscan = drifts ? Math.min(40, Math.max(10, Math.round(Math.abs(1 - parallax) * 150))) : 0;
  const vars = {
    "--mw-plate-light": String(light),
    "--mw-plate-dark": String(dark),
    "--mw-plate-blend-light": blendLight,
    "--mw-plate-blend-dark": blendDark,
    "--mw-plate-mask": maskValue,
    ...(focus ? { "--mw-plate-focus": focus } : {}),
  } as CSSProperties;
  const media = (
    <>
      {src ? <video src={src} poster={poster} autoPlay muted loop playsInline preload="metadata" /> : null}
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element -- the still of the plate; decorative
        <img src={poster} alt="" />
      ) : null}
    </>
  );
  return (
    <div
      data-mw-hero-plate=""
      data-mw-plate-mask={mask in MASKS ? mask : "custom"}
      data-mw-plate-still={src ? undefined : ""}
      aria-hidden="true"
      style={{ ...vars, ...style }}
    >
      <style href="magentaweb-hero-plate" precedence="default">{PLATE_CSS}</style>
      {drifts ? (
        // The drifting frame: Parallax translates this wrapper and the media fills it, oversized
        // top and bottom so the drift never shows the band's ground past the picture's edge.
        <Parallax speed={parallax} style={{ position: "absolute", inset: `-${overscan}% 0` }}>
          {media}
        </Parallax>
      ) : (
        media
      )}
    </div>
  );
}

// The layer reads its numbers from the instance's variables, so one stylesheet serves every
// plate on a page; the theme selectors mirror the fleet's (an explicit dark, and auto under a
// dark preference), an inverted band swaps the two tunings (it is the other theme's ground), and
// the still dial or reduced motion swaps the video for its poster; a still plate (no loop) shows
// its poster on every dial. The "veil" preset composites its two gradients with intersect so
// both edges feather.
const PLATE_CSS = `
[data-mw-hero-plate] {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  opacity: var(--mw-plate-light);
  mix-blend-mode: var(--mw-plate-blend-light);
  -webkit-mask-image: var(--mw-plate-mask);
  mask-image: var(--mw-plate-mask);
}
[data-mw-hero-plate][data-mw-plate-mask="veil"] {
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}
[data-mw-hero-plate] video,
[data-mw-hero-plate] img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
html[data-theme="dark"] [data-mw-hero-plate],
[data-section-bg="inverted"] [data-mw-hero-plate] {
  opacity: var(--mw-plate-dark);
  mix-blend-mode: var(--mw-plate-blend-dark);
}
html[data-theme="dark"] [data-section-bg="inverted"] [data-mw-hero-plate] {
  opacity: var(--mw-plate-light);
  mix-blend-mode: var(--mw-plate-blend-light);
}
@media (prefers-color-scheme: dark) {
  html[data-theme="auto"] [data-mw-hero-plate] {
    opacity: var(--mw-plate-dark);
    mix-blend-mode: var(--mw-plate-blend-dark);
  }
  html[data-theme="auto"] [data-section-bg="inverted"] [data-mw-hero-plate] {
    opacity: var(--mw-plate-light);
    mix-blend-mode: var(--mw-plate-blend-light);
  }
}
[data-mw-hero-plate] img { display: none; }
[data-mw-hero-plate][data-mw-plate-still] img { display: block; }
@media (prefers-reduced-motion: reduce) {
  [data-mw-hero-plate] video { display: none; }
  [data-mw-hero-plate] img { display: block; }
}
html[data-motion="still"] [data-mw-hero-plate] video { display: none; }
html[data-motion="still"] [data-mw-hero-plate] img { display: block; }
`;

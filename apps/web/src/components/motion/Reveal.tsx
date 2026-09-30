import { CSSProperties, ReactNode } from "react";

/* ============================================================
   Reveal — the orchestrated entrance beat (the HQ drill-down choreography
   promoted to the system, owner-approved API). Wrap each beat of a page in a
   Reveal with an ascending `step`: the beat blur-fades in on mount, delayed by
   step x --mw-reveal-step, so a header -> panels -> back-button entrance reads
   as one choreography. Convention: the back button takes the LAST step.

   Naming note: Reveal / RevealGroup are the MOUNT-time entrance beats.
   The similarly named RevealBlock / RevealText (RevealBlock.tsx,
   RevealText.tsx) are the VIEWPORT-triggered reveal family and reverse
   when content leaves the viewport. Two families, close names: the
   attribute collision already bit once (data-mw-reveal vs
   data-mw-reveal-beat). A rename is owner-gated for the seal
   (REFACTOR_QUEUE, naming disambiguation entry).

   Pure CSS, server component: the animation auto-plays on mount and the
   element RESTS revealed (opacity 1), so with animation off (still dial,
   prefers-reduced-motion, no JS) the content is simply visible - the animation
   only ever adds the fade-in, it never hides content at rest.

   The settled state is the element's NATURAL style, not a held keyframe: the
   fill mode is `backwards` (the delay period stays hidden, so a staggered beat
   never flashes before its turn) and the `to` frame matches the natural style
   exactly (opacity 1, filter none), so the last animated frame and the settled
   frame are identical. `filter: none`, never `blur(0)`: ANY non-none filter is
   a stacking context, and a held blur(0) on every settled beat painted each
   later beat OVER an earlier beat's popover whatever the popover's z-index said
   (B5, 27 Aug 2026; scripts/probe-reveal-filter.mjs measures it).

   TIMING is entirely the motion system's: per-beat duration is
   --motion-reveal-duration, blur is --motion-reveal-blur, easing is
   --motion-ease, and the stagger lives behind ONE knob, --mw-reveal-step
   (declared in this sheet, derived from the reveal tier so it tracks the
   motion dial and collapses to 0 at still). Self-emitted style, so it works
   in any route group and in every fork.

   `span` forwards to data-reveal-span for a consumer's media-gated grid CSS
   to read (an inline grid-column would also apply below the grid breakpoint,
   spawning implicit tracks).
   ============================================================ */

export interface RevealProps {
  /** The beat index: delay = step x --mw-reveal-step. */
  step?: number;
  /** Optional grid span, forwarded as data-reveal-span for grid CSS to read. */
  span?: number;
  style?: CSSProperties;
  children: ReactNode;
}

export function Reveal({ step = 0, span, style, children }: RevealProps) {
  return (
    <div
      data-mw-reveal-beat=""
      data-reveal-span={span}
      style={{ ...style, animationDelay: `calc(var(--mw-reveal-step) * ${step})` }}
    >
      <style href="magentaweb-reveal" precedence="default">{css}</style>
      {children}
    </div>
  );
}

const css = `
:root {
  /* THE knob: the per-beat stagger. Derived from the reveal tier so it tracks
     the motion dial automatically (0 at still). Deliberately slow + dramatic. */
  --mw-reveal-step: calc(var(--motion-reveal-duration) * 0.22);
}
[data-mw-reveal-beat] {
  /* backwards, not both: hidden through the delay, released to the natural
     style once done (a held end frame kept a filter, and with it a stacking
     context, on every settled beat; see the header). */
  animation: mw-reveal-beat var(--motion-reveal-duration) var(--motion-ease) backwards;
}
@keyframes mw-reveal-beat {
  from { opacity: 0; filter: blur(var(--motion-reveal-blur)); }
  /* none, not blur(0): interpolable from blur() (none is the identity list)
     and no stacking context at rest. */
  to   { opacity: 1; filter: none; }
}
/* still dial + reduced motion: no animation; the beat rests revealed. */
@media (prefers-reduced-motion: reduce) {
  [data-mw-reveal-beat] { animation: none; }
}
html[data-motion="still"] [data-mw-reveal-beat] { animation: none; }
`;

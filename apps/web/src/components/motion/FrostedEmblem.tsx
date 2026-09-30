import { CSSProperties, ReactNode } from "react";

/* ============================================================
   FrostedEmblem — a brand-mark rendered as frosted glass over whatever sits
   behind it (a hero image, a slideshow, a color field). The technique, not the
   mark: a backdrop-blur layer is clipped to a silhouette MASK, tinted with the
   theme's ink/ivory (--text-positive-primary, so it mirrors light/dark), and an
   optional line-art OVERLAY is drawn on top. The fork supplies the two brand
   assets — `maskSrc` (the silhouette SVG) and `overlay` (its line-art mark) —
   so the same frosted-glass effect serves every brand without this component
   knowing any of them.

   Purely decorative (pointer-events: none, aria-hidden by the caller). Server
   component, self-emitted sheet. Positioning/sizing comes from `style` (the
   caller bleeds it off an edge, sets its width/aspect, etc.).

   maskSrc and the overlay SVG should share a viewBox so the frost and the
   line-art register exactly (a punched-out center facet in the mask then reads
   as a clear window inside the drawn mark).
   ============================================================ */

export interface FrostedEmblemProps {
  /** URL of the silhouette SVG the frost is clipped to (mask-image). */
  maskSrc: string;
  /** Line-art / detail drawn over the frost (the fork's brand mark). */
  overlay?: ReactNode;
  /** Backdrop blur radius in px. Default 16. */
  blur?: number;
  /** Frost tint, 0–1 of --text-positive-primary (ink on light, ivory on dark). Default 0.14. */
  tint?: number;
  /** Opacity of the overlay line-art. Default 0.5. */
  overlayOpacity?: number;
  /** Positioning / sizing of the emblem box (absolute bleed, width, aspect-ratio, …). */
  style?: CSSProperties;
  className?: string;
}

export function FrostedEmblem({
  maskSrc,
  overlay,
  blur = 16,
  tint = 0.14,
  overlayOpacity = 0.5,
  style,
  className,
}: FrostedEmblemProps) {
  const vars = {
    "--mw-frost-mask": `url(${maskSrc})`,
    "--mw-frost-blur": `${blur}px`,
    "--mw-frost-tint": `${tint * 100}%`,
    "--mw-frost-overlay-opacity": String(overlayOpacity),
    ...style,
  } as CSSProperties;
  return (
    <span data-mw-frosted-emblem="" className={className} style={vars} aria-hidden="true">
      <style href="magentaweb-frosted-emblem" precedence="default">{frostedEmblemCss}</style>
      <span data-mw-frost="" />
      <span data-mw-frost-overlay="">{overlay}</span>
    </span>
  );
}

const frostedEmblemCss = `
[data-mw-frosted-emblem] {
  position: relative;
  display: inline-flex;
  pointer-events: none;
}
[data-mw-frost] {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--text-positive-primary) var(--mw-frost-tint), transparent);
  backdrop-filter: blur(var(--mw-frost-blur));
  -webkit-backdrop-filter: blur(var(--mw-frost-blur));
  -webkit-mask: var(--mw-frost-mask) center / contain no-repeat;
  mask: var(--mw-frost-mask) center / contain no-repeat;
}
[data-mw-frost-overlay] {
  position: absolute;
  inset: 0;
  display: flex;
  color: var(--text-positive-primary);
  opacity: var(--mw-frost-overlay-opacity);
}
`;

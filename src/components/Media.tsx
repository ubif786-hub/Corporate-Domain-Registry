"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import NextImage from "next/image";

/* ============================================================
   Media — the showcase image wrapper.

   Server `Image` stays pure (a thin next/image wrapper). Media is the
   client counterpart that carries the image-forward concerns a showcase
   needs and `Image` deliberately omits, all of them always-on:

   - Fade-in on load. The image rests at opacity 0 over a skeleton tint
     (the frame's own background) and fades in once it decodes. The fade
     reads --motion-reveal-duration, so the reduced-motion token reset
     collapses it to an instant appear (no animation, image still shown).
     The resting opacity lives in the hoisted sheet keyed on data-loaded,
     not inline, and it has two escape hatches (pass 3, 27 Aug 2026): a
     FAILED image is revealed too (onError, plus the mount check accepting
     `complete` without naturalWidth, because an image that 404s before
     hydration has already fired its error event and `complete` is the
     only trace left), so the browser's broken-image chrome and the alt
     text show instead of a grey box forever; and `@media (scripting:
     none)` lifts the opacity on a page whose JavaScript never runs, where
     the server-rendered data-loaded="false" would otherwise hide every
     image. A reveal on error is the 1.1.1 outcome: do not pair it with a
     placeholder that re-hides the alt text.
   - In-frame parallax. The image overscans its clip frame and drifts
     vertically as the frame travels the viewport, the same clamped
     getBoundingClientRect progress ScrollScene uses (tracks Lenis, no
     coupling). The drift is bounded to the overscan so an edge never
     shows. This is the fiddly overscan-clip + inner-layer translate that
     would otherwise leak into the page, so Media owns it.
   - Hover-zoom. A slow scale on a dedicated inner layer (separate node
     from the parallax layer, so the translate and the scale never fight
     over `transform`). Reuses --motion-transition, the same interactive
     feel as Card hover.

   Motion contract (matches ScrollScene / Parallax / RevealBlock): under
   prefers-reduced-motion or the `still` dial the scroll listener never
   attaches, the parallax layer rests untranslated, and the fade collapses
   to instant. The image rests static and fully visible. The dial is read
   once on mount (the (site) group has no live dial control).

   Deliberately minimal: no parallax/zoom toggles. Media IS the animated
   showcase image; for a static image use `Image`. Add a knob only when a
   real second consumer needs one (real-needs-only).
   ============================================================ */

type MediaAspect = "square" | "wide" | "tall";
type MediaRounding = "sharp" | "soft" | "full";

export interface MediaProps {
  // Alt contract (A-010): alt is required and TS-enforced; Media is image-only
  // (video lives in VideoSelfHosted). A decorative image passes the standard
  // alt=""; a first-class `decorative` opt-in is deferred until a real consumer
  // needs it. Note jsx-a11y/alt-text does not lint Media by name, so the type is
  // the single enforcer here.
  alt: string;
  aspect?: MediaAspect;
  priority?: boolean;
  rounding?: MediaRounding;
  // Default "100vw" assumes the image fills the viewport. Pass a media-query
  // string when the image lives in a multi-column grid so next/image picks a
  // smaller srcset candidate (e.g. "(min-width: 1024px) 33vw, 100vw").
  sizes?: string;
  src: string;
  className?: string;
  style?: CSSProperties;
}

const aspectRatioMap: Record<MediaAspect, string> = {
  square: "1 / 1",
  wide: "16 / 9",
  tall: "3 / 4",
};

// Inherit-vs-override, same contract as Image: leaving `rounding` unset resolves
// to the system radius dial; passing it overrides the dial for this one Media.
const radiusMap: Record<MediaRounding, string> = {
  sharp: "0",
  soft: "var(--radius-md)",
  full: "var(--radius-full)",
};

// Vertical overscan, as a fraction of the frame height, that the parallax layer
// extends beyond the frame on each side. The scroll drift is bounded to exactly
// this much in either direction so the clip frame is always covered: an edge can
// never be revealed. Kept subtle so the beat reads luxurious, not jumpy.
const OVERSCAN = 0.08;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Hover-zoom lives in hoisted CSS (:hover is not expressible inline). React 19
// dedupes by precedence + href, so many Media on a page mount one <style>.
const mediaCss = `
/* The load fade. Sheet, not inline, so the no-script rule below can win: an
   inline opacity beats any sheet rule and would keep the image hidden. */
[data-mw-media] img {
  opacity: 0;
  transition: opacity var(--motion-reveal-duration) var(--motion-ease);
}
[data-mw-media][data-loaded="true"] img {
  opacity: 1;
}
/* No scripting at all: data-loaded never flips from the server's "false", so the
   image would rest invisible over a rendered document. Mirrors RevealText. */
@media (scripting: none) {
  [data-mw-media] img {
    opacity: 1;
  }
}
[data-mw-media] [data-mw-media-zoom] {
  transition: transform var(--motion-transition);
}
[data-mw-media]:hover [data-mw-media-zoom] {
  transform: scale(1.04);
}
@media (prefers-reduced-motion: reduce) {
  [data-mw-media]:hover [data-mw-media-zoom] { transform: none; }
}
`;

export function Media({
  alt,
  aspect = "wide",
  priority,
  rounding,
  sizes = "100vw",
  src,
  className,
  style,
}: MediaProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Cached images can finish before React attaches onLoad, so the handler never
  // fires and the image would stay at opacity 0. Catch that on mount. `complete`
  // alone, deliberately: a FAILED image is also complete (with naturalWidth 0),
  // and its error event fired before hydration, so this is the only backstop
  // that reveals it. The old `naturalWidth > 0` guard was exactly what kept a
  // 404 hidden.
  useEffect(() => {
    const img = frameRef.current?.querySelector("img");
    if (img?.complete) setLoaded(true);
  }, []);

  // In-frame parallax. Same viewport-travel progress as ScrollScene; mapped to a
  // translate bounded to +/- OVERSCAN of the frame height so the frame is always
  // covered. Honors the global motion contract: no attach under reduced motion
  // or the `still` dial, so the layer rests untranslated and the image is centered
  // and fully visible.
  useEffect(() => {
    const layer = parallaxRef.current;
    const frame = frameRef.current;
    if (!layer || !frame) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.getAttribute("data-motion") === "still") return;

    layer.style.willChange = "transform";
    let raf: number | null = null;

    const update = () => {
      raf = null;
      const rect = frame.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const denom = vh + rect.height;
      const p = denom > 0 ? clamp01((vh - rect.top) / denom) : 0;
      // p 0 (entering bottom) -> +OVERSCAN*h ; p 1 (clearing top) -> -OVERSCAN*h.
      const ty = (0.5 - p) * 2 * OVERSCAN * rect.height;
      layer.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0)`;
    };

    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
      layer.style.willChange = "";
      layer.style.transform = "";
    };
  }, []);

  const radius = rounding ? radiusMap[rounding] : "var(--component-radius)";

  const frameStyle: CSSProperties = {
    position: "relative",
    display: "block",
    overflow: "hidden",
    width: "100%",
    aspectRatio: aspectRatioMap[aspect],
    borderRadius: radius,
    // Skeleton tint behind the image until it fades in. On an inverted band this
    // resolves dark (see tokens.css full surface inversion), so it reads as a
    // dark placeholder rather than a light flash.
    background: "var(--background-positive-secondary)",
    ...style,
  };

  // The parallax layer overscans the frame on top and bottom so the bounded
  // vertical drift never reveals an edge.
  const parallaxLayerStyle: CSSProperties = {
    position: "absolute",
    inset: `${(-OVERSCAN * 100).toFixed(0)}% 0`,
  };

  const zoomLayerStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    transformOrigin: "center",
    willChange: "transform",
  };

  // opacity and its transition live in mediaCss (keyed on data-loaded).
  const imageStyle: CSSProperties = {
    objectFit: "cover",
  };

  return (
    <div
      ref={frameRef}
      data-mw-media=""
      data-loaded={loaded ? "true" : "false"}
      className={className}
      style={frameStyle}
    >
      <style href="magentaweb-media" precedence="default">{mediaCss}</style>
      <div ref={parallaxRef} data-mw-media-parallax="" style={parallaxLayerStyle}>
        <div data-mw-media-zoom="" style={zoomLayerStyle}>
          <NextImage
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            preload={priority}
            style={imageStyle}
            onLoad={() => setLoaded(true)}
            // A failed decode reveals the element too: broken-image chrome plus
            // the alt text, instead of the skeleton tint forever.
            onError={() => setLoaded(true)}
          />
        </div>
      </div>
    </div>
  );
}

import { CSSProperties, ReactNode } from "react";
import NextImage from "next/image";

type ImageAspect =
  | "square"
  | "wide"
  | "tall"
  | "standard"
  | "landscape"
  | "portrait"
  | "photo-tall"
  | "cinema"
  | "auto";
type ImageRounding = "sharp" | "soft" | "full";
type ImageFit = "cover" | "contain";

export interface ImageProps {
  // Alt contract (A-010): alt is required and TS-enforced (more precise than the
  // jsx-a11y lint, which now guards only raw <img>). A decorative image passes
  // the standard alt=""; a first-class `decorative` opt-in is a deferred
  // battlefield addition, added when a real decorative consumer appears.
  alt: string;
  aspect?: ImageAspect;
  caption?: string;
  fit?: ImageFit;
  priority?: boolean;
  rounding?: ImageRounding;
  // Default "100vw" assumes the image fills the viewport. Pass a media-query
  // string when the image lives in a multi-column grid so next/image can pick
  // a smaller srcset candidate (e.g. "(min-width: 1024px) 33vw, 100vw").
  sizes?: string;
  src: string;
}

// The photographic set (owner-approved, 9 Jul): standard = the case-card
// cover, landscape = the classic photo frame, portrait = editorial 4:5,
// photo-tall = full-length 2:3, cinema = ultra-wide hero bands.
const aspectRatioMap: Record<Exclude<ImageAspect, "auto">, string> = {
  square: "1 / 1",
  wide: "16 / 9",
  tall: "3 / 4",
  standard: "4 / 3",
  landscape: "3 / 2",
  portrait: "4 / 5",
  "photo-tall": "2 / 3",
  cinema: "21 / 9",
};

// Inherit-vs-override: leaving `rounding` unset resolves to `var(--component-radius)`,
// the system-wide radius dial (data-radius on <html>). Passing `rounding` explicitly
// overrides the dial for this one Image — useful for circular avatars (`full`) or
// for forcing sharp / soft corners in a context where the system dial is something else.
const radiusMap: Record<ImageRounding, string> = {
  sharp: "0",
  soft: "var(--radius-md)",
  full: "var(--radius-full)",
};

// next/image with a remote URL requires width/height for aspect-ratio reservation.
// When aspect="auto" we don't know the source's native size, so we pass placeholder
// dimensions and let CSS (width:100%, height:auto) handle the rendered size.
const AUTO_FALLBACK_W = 1600;
const AUTO_FALLBACK_H = 1200;

export function Image({
  alt,
  aspect = "auto",
  caption,
  fit = "cover",
  priority,
  rounding,
  sizes = "100vw",
  src,
}: ImageProps) {
  const radius = rounding ? radiusMap[rounding] : "var(--component-radius)";

  const figureStyle: CSSProperties = {
    margin: 0,
    display: "block",
  };

  const captionStyle: CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: "var(--type-sm)",
    color: "var(--text-positive-secondary)",
    marginTop: "var(--space-xs)",
    lineHeight: "var(--leading-snug)",
  };

  let media: ReactNode;

  if (aspect === "auto") {
    // No objectFit here: with width 100% / height auto the box always matches
    // the intrinsic ratio, so fit could never act (audit; fit is an aspect-mode knob).
    const autoStyle: CSSProperties = {
      width: "100%",
      height: "auto",
      display: "block",
      borderRadius: radius,
    };
    media = (
      <NextImage
        src={src}
        alt={alt}
        width={AUTO_FALLBACK_W}
        height={AUTO_FALLBACK_H}
        sizes={sizes}
        preload={priority}
        style={autoStyle}
      />
    );
  } else {
    const frameStyle: CSSProperties = {
      position: "relative",
      width: "100%",
      aspectRatio: aspectRatioMap[aspect],
      overflow: "hidden",
      borderRadius: radius,
    };
    const fillStyle: CSSProperties = {
      objectFit: fit,
    };
    media = (
      <div style={frameStyle}>
        <NextImage
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          preload={priority}
          style={fillStyle}
        />
      </div>
    );
  }

  if (caption) {
    return (
      <figure style={figureStyle}>
        {media}
        <figcaption style={captionStyle}>{caption}</figcaption>
      </figure>
    );
  }

  return media;
}

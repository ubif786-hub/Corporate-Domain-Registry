import { CSSProperties } from "react";
import NextImage from "next/image";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   Avatar: the person identity chip. BrandMark is the organisation
   mark and IdChip is the mono identifier; Avatar is the person: a
   photo when one exists, derived initials when it does not. User
   menu triggers, admin identity cells, activity rows.

   Initials are the uppercase first letters of the first two
   whitespace-separated words of `name` (one letter for a one-word
   name). Deterministic simple string ops: no hashing, no per-user
   colours. The initials face is the quiet neutral by default
   (secondary ground, secondary ink, the hairline).

   DOCTRINE AMENDMENT (v4.8.0, owner-approved, see the decision log):
   the old law was "identity never borrows the accent." Identity may
   now borrow the accent through ONE sanctioned register only —
   variant="brand": the accent-gradient disc with on-accent initials,
   for a partner/marketing identity card where the person IS the
   brand surface (promoted from the readilyhome PartnerAvatar, 3
   proven sites). It is opt-in and loud by design; the default
   variant stays the quiet neutral and is byte-identical to v4.7.0.
   size="xl" (3.5rem) lands with it — the card-anchor diameter the
   brand register wants; all other sizes unchanged.

   Shape: a pinned circle (--radius-full), deliberately EXEMPT from
   the radius dial. Identity reads as a disc regardless of brand
   posture, the BackToTop FAB precedent. Diameters are the shared
   control geometry (--control-size-sm/md/lg), dial-independent by
   design, so the chip stays a constant target at every spacing dial.

   Accessibility: the root span carries role="img" and the name as
   aria-label in BOTH faces; the photo is alt="" + aria-hidden and
   the initials are aria-hidden, so the name announces exactly once.
   When the visible name sits beside the avatar (a table cell, a menu
   row), hide the avatar at the call site instead (see the doc).

   No hooks, no handlers: initials derive at render and the photo is
   next/image, so this is a server component.
   ============================================================ */

export type AvatarSize = "sm" | "md" | "lg" | "xl";
export type AvatarVariant = "default" | "brand" | "placeholder";

// Disc diameter per size: the shared control geometry (28 / 32 / 36px),
// fixed rem by design so identity stays a constant target under every dial.
// xl (v4.8.0) is the card-anchor diameter for the brand register.
const SIZE_BOX: Record<AvatarSize, string> = {
  sm: "var(--control-size-sm)",
  md: "var(--control-size-md)",
  lg: "var(--control-size-lg)",
  xl: "3.5rem",
};

// Initials type per size. lg takes --type-sm rather than the spec-scale next
// step up: it keeps the letters near the same ~0.4 ratio of the disc on all
// three rungs, so the three sizes read as one family.
const SIZE_TYPE: Record<AvatarSize, string> = {
  sm: "var(--type-2xs)",
  md: "var(--type-xs)",
  lg: "var(--type-sm)",
  xl: "var(--type-lg)",
};

// The initials: uppercase first letters of the first two whitespace-separated
// words (one letter for a one-word name). Array.from walks code points, not
// UTF-16 units, so a first letter outside the BMP survives whole. Deterministic
// and locale-safe: plain string ops, no hashing, no per-user colours.
function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}

export interface AvatarProps {
  /** The person's name: the accessible name and the initials source. */
  name: string;
  /** Photo URL, rendered with next/image. Omit for the initials face. */
  src?: string;
  /** Disc diameter. Default md. */
  size?: AvatarSize;
  /** "brand" (v4.8.0): the sanctioned accent register — accent-gradient ground,
   *  on-accent initials — for partner/marketing identity cards. Default "default",
   *  the quiet neutral (byte-identical to the pre-v4.8.0 face). */
  variant?: AvatarVariant;
}

export function Avatar({ name, src, size = "md", variant = "default" }: AvatarProps) {
  const style: CSSProperties = {
    ...(variant === "brand" ? brandStyle : variant === "placeholder" ? placeholderStyle : baseStyle),
    width: SIZE_BOX[size],
    height: SIZE_BOX[size],
    fontSize: SIZE_TYPE[size],
  };

  return (
    <span
      data-mw-avatar=""
      data-size={size}
      data-variant={variant}
      data-face={src ? "photo" : "initials"}
      role="img"
      aria-label={name}
      style={style}
    >
      {src ? (
        // The photo face. The root already announces the name, so the img is
        // alt="" + aria-hidden and never doubles it. sizes matches the largest
        // disc metric (xl, 3.5rem).
        <NextImage src={src} alt="" aria-hidden="true" fill sizes="3.5rem" style={photoStyle} />
      ) : (
        // The initials face: presentation only, the root carries the name.
        <span aria-hidden="true" style={initialsStyle}>
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}

/* ---------- inline styles ---------- */

const baseStyle: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  overflow: "hidden",
  // The pinned circle: --radius-full, never --component-radius. Identity
  // reads as a disc regardless of brand posture (the BackToTop precedent),
  // so the avatar is deliberately exempt from the radius dial.
  borderRadius: "var(--radius-full)",
  background: "var(--background-positive-secondary)",
  color: "var(--text-positive-secondary)",
  border: "1px solid var(--border-positive-secondary)",
  verticalAlign: "middle",
  userSelect: "none",
};

const initialsStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  letterSpacing: "var(--tracking-wide)",
  lineHeight: 1,
};

// The brand register (v4.8.0): the accent-gradient disc with on-accent ink.
// Same pinned circle, no hairline (the gradient is the edge). Token-pure; the
// gradient + --text-on-accent both mirror per theme.
const brandStyle: CSSProperties = {
  ...baseStyle,
  background:
    "linear-gradient(135deg, var(--accent-base) 0%, var(--accent-hover) 100%)",
  color: "var(--text-on-accent)",
  border: "none",
  // No weight here: the initials span is the only text and carries --weight-medium itself
  // (a 600 used to sit here and never painted; typography audit T-7, 23 Aug 2026).
};

const placeholderStyle: CSSProperties = {
  ...baseStyle,
  // The selectable gradient face (v4.8.0) for people with no uploaded photo.
  // Rides the --avatar-grad-* triad tokens, re-pointed by the
  // html[data-avatar-grad] dial (violet default / spring-green / orange) —
  // theme-constant and OFF the brand accent, so a rebrand never recolors
  // people. Constant light ink, >=5.9:1 at the light stop in all three.
  background:
    "linear-gradient(135deg, var(--avatar-grad-a) 0%, var(--avatar-grad-b) 100%)",
  color: "var(--avatar-grad-ink)",
  border: "none",
};

const photoStyle: CSSProperties = {
  objectFit: "cover",
};

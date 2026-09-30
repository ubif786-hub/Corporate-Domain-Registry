import { CSSProperties, ReactNode } from "react";
import {
  CheckmarkFilled,
  ErrorFilled,
  InformationFilled,
  WarningFilled,
} from "@carbon/icons-react";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   Badge — a small status / feedback indicator chip.

   Three axes:
     tone     the colour + meaning (neutral, info, success, warning, error, accent)
     emphasis the visual weight (subtle = a wash of the hue, the calm default;
              solid = a saturated fill, for when a badge must carry weight)
     icon     an optional leading glyph (true = the tone's default status icon,
              the filled-circle family shared with Toast; a node = a custom icon)

   Tokens carry every colour. In subtle the background is a 14% wash of the tone's
   --badge-*-fg and that same colour is the text + icon (icon fill is currentColor,
   so the glyph always tracks the text). In solid the fill is --badge-*-solid with
   constant light text (--badge-text-on-solid); neutral solid inverts the surface
   instead, so it reads as a chip in both themes. Radius follows the radius dial via
   --component-radius. The chip is a static, non-interactive label, so this is a
   server component.
   ============================================================ */

/* The studio's industry vocabulary (v6.16.0, owner, 10 Sep 2026): ten industries, one hue family
   each, chosen from the palette's eleven with magenta (the brand) and red (the error tone) left
   out. A Badge takes an industry as its tone, so a portfolio card, an HQ card and an outreach
   row all colour a client the same way. The label is the badge text; `covers` is the plain
   list a site can show beside it ("who we build for"). Luxury is a register, not an industry,
   and has no badge; agencies sit with legal under professional services. */
export const INDUSTRIES = {
  architecture: { label: "Architecture", covers: "architecture, interiors, landscape" },
  finance: { label: "Finance", covers: "boutique finance, advisers, family offices, insurance" },
  "real-estate": { label: "Real estate", covers: "brokerages, developers, property" },
  hospitality: { label: "Hospitality", covers: "restaurants, hotels, travel, events" },
  health: { label: "Health", covers: "clinics, wellness, medical services" },
  technology: { label: "Technology", covers: "software, SaaS, product, AI" },
  industrial: { label: "Industrial", covers: "manufacturing, logistics, trades, home services" },
  nonprofit: { label: "Nonprofit", covers: "charities, faith, education, community" },
  arts: { label: "Arts", covers: "artists, galleries, music, creative practices" },
  professional: { label: "Professional services", covers: "law firms, agencies, consultancies" },
} as const;
export type Industry = keyof typeof INDUSTRIES;
export const INDUSTRY_IDS = Object.keys(INDUSTRIES) as Industry[];

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "error" | "accent" | Industry;
export type BadgeEmphasis = "subtle" | "solid";
/* The three typographic registers (v6.30.0 adds `sentence`). caps is the mono uppercase
   metadata register for a one-word state ("ISSUED", "IN SYNC"), which lines up with the
   DataLabel heads and the mono figures on a data surface. title keeps the label as authored
   in the body face. sentence is the body face at --type-xs, medium weight, for a chip whose
   label is a PHRASE: an attention reason ("Invoice past due"), an industry of two words. The
   rule that decides between caps and sentence is the label's length: one or two words in a
   code voice, a phrase in words. The mother's own home set its industry chips this way before
   the option existed (HQ v7 system pass, theme 4). */
export type BadgeCase = "caps" | "title" | "sentence";

// The default status glyph per tone (filled-circle family, shared with Toast). neutral
// and accent carry no inherent status, so `icon` falls back to nothing for them unless a
// custom node is passed.
const TONE_ICON: Partial<Record<BadgeTone, typeof CheckmarkFilled>> = {
  info: InformationFilled,
  success: CheckmarkFilled,
  warning: WarningFilled,
  error: ErrorFilled,
};

// Subtle text/icon colour per tone, theme-aware. The subtle background is a wash of this
// same value (see the style below), so the chip is monochrome within its hue.
const industryVars = (suffix: "fg" | "solid") =>
  Object.fromEntries(INDUSTRY_IDS.map((id) => [id, `var(--badge-${id}-${suffix})`])) as Record<Industry, string>;
const TONE_FG: Record<BadgeTone, string> = {
  neutral: "var(--badge-neutral-fg)",
  info: "var(--badge-info-fg)",
  success: "var(--badge-success-fg)",
  warning: "var(--badge-warning-fg)",
  error: "var(--badge-error-fg)",
  accent: "var(--badge-accent-fg)",
  ...industryVars("fg"),
};

// Solid fill per tone. neutral inverts the surface (a dark chip on light, light on dark)
// rather than a flat grey, so it stays legible in both themes; the rest are a saturated
// hue fill with constant light text.
const TONE_SOLID_BG: Record<BadgeTone, string> = {
  neutral: "var(--background-negative-primary)",
  info: "var(--badge-info-solid)",
  success: "var(--badge-success-solid)",
  warning: "var(--badge-warning-solid)",
  error: "var(--badge-error-solid)",
  accent: "var(--badge-accent-solid)",
  ...industryVars("solid"),
};
const TONE_SOLID_FG: Record<BadgeTone, string> = {
  neutral: "var(--text-on-negative)",
  info: "var(--badge-text-on-solid)",
  success: "var(--badge-text-on-solid)",
  warning: "var(--badge-text-on-solid)",
  error: "var(--badge-text-on-solid)",
  accent: "var(--badge-text-on-solid)",
  ...(Object.fromEntries(INDUSTRY_IDS.map((id) => [id, "var(--badge-text-on-solid)"])) as Record<Industry, string>),
};

export interface BadgeProps {
  // The colour + meaning. Default neutral.
  tone?: BadgeTone;
  // The visual weight. Default subtle.
  emphasis?: BadgeEmphasis;
  // true renders the tone's default status glyph (info / success / warning / error only);
  // a node renders that custom icon; omit or false for no icon.
  icon?: boolean | ReactNode;
  // Typographic register. "caps" (default) is the mono, UPPERCASE, tracked
  // metadata register — a system label or status code. "title" renders the label
  // as authored (body font, no transform, normal tracking) for CONTENT badges — a
  // person's role, a project status — that should read as words, not a code.
  // "sentence" is the phrase register: body face, --type-xs, medium weight, for a
  // chip that carries more than two words (an attention reason, a category).
  textCase?: BadgeCase;
  children: ReactNode;
}

export function Badge({ tone = "neutral", emphasis = "subtle", icon, textCase = "caps", children }: BadgeProps) {
  const solid = emphasis === "solid";

  const style: CSSProperties = solid
    ? { ...baseStyle, background: TONE_SOLID_BG[tone], color: TONE_SOLID_FG[tone] }
    : {
        ...baseStyle,
        background: `color-mix(in srgb, ${TONE_FG[tone]} 14%, transparent)`,
        color: TONE_FG[tone],
        // neutral's wash is so faint it needs a hairline to read as a chip.
        ...(tone === "neutral"
          ? { boxShadow: "inset 0 0 0 1px var(--border-positive-secondary)" }
          : null),
      };

  let glyph: ReactNode = null;
  if (icon === true) {
    const Glyph = TONE_ICON[tone];
    // 12px is deliberate chip-scale glyph geometry, below Icon's 16px sm rung:
    // a 16 glyph overwhelms the xs-type badge. Sanctioned one-off (audit).
    glyph = Glyph ? <Glyph size={12} aria-hidden="true" /> : null;
  } else if (icon) {
    // a custom icon node (true is handled above; false / undefined render nothing)
    glyph = icon;
  }

  // The content register drops the uppercase/mono/tracking so the label reads as
  // words. Only overrides the three type properties; tone/emphasis fills are kept.
  const casedStyle: CSSProperties =
    textCase === "title"
      ? { ...style, fontFamily: "var(--font-body)", textTransform: "none", letterSpacing: "normal" }
      : textCase === "sentence"
        ? { ...style, fontFamily: "var(--font-body)", fontSize: "var(--type-xs)", fontWeight: tokenNumber("var(--weight-medium)"), textTransform: "none", letterSpacing: "normal" }
        : style;

  return (
    <span data-mw-badge="" data-tone={tone} data-emphasis={emphasis} data-case={textCase} style={casedStyle}>
      {glyph}
      {children}
    </span>
  );
}

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2xs)",
  padding: "var(--space-3xs) var(--space-xs)",
  // v6.30.0: the chip reads the PILL posture token rather than --component-radius: square at
  // sharp (the mother, the HQ), --raw-radius-sm at soft, a true pill at pronounced. The dial
  // keeps its authority at sharp and states its posture above it; a chip's roundness carries
  // no meaning, so it never exempts itself the way a radio or a status dot does (HQ v7 system
  // pass, theme 4, option B; the token already served Switch and Slider).
  borderRadius: "var(--control-pill-radius)",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  // The chip's height is its type rung plus one 3xs pad each side. It inherited the body's
  // prose leading (1.5) until v6.30.0 and stood about four pixels over the 2xs rung; tight
  // leading is the control convention every kit control pins (CG-1).
  lineHeight: "var(--leading-tight)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

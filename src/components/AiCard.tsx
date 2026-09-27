import { CSSProperties, ReactNode } from "react";
import { AiGenerate } from "@carbon/icons-react";
import { Card } from "./Card";

/* ============================================================
   AiCard — the shell for every non-chat AI moment (v4.3.0, from the
   ArtistHQ handoff: the dashboard nudge, the reflection offered on a
   log entry, the inline critique prompt on a detail page).

   COMPOSES Card exactly as CalloutCard does: the 2px accent left rule
   IS Card's accent prop, untouched. What AiCard adds is the AI voice:
   a fixed machine-attribution eyebrow (the twinkle glyph + a mono
   uppercase line in the accent ink) that marks generated content as
   generated, a body whose face follows the variant, and an actions
   row. PRESENTATIONAL ONLY: no API call lives here; the consumer
   fetches and passes body (and flips loading while it waits).

   Variants are voices, not layouts. nudge speaks in the plain body
   face (a suggestion in app copy); reflection and critique speak in
   the display italic (the quoted-observation voice ProvenanceQuote
   and PromptedTextarea's diary mode established), because their body
   reads as something said back to the user.

   loading renders the thinking line in place of the body (italic,
   tertiary) and marks the region aria-busy. The actions row STAYS
   MOUNTED while loading (D21, 27 Aug 2026): it used to unmount, which
   destroyed the button the user had just pressed (Regenerate, Ask
   again) and dropped focus to <body>, and nothing brought it back
   when the row remounted. Focus survives only if the node does. The
   consumer owns those Buttons, so standing them down while loading is
   the consumer's call (pass aria-disabled, or swap the label); AiCard
   does not reach into the actions node. Do not put inert on the row: inert
   on an ancestor blurs the focused descendant, the exact bug.

   And do NOT pass the native `disabled` here (corrected 27 Aug 2026,
   pass 4): the attribute blurs the control the moment it is set, so it
   re-creates one level down exactly the focus loss that keeping this row
   mounted was meant to fix. Button reads `aria-disabled` as the in-flight
   idiom instead: it takes the disabled look, stands its hover and label
   motion down, and cancels the click, while staying focusable.

   Server component (Card's compound is the grandfathered server
   pattern; there is no state here).
   ============================================================ */

export type AiCardVariant = "nudge" | "reflection" | "critique";

export interface AiCardProps {
  /** The voice: nudge = plain body; reflection / critique = display italic. Default "nudge". */
  variant?: AiCardVariant;
  /** The machine-attribution line beside the twinkle glyph, e.g. "From the Companion". */
  eyebrow: string;
  /** The generated content. Ignored while loading. */
  body?: ReactNode;
  /** Action row under the body, typically Buttons. Stays mounted while
   *  loading so a focused action keeps focus; stand your own actions down
   *  with aria-disabled while loading if they must not fire twice (the
   *  native attribute would blur the action the user just pressed, which
   *  is the bug keeping the row mounted was meant to fix). */
  actions?: ReactNode;
  /** Waiting on generation: the thinking line replaces the body; actions stay. */
  loading?: boolean;
  /** The thinking line's copy. Default "thinking…". */
  loadingLabel?: string;
}

export function AiCard({
  variant = "nudge",
  eyebrow,
  body,
  actions,
  loading = false,
  loadingLabel = "thinking…",
}: AiCardProps) {
  const spoken = variant === "reflection" || variant === "critique";
  return (
    <Card accent="accent">
      <Card.Body>
        <div style={stackStyle} aria-busy={loading || undefined}>
          <div style={eyebrowRowStyle}>
            <AiGenerate size={16} aria-hidden="true" style={glyphStyle} />
            <span style={eyebrowTextStyle}>{eyebrow}</span>
          </div>
          {loading ? (
            <div style={thinkingStyle}>{loadingLabel}</div>
          ) : body != null ? (
            <div style={spoken ? spokenBodyStyle : plainBodyStyle}>{body}</div>
          ) : null}
          {/* Outside the loading branch on purpose: see the header (D21). */}
          {actions != null ? <div style={actionsStyle}>{actions}</div> : null}
        </div>
      </Card.Body>
    </Card>
  );
}

/* ---------- inline styles ---------- */

const stackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
  width: "100%",
  minWidth: 0,
};

const eyebrowRowStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-3xs)",
};

// The attribution ink is the accent as FOREGROUND (the v4.1.0 role split),
// glyph and text together, so the AI marker holds AA on both themes.
const glyphStyle: CSSProperties = {
  flexShrink: 0,
  color: "var(--accent-ink)",
};

const eyebrowTextStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--accent-ink)",
};

const plainBodyStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};

// The quoted-observation voice: the display italic the diary components
// established. Primary ink: this is the card's content, not its caption.
// --font-quote, not --font-display (D28): the quoted-italic lever, which defaults to the
// display face, so this is the same face it has always been.
const spokenBodyStyle: CSSProperties = {
  fontFamily: "var(--font-quote)",
  fontStyle: "italic",
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-primary)",
};

// The thinking line is the same italic voice, so it takes the same lever (D28): a fork whose
// display face has no italic must not flip the body and leave this line on the slant.
const thinkingStyle: CSSProperties = {
  fontFamily: "var(--font-quote)",
  fontStyle: "italic",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-tertiary)",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-sm)",
  marginTop: "var(--space-2xs)",
};

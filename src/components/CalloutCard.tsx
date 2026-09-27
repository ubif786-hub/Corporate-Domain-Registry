import { CSSProperties, ReactNode } from "react";
import { Card } from "./Card";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   CalloutCard — the full-width accent-rule callout (Sprint 3A,
   from the ArtistHQ handoff: CommissionCallout, the rework
   banner, the digest opening).

   COMPOSES Card: the 2px colored left rule IS Card's v3.9.0
   accent prop, untouched, so this component re-implements
   nothing of the card surface. What CalloutCard adds over a raw
   Card is the fixed callout arrangement and voice: an icon in
   the tone's ink, the title / body ladder, an optional thumb
   pinned to the row's end, and an actions row under the body.
   If you need any other arrangement, reach for Card accent
   directly; this is the opinionated one-row callout only.

   Tones: "accent" is the brand voice (--accent-base, the
   handoff's magenta translated per the standing law); success /
   warning / danger speak through --status-*-text so the icon ink
   holds AA beside body text on both themes (the rule underneath
   uses Card's own --status-*-accent solids).

   Server component (Card's static-property compound is the
   grandfathered server pattern; composing it keeps CalloutCard
   server too).
   ============================================================ */

export type CalloutCardTone = "accent" | "info" | "success" | "warning" | "danger";

export interface CalloutCardProps {
  /** The callout tone: the left rule (via Card accent) + the icon ink. Default "accent".
   *  `false` (v4.8.0) opts OUT of the left rule entirely; the flat callout: same
   *  icon / title / body / actions ladder on a plain Card, for layouts where the
   *  2px rule fights the card radius. The icon keeps the brand accent ink.
   *  `tone` is the canonical name for the status axis (the house majority:
   *  Badge, Toast, EmptyState, ProgressBar). */
  tone?: CalloutCardTone | false;
  /** Leading glyph, rendered in the tone's ink (pass a Carbon icon element). */
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  /** Media slot pinned to the row's end (an Image, a gradient block). */
  thumb?: ReactNode;
  /** Action row under the body, typically Buttons. */
  actions?: ReactNode;
}

// The icon inks: text-grade tones (AA beside body copy), not the rule solids.
const ACCENT_INK: Record<CalloutCardTone, string> = {
  accent: "var(--accent-ink)",
  // info (v4.10.2): the neutral-informational tone. Card accent and AccentRule
  // both already carried "info" and the --status-info-* trio already existed;
  // only CalloutCard never exposed it, so the house stand-in was accent + an
  // Information icon. Now it is a real tone.
  info: "var(--status-info-text)",
  success: "var(--status-success-text)",
  warning: "var(--status-warning-text)",
  danger: "var(--status-danger-text)",
};

export function CalloutCard({ tone = "accent", icon, title, body, thumb, actions }: CalloutCardProps) {
  // The `accent` alias was REMOVED at v5.0.0; `tone` carries the default directly now.
  // A default only fills in for undefined, so an explicit tone={false} still passes through.
  const resolved = tone;
  // tone={false} → the flat callout: no left rule, brand accent ink on the icon.
  const flat = resolved === false;
  return (
    <Card accent={flat ? undefined : resolved}>
      <Card.Body>
        <div style={rowStyle}>
          {icon ? (
            <span aria-hidden="true" style={{ ...iconStyle, color: flat ? "var(--accent-ink)" : ACCENT_INK[resolved] }}>
              {icon}
            </span>
          ) : null}
          <div style={contentStyle}>
            <div style={titleStyle}>{title}</div>
            {body != null ? <div style={bodyStyle}>{body}</div> : null}
            {actions != null ? <div style={actionsStyle}>{actions}</div> : null}
          </div>
          {thumb != null ? <div style={thumbStyle}>{thumb}</div> : null}
        </div>
      </Card.Body>
    </Card>
  );
}

/* ---------- inline styles ---------- */

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--space-md)",
  width: "100%",
};

const iconStyle: CSSProperties = {
  display: "inline-flex",
  flex: "0 0 auto",
  // Optical alignment with the title's cap height.
  marginTop: "var(--space-3xs)",
};

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
  minWidth: 0,
  flex: "1 1 auto",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-md)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-primary)",
};

const bodyStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-sm)",
  marginTop: "var(--space-2xs)",
};

const thumbStyle: CSSProperties = {
  flex: "0 0 auto",
  maxWidth: "8rem", // thumb cap: the callout art never outgrows its text column; deliberate fixed geometry
  overflow: "hidden",
  borderRadius: "var(--component-radius)",
};

import { CSSProperties } from "react";

/* ============================================================
   ProgressBar — a token-pure determinate meter: a rounded track with a fill
   sized to value/max, an optional label and value readout above it. Promoted
   to the mother from the Learn wave's fork-local course bar (studio-moonlight);
   generalized to any measured quantity — a task's completion, storage used, a
   quota, a multi-step form's progress.

   The width is the only datum; every colour, space, radius and font is a token.
   `tone` recolours fill + track as a matched pair: "accent" (default, the brand
   fill) for neutral progress, "neutral" for a quiet non-branded meter, and
   "success" / "warning" / "danger" to read a value against a threshold. The fill
   animates its width on the shared motion token, which the token layer collapses
   to still under prefers-reduced-motion — so the bar is reduced-motion safe by
   construction, no local guard.

   `size` picks the bar's weight: "sm" (default, 0.375rem) is the inline meter
   that sits inside a card or a row of text; "lg" (1rem) is the meter that IS the
   row, carrying a status a reader scans down a list. Only the track height
   changes; the header, the readout and the geometry are shared, because a
   thicker bar is a different emphasis, not a different component.

   size + danger arrive together in v5.2.0 from readilyhome's fork-local
   LifespanMeter, which was this file with exactly those two deltas. Rule 5: the
   donor retires its copy in the same release.

   role="progressbar" with aria-valuemin/max/now (now/max in the value's own
   units, not a percentage); name it via `ariaLabel` or the visible `label`.
   Server component: presentational, no hooks.
   ============================================================ */

export type ProgressTone = "accent" | "neutral" | "success" | "warning" | "danger";

/** Bar weight. "sm" is the inline meter; "lg" is the meter that carries a row. */
export type ProgressSize = "sm" | "lg";

export interface ProgressBarProps {
  /** The current value, clamped into [0, max]. */
  value: number;
  /** The value that reads as full. Default 100. */
  max?: number;
  /** Fill + track colour pairing. Default "accent". */
  tone?: ProgressTone;
  /** Bar weight: "sm" (0.375rem, default) or "lg" (1rem). */
  size?: ProgressSize;
  /** A visible label shown above the track (also the accessible name if no ariaLabel). */
  label?: string;
  /** Show a "{value} / {max}" readout at the end of the header row. */
  showValue?: boolean;
  /** Accessible name for the meter. Falls back to `label`; supply one when neither is visible. */
  ariaLabel?: string;
}

/* Each tone is a matched pair: a solid fill over its own faint track wash, so
   the empty remainder always belongs to the same colour family as the fill. */
const TONE_FILL: Record<ProgressTone, string> = {
  accent: "var(--accent-base)",
  neutral: "var(--text-positive-secondary)",
  success: "var(--status-success-accent)",
  warning: "var(--status-warning-accent)",
  danger: "var(--status-danger-accent)",
};
const TONE_TRACK: Record<ProgressTone, string> = {
  accent: "var(--accent-wash-strong)",
  neutral: "var(--border-positive-secondary)",
  success: "var(--status-success-bg)",
  warning: "var(--status-warning-bg)",
  danger: "var(--status-danger-bg)",
};

/* Bar heights are structural geometry, the same sanctioned rem literals the
   track already carried: 0.375rem is the 6px inline meter, 1rem the 16px row
   meter (~2.7x) that readilyhome's LifespanMeter established. */
const SIZE_HEIGHT: Record<ProgressSize, string> = {
  sm: "0.375rem",
  lg: "1rem",
};

export function ProgressBar({
  value,
  max = 100,
  tone = "accent",
  size = "sm",
  label,
  showValue = false,
  ariaLabel,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.max(0, Math.min(safeMax, value));
  const pct = (clamped / safeMax) * 100;
  const showHeader = Boolean(label) || showValue;

  return (
    <div style={rootStyle}>
      {showHeader ? (
        <div style={headerStyle}>
          {label ? <span style={labelStyle}>{label}</span> : null}
          {showValue ? (
            <span style={valueStyle}>
              {clamped} / {safeMax}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={ariaLabel ?? label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        style={{ ...trackStyle, height: SIZE_HEIGHT[size], background: TONE_TRACK[tone] }}
      >
        <div
          aria-hidden="true"
          style={{ ...fillStyle, width: `${pct}%`, background: TONE_FILL[tone] }}
        />
      </div>
    </div>
  );
}

/* ---------- inline styles (token-pure) ---------- */

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  width: "100%",
  minWidth: 0,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "var(--space-sm)",
  minWidth: 0,
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-secondary)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
};

// Pushed to the end of the row so the readout right-aligns whether or not a
// label precedes it; monospace so the digits sit still as the value ticks.
const valueStyle: CSSProperties = {
  marginInlineStart: "auto",
  flexShrink: 0,
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  letterSpacing: "var(--tracking-snug)",
  color: "var(--text-positive-tertiary)",
  fontVariantNumeric: "tabular-nums",
};

const trackStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  // height arrives per-size from SIZE_HEIGHT, so the two weights cannot drift
  // apart here and in the map.
  borderRadius: "var(--control-pill-radius, var(--radius-full))" /* v4.8.0: tracks ride the pill dial (see SESSION_LOG 20 Jul) */,
  overflow: "hidden",
};

const fillStyle: CSSProperties = {
  height: "100%",
  borderRadius: "var(--control-pill-radius, var(--radius-full))" /* v4.8.0: tracks ride the pill dial (see SESSION_LOG 20 Jul) */,
  // Reduced-motion safe: --motion-duration collapses to still under the OS
  // preference (tokens.css !important reset), so this transition zeroes out.
  transition: "width var(--motion-transition)",
};

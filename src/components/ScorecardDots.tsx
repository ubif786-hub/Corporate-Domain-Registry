"use client";

import { CSSProperties, useId, useState } from "react";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   ScorecardDots — the N-dot tap-to-score control (v3.10.0, from the ArtistHQ
   handoff: TechniqueDot3 generalized. Learn technique tree, technique detail).

   DECISION (recorded per the handoff's "study Rating first" instruction):
   this is a NEW component, not a Rating extension. Rating is deliberately a
   zero-JS SERVER component: a native radio group that cannot represent the
   handoff's un-fill gesture (a checked radio cannot uncheck without JS), and
   its star glyphs, hover-preview cascade, and form-first API are its own
   contract. Bolting a client tap-to-score and a danger "gap" voice onto it
   would have made every Rating consumer pay for client JS. What DOES carry
   over is Rating's interaction grammar: the dots are a real radio group
   (native inputs, one per score), so arrow keys move and select exactly as
   they do on Rating, for free.

   Tap-to-score: tapping dot N fills to N; tapping the LAST FILLED dot again
   un-fills it by one (value N -> N-1), so a score can be corrected downward
   to zero. Space on the focused checked dot does the same (activation fires
   click). Fill is --accent-base; with `gap` the whole row speaks the danger
   voice (--status-danger-text) and carries the mono "gap" tag.

   Controlled (value + onChange) or uncontrolled (defaultValue); `name`
   submits the current score through a hidden input.
   ============================================================ */

export interface ScorecardDotsProps {
  /** The scored skill; names the radio group. */
  label: string;
  /** Number of dots. */
  maxDots?: number;
  /** Controlled score (0..maxDots); pair with onChange. */
  value?: number;
  /** Uncontrolled initial score. */
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** The danger flag: label, dots, and tag render in the danger voice. */
  gap?: boolean;
  disabled?: boolean;
  /** Submitted form field name (hidden input carries the score). */
  name?: string;
  id?: string;
}

const DOT_PX = 11; // structural glyph geometry, same tier as Timeline's 6px dot

export function ScorecardDots({
  label,
  maxDots = 3,
  value,
  defaultValue = 0,
  onChange,
  gap = false,
  disabled = false,
  name,
  id: idProp,
}: ScorecardDotsProps) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const [inner, setInner] = useState(defaultValue);
  const score = value !== undefined ? value : inner;

  const set = (n: number) => {
    if (value === undefined) setInner(n);
    onChange?.(n);
  };

  // Tap dot N: fills to N; tapping the last filled dot un-fills it (N -> N-1).
  const tap = (n: number) => set(n === score ? n - 1 : n);

  const ink = gap ? "var(--status-danger-text)" : undefined;

  return (
    <div
      data-mw-scorecard=""
      data-gap={gap ? "true" : "false"}
      data-disabled={disabled ? "true" : "false"}
      style={rootStyle}
    >
      <style href="magentaweb-scorecard-dots" precedence="default">{scorecardCss}</style>
      <span style={{ ...labelStyle, color: ink ?? "var(--text-positive-primary)" }}>{label}</span>
      <span
        role="radiogroup"
        aria-label={gap ? `${label}, gap flagged` : label}
        style={dotRowStyle}
      >
        {Array.from({ length: maxDots }, (_, i) => {
          const n = i + 1;
          const filled = n <= score;
          return (
            <label key={n} data-mw-scorecard-dot="" style={dotLabelStyle}>
              <input
                type="radio"
                name={`${id}-score`}
                value={n}
                checked={n === score}
                onChange={() => {}}
                onClick={() => tap(n)}
                disabled={disabled}
                aria-label={`${n} of ${maxDots}`}
                style={srOnly}
              />
              <span
                aria-hidden="true"
                style={{
                  ...dotStyle,
                  background: filled ? (ink ?? "var(--accent-base)") : "transparent",
                  border: filled
                    ? "none"
                    : `1.5px solid ${gap ? "var(--status-danger-text)" : "var(--border-positive-secondary)"}`,
                }}
              />
            </label>
          );
        })}
      </span>
      {gap ? (
        <span style={gapTagStyle} aria-hidden="true">
          gap
        </span>
      ) : null}
      {name ? <input type="hidden" name={name} value={score} /> : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-xs)",
};

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  transition: "color var(--motion-transition)",
};

const dotRowStyle: CSSProperties = {
  display: "inline-flex",
  gap: "var(--space-3xs)",
  alignItems: "center",
};

const dotLabelStyle: CSSProperties = {
  display: "inline-flex",
  // WCAG 2.5.8: the LABEL is the hit target (the radio inside it is srOnly), so
  // the floor goes here and the painted glyph is untouched. Centring keeps the
  // glyph where it was; only the box around it grows.
  // Measured before: 11x11 boxes at 13.1px centres (12.6 on the compact dial),
  // which fails the 24px minimum AND the spacing exception. The row grows from
  // about 37px wide to about 78px; that spread IS the fix and cannot be avoided,
  // because hit areas cannot overlap.
  minWidth: "var(--target-min)",
  minHeight: "var(--target-min)",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  borderRadius: "var(--radius-full)", // structural: the dot is a circle
};

const dotStyle: CSSProperties = {
  width: DOT_PX,
  height: DOT_PX,
  boxSizing: "border-box",
  borderRadius: "var(--radius-full)",
  transition: "background var(--motion-transition), border-color var(--motion-transition)",
};

const gapTagStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--status-danger-text)",
  lineHeight: "var(--leading-snug)",
};

const scorecardCss = `
/* The srOnly input's containing block (see the contract in internal/styles.ts). */
[data-mw-scorecard-dot] {
  position: relative;
}
[data-mw-scorecard-dot]:has(input:focus-visible) {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
[data-mw-scorecard][data-disabled="true"] {
  opacity: 0.5;
  pointer-events: none;
}
`;

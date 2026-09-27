"use client";

import { ChangeEvent, CSSProperties, ReactNode, useEffect, useState } from "react";
import { srOnly } from "@/components/internal/styles";
import { FieldMarking, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   Switch — an immediate on/off toggle. Named Switch (not Toggle) to
   match Carbon, Apple HIG, Radix, and Material: the word signals a
   setting that takes effect the moment it flips, versus Checkbox's
   deferred "submit the form" semantics.

   A real <input type="checkbox" role="switch"> stays in the DOM,
   visually hidden but focusable and form-submittable, so the native
   control is the single source of truth and the platform exposes the
   switch state to assistive tech. A styled track + thumb render the
   visual; the thumb slides via a transform transition on the motion
   dial. Click the label or the track to toggle; Space toggles when
   the control has focus.
   ============================================================ */

type SwitchSize = "sm" | "md";

export interface SwitchProps {
  id: string;
  label?: ReactNode;
  /** Names the switch WITHOUT a visible label, for a toggle already named by its row (a
   *  settings list whose row text is the name). Applied to the native input only when `label`
   *  is absent, the Radio idiom; ignored otherwise. Without either the switch has no name at
   *  all, and dev builds warn. */
  ariaLabel?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  helper?: ReactNode;
  /** Error line below, replacing the helper, with role="alert". A bare `true` styles the field
   *  invalid (aria-invalid) WITHOUT a message: the helper stays and no empty alert is emitted. */
  error?: ReactNode;
  size?: SwitchSize;
}

export function Switch({
  id,
  label,
  ariaLabel,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  required = false,
  marking,
  helper,
  error,
  size = "md",
}: SwitchProps) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked ?? false);
  const isChecked = isControlled ? checked : internal;

  const hasError = Boolean(error);
  // A bare `true` flags the field invalid without a message: aria-invalid still keys off
  // hasError, but the message branch below needs real text, so the helper stays rendered and
  // aria-describedby keeps naming it (27 Aug 2026; the Checkbox note).
  const errorMessage: ReactNode = error === true ? null : error;
  const hasErrorMessage = hasError && errorMessage != null;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = hasErrorMessage ? errorId : helper ? helperId : undefined;

  // Dev-only: a switch with neither a label nor ariaLabel has no accessible name (the Modal
  // slot-versus-prop warning is the precedent).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && !label && !ariaLabel) {
      console.warn(
        `Switch "${id}": no accessible name. Pass \`label\`, or \`ariaLabel\` when the name is visible elsewhere.`,
      );
    }
  }, [id, label, ariaLabel]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternal(e.target.checked);
    onChange?.(e.target.checked);
  };

  return (
    <div style={rootStyle} data-mw-switch="">
      <style href="magentaweb-switch" precedence="default">{switchCss}</style>

      <label htmlFor={id} data-disabled={disabled ? "true" : "false"} style={labelRowStyle}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={isChecked}
          aria-checked={isChecked}
          disabled={disabled}
          required={required}
          aria-label={label ? undefined : ariaLabel}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
          style={srOnly}
        />
        <span
          data-mw-switch-track=""
          data-size={size}
          data-checked={isChecked ? "true" : "false"}
          aria-hidden="true"
        >
          <span data-mw-switch-thumb="" data-size={size} />
        </span>
        {label ? (
          <span style={labelTextStyle}>
            {label}
            <FieldMarking marking={resolveMarking(marking, required)} />
          </span>
        ) : null}
      </label>

      {/* Keyed so React REPLACES the node when the helper gives way to the error, instead of
          flipping role="alert" onto a node already in the tree (announced unreliably; the
          Checkbox note, 27 Aug 2026). */}
      {hasErrorMessage ? (
        <p key="error" id={errorId} role="alert" style={errorStyle}>{errorMessage}</p>
      ) : helper ? (
        <p key="helper" id={helperId} style={helperStyle}>{helper}</p>
      ) : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
};

const labelRowStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--switch-label-gap)",
  // WCAG 2.5.8 floor on the LABEL (26 Aug 2026, owner): a bare Switch is a 36x20 track; the row
  // now measures at least --target-min tall.
  minHeight: "var(--target-min)",
  minWidth: "var(--target-min)",
};

const labelTextStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-primary)",
  lineHeight: "var(--leading-snug)",
};

const helperStyle: CSSProperties = {
  margin: 0,
  marginTop: "var(--space-2xs)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  // A-041: helper text conveys info, needs AA 4.5:1.
  color: "var(--text-positive-secondary)",
};

const errorStyle: CSSProperties = {
  margin: 0,
  marginTop: "var(--space-2xs)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--status-danger-text)",
};

const switchCss = `
/* cursor in the SHEET so the disabled not-allowed rule can win (audit F7).
   position too, and deliberately NOT inline: the label is the srOnly input's
   containing block (see the contract in internal/styles.ts), but a composer
   that repositions the indicator against its own frame must be able to
   override it back to static, as ChoiceCard's image variant does. */
label:has([data-mw-checkbox-box]), label:has([data-mw-switch-track]) {
  cursor: pointer;
  position: relative;
}
[data-mw-switch] label[data-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}
[data-mw-switch-track] {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  /* v4.8.0: pill geometry rides the radius dial — square at sharp, squircle at
     soft, the classic pill at pronounced (see --control-pill-radius). */
  border-radius: var(--control-pill-radius, var(--radius-full));
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
  transition:
    background var(--motion-transition),
    border-color var(--motion-transition);
}
/* Track and thumb pairs (36/20 with 16 thumb, 28/16 with 12 thumb) are control
   geometry: dial-independent and paired to keep the thumb inset symmetric.
   Deliberately fixed px per the ScorecardDots convention. */
[data-mw-switch-track][data-size="md"] { width: 36px; height: 20px; }
[data-mw-switch-track][data-size="sm"] { width: 28px; height: 16px; }
[data-mw-switch-track][data-checked="true"] {
  background: var(--accent-base);
  border-color: transparent;
}
[data-mw-switch-thumb] {
  position: absolute;
  top: 50%;
  left: 0;
  /* The thumb follows the track's posture, NESTED: a shape inset 2px inside a
     rounded slot wants outer-radius minus the inset, or it reads rounder than
     its slot (visible at soft). Clamped at 0 (sharp: square in square) and
     unaffected at pronounced (full pill minus 2px is still a pill). */
  border-radius: max(0px, calc(var(--control-pill-radius, var(--radius-full)) - 2px));
  background: var(--switch-thumb-bg);
  box-shadow: var(--shadow-subtle);
  transform: translate(2px, -50%);
  transition: transform var(--motion-transition);
}
[data-mw-switch-thumb][data-size="md"] { width: 16px; height: 16px; }
[data-mw-switch-thumb][data-size="sm"] { width: 12px; height: 12px; }
/* A CHECKED thumb sits on the accent fill, so it takes the accent's own ink,
   --text-on-accent, the token every brand already contrast-tunes against
   --accent-base (15 Sep 2026). --switch-thumb-bg is a constant light rung, which
   is right on the unchecked neutral track and on a dark accent, and wrong wherever
   the accent turns light: readilyhome's dark powder measured 2.31:1 under the
   white thumb, and the same shape is live on every fork that flips its on-accent
   ink dark (global-medical-services, meridian, zafiro) and on the mother's own
   inverted and dark bands, whose accent lifts to lighten-40. Read at the use site,
   not through a derived token, so a band that remaps --text-on-accent carries the
   thumb with it. */
[data-mw-switch-track][data-checked="true"] [data-mw-switch-thumb] {
  background: var(--text-on-accent);
}
[data-mw-switch-track][data-checked="true"] [data-mw-switch-thumb][data-size="md"] {
  transform: translate(18px, -50%);
}
[data-mw-switch-track][data-checked="true"] [data-mw-switch-thumb][data-size="sm"] {
  transform: translate(14px, -50%);
}
[data-mw-switch] input:focus-visible + [data-mw-switch-track] {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

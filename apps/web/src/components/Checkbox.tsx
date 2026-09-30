"use client";

import { ChangeEvent, CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { Checkmark, Subtract } from "@carbon/icons-react";
import { srOnly } from "@/components/internal/styles";
import { FieldMarking, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   Checkbox — a single boolean field. Standalone rather than compound:
   a checkbox has no sub-parts worth composing, so the Input family's
   depth would be overhead here.

   A real <input type="checkbox"> stays in the DOM, visually hidden but
   focusable and form-submittable, so screen readers and native form
   behaviour work unchanged. A sibling <span> draws the custom box and
   reflects checked / indeterminate / error / disabled via data
   attributes. Indeterminate is set imperatively (the platform exposes
   it only through the DOM property) and takes visual precedence over
   checked, matching the parent-of-children selection pattern.
   ============================================================ */

export interface CheckboxProps {
  id: string;
  label?: ReactNode;
  /** Names the control WITHOUT a visible label, for a checkbox already named by its row (a
   *  select-all header, a table row's pick). Applied to the native input only when `label` is
   *  absent, the Radio idiom; ignored otherwise, since the label is then the accessible name.
   *  Without either the input has no name at all, and dev builds warn. */
  ariaLabel?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  indeterminate?: boolean;
  helper?: ReactNode;
  /** Error line below, replacing the helper, with role="alert". A bare `true` styles the field
   *  invalid (aria-invalid, the error border) WITHOUT a message: the helper stays and no empty
   *  alert is emitted. */
  error?: ReactNode;
}

export function Checkbox({
  id,
  label,
  ariaLabel,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  required = false,
  marking,
  indeterminate = false,
  helper,
  error,
}: CheckboxProps) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState(defaultChecked ?? false);
  const isChecked = isControlled ? checked : internal;

  const hasError = Boolean(error);
  // A bare `true` flags the field invalid without a message: aria-invalid and the error border
  // still key off hasError, but the message branch below needs real text, so the helper stays
  // rendered and aria-describedby keeps naming it (27 Aug 2026). Before this an empty
  // <p role="alert"> replaced the helper and the field was described by nothing.
  const errorMessage: ReactNode = error === true ? null : error;
  const hasErrorMessage = hasError && errorMessage != null;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = hasErrorMessage ? errorId : helper ? helperId : undefined;

  const ref = useRef<HTMLInputElement>(null);

  // Dev-only: a checkbox with neither a label nor ariaLabel has no accessible name at all.
  // Modal's slot-versus-prop warning is the precedent for surfacing a footgun this way.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && !label && !ariaLabel) {
      console.warn(
        `Checkbox "${id}": no accessible name. Pass \`label\`, or \`ariaLabel\` when the name is visible elsewhere.`,
      );
    }
  }, [id, label, ariaLabel]);

  // indeterminate is a DOM property, not an attribute, so it must be set on
  // the node directly. Keep it in sync with the prop.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternal(e.target.checked);
    onChange?.(e.target.checked);
  };

  return (
    <div style={rootStyle} data-mw-checkbox="">
      <style href="magentaweb-checkbox" precedence="default">{checkboxCss}</style>

      <label htmlFor={id} data-disabled={disabled ? "true" : "false"} style={labelRowStyle}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={isChecked}
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
          data-mw-checkbox-box=""
          data-checked={isChecked ? "true" : "false"}
          data-indeterminate={indeterminate ? "true" : "false"}
          data-error={hasError ? "true" : "false"}
          aria-hidden="true"
          style={boxStyle}
        >
          {indeterminate ? (
            <Subtract size={14} style={glyphStyle} />
          ) : isChecked ? (
            <Checkmark size={14} style={glyphStyle} />
          ) : null}
        </span>
        {label ? (
          <span style={labelTextStyle}>
            {label}
            <FieldMarking marking={resolveMarking(marking, required)} />
          </span>
        ) : null}
      </label>

      {/* Keyed so React REPLACES the node when the helper gives way to the error. Unkeyed, the
          same <p> was reused in place and merely gained role="alert", a live region born on a
          node already in the tree, which assistive tech announces unreliably (engine-dependent;
          27 Aug 2026). Two keys, one per branch, so the intent reads at the site. */}
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
  gap: "var(--space-sm)",
  // WCAG 2.5.8 floor on the LABEL, which is what a finger hits (26 Aug 2026, owner): a bare
  // Checkbox with no text is an 18px mark; the row now measures at least --target-min both ways.
  minHeight: "var(--target-min)",
  minWidth: "var(--target-min)",
};

const boxStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "var(--control-mark)",
  height: "var(--control-mark)",
  // Not --component-radius directly: on an 18px mark the soft and pronounced dials
  // round this into a circle, which is Radio's shape and Radio's meaning. The
  // capped token still tracks the dial, it just cannot become a radio.
  borderRadius: "var(--control-mark-radius)",
  color: "var(--text-on-accent)",
  transition:
    "background var(--motion-transition), border-color var(--motion-transition)",
};

const glyphStyle: CSSProperties = {
  // Scale-in draw on check, collapsing to instant under reduced motion.
  animation: "mw-check-in var(--motion-duration) var(--motion-ease) both",
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

const checkboxCss = `
/* cursor in the SHEET so the disabled not-allowed rule can win (audit F7).
   position too, and deliberately NOT inline: the label is the srOnly input's
   containing block (see the contract in internal/styles.ts), but a composer
   that repositions the indicator against its own frame must be able to
   override it back to static, as ChoiceCard's image variant does. */
label:has([data-mw-checkbox-box]), label:has([data-mw-switch-track]) {
  cursor: pointer;
  position: relative;
}
@keyframes mw-check-in {
  from { transform: scale(0); }
  to   { transform: scale(1); }
}
/* Base box surface lives here, NOT inline on boxStyle: an inline background
   would outrank the data-checked / data-indeterminate rules below (inline beats
   a same-origin stylesheet rule), so the accent fill would never paint and the
   white glyph would sit on the light surface in light theme (A-036). Keeping it
   in the sheet lets the checked rule override by normal cascade. */
[data-mw-checkbox-box] {
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
}
[data-mw-checkbox] label[data-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}
[data-mw-checkbox] label:hover [data-mw-checkbox-box]:not([data-checked="true"]):not([data-indeterminate="true"]) {
  border-color: var(--text-positive-tertiary);
}
[data-mw-checkbox-box][data-checked="true"],
[data-mw-checkbox-box][data-indeterminate="true"] {
  background: var(--accent-base);
  border-color: var(--accent-base);
  /* Pin the glyph colour to the on-accent token at the checked state itself,
     not only on the box base style. --text-on-accent is a constant near-white
     in BOTH themes (it is never overridden in the dark block) because the
     accent fill stays the same magenta hue family in light and dark, so the
     checkmark reads white on dark-magenta in light mode and white on the
     vivid magenta in dark mode. Setting it here means the glyph can never
     inherit the parent's --text-positive-primary, which flips to near-black
     in light mode and would render the mark invisible on the accent fill. */
  color: var(--text-on-accent);
}
[data-mw-checkbox-box][data-error="true"] {
  border-color: var(--border-error);
}
[data-mw-checkbox] input:focus-visible + [data-mw-checkbox-box] {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

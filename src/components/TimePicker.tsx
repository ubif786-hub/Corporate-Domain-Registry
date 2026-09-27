import { CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   TimePicker — a time-of-day field. DatePicker is date-only; this fills the
   gap for scheduling and datetime pairs.

   A SERVER component wrapping a native <input type="time">: no client JS, submits
   an "HH:MM" (or "HH:MM:SS") value in a plain form, and hands phones the OS time
   wheel. Named exports TimePicker (root: label + field + helper/error) and
   TimeField (bare). Where DatePicker earns a custom client calendar for date
   grids, time is a short, well-solved native control, so it stays server-native.

   Base background/border live in the hoisted sheet so the state rules win; the
   field shares Input/Select/Slider's tokens. color-scheme lets the browser paint
   the native picker indicator to match light and dark.
   ============================================================ */

export type TimePickerSize = "sm" | "md" | "lg";

type NativeTimeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size" | "value" | "defaultValue"
>;

export interface TimeFieldProps extends NativeTimeProps {
  /** Optional here: a bare field wrapped in an external <label> needs none. */
  id?: string;
  size?: TimePickerSize;
  error?: boolean;
  /** "HH:MM" (or "HH:MM:SS" with a seconds step). */
  value?: string;
  defaultValue?: string;
}

export interface TimePickerProps extends Omit<TimeFieldProps, "error"> {
  /** Required on the root: it wires the rendered label's htmlFor to the field. */
  id: string;
  label?: ReactNode;
  helper?: ReactNode;
  /** Error message. When set, the field turns error-styled and this renders below.
   *  A bare `true` styles the field invalid without a message. */
  error?: ReactNode;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
}

export function TimePicker({
  id,
  label,
  helper,
  error,
  required = false,
  marking,
  size = "md",
  disabled = false,
  value,
  defaultValue,
  ...rest
}: TimePickerProps) {
  const errorMessage = typeof error === "boolean" ? undefined : error;
  const hasError = error === true || Boolean(errorMessage);
  // A bare `true` styles the field invalid and carries no text, so the message
  // line is gated on a real message: the helper stays rendered and described,
  // and no empty alert is ever emitted. hasError keeps driving aria-invalid.
  const hasErrorMessage = Boolean(errorMessage);
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = hasErrorMessage ? errorId : helper ? helperId : undefined;

  return (
    <div data-mw-time="" style={rootStyle}>
      {label ? (
        <FieldLabel htmlFor={id} dataAttr="data-mw-time-label" marking={resolveMarking(marking, required)} style={labelBindStyle}>{label}</FieldLabel>
      ) : null}

      <TimeField
        id={id}
        size={size}
        error={hasError}
        disabled={disabled}
        required={required}
        value={value}
        defaultValue={defaultValue}
        aria-describedby={describedBy}
        {...rest}
      />

      {/* Keyed so React inserts the alert instead of mutating the helper node into
          it: role="alert" added to an element already in the DOM is the unreliable
          case for live regions. */}
      {hasErrorMessage ? (
        <p key="error" id={errorId} role="alert" data-mw-time-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : helper ? (
        <p key="helper" id={helperId} data-mw-time-helper="" style={helperStyle}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- TimeField ---------- */

export function TimeField({
  id,
  size = "md",
  error = false,
  disabled = false,
  value,
  defaultValue,
  ...rest
}: TimeFieldProps) {
  const controlled =
    value !== undefined ? { value } : defaultValue !== undefined ? { defaultValue } : {};
  return (
    <>
      <style href="magentaweb-time" precedence="default">{timeCss}</style>
      <input
        type="time"
        id={id}
        disabled={disabled}
        aria-invalid={error || undefined}
        data-mw-time-field=""
        data-size={size}
        data-error={error ? "true" : "false"}
        style={fieldStyle}
        {...controlled}
        {...rest}
      />
    </>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2xs)", alignItems: "flex-start" };



const fieldStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "var(--text-positive-primary)",
  borderRadius: "var(--component-radius)",
  outline: "none",
  transition:
    "border-color var(--motion-transition), background var(--motion-transition), box-shadow var(--motion-transition)",
};

// SECOND LAW (audit finding, 4 Sep 2026): see Input.tsx's identical note. The extra rung
// that used to double up here (root flex gap + marginTop) moves to the label instead
// (labelBindStyle, below).
const helperStyle: CSSProperties = {
  margin: 0, fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--text-positive-secondary)",
};
const errorStyle: CSSProperties = {
  margin: 0, fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--status-danger-text)",
};
const labelBindStyle: CSSProperties = {
  marginBottom: "var(--space-2xs)",
};

const timeCss = `
[data-mw-time-field] {
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
  /* CONTROL HEIGHT PARITY (AUD-2, 1 Sep 2026): the same missed-member fix as Search;
     see Input.tsx for the write-up. */
  line-height: var(--leading-tight);
  /* The native clock indicator paints per color-scheme. A literal 'light dark'
     followed the OS (invisible on a light app + dark OS); the mirrored
     --color-scheme token (tokens.css :root) tracks the data-theme dial instead,
     in both directions. */
  color-scheme: var(--color-scheme);
}
[data-mw-time-field][data-size="sm"] { font-size: var(--type-sm); padding: var(--space-xs) var(--space-sm); }
[data-mw-time-field][data-size="md"] { font-size: var(--type-md); padding: var(--space-sm) var(--space-md); }
[data-mw-time-field][data-size="lg"] { font-size: var(--type-lg); padding: var(--space-md); }
[data-mw-time-field]:hover:not(:focus):not(:disabled) { border-color: var(--text-positive-tertiary); }
[data-mw-time-field]:focus { border-color: var(--accent-base); background: var(--background-positive-primary); box-shadow: var(--shadow-focus); }
[data-mw-time-field]:disabled { opacity: 0.5; cursor: not-allowed; background: var(--background-positive-primary); }
[data-mw-time-field][data-error="true"] { border-color: var(--border-error); }
[data-mw-time-field][data-error="true"]:focus { box-shadow: var(--shadow-focus-error); }
[data-mw-time-field]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.7; }
[data-mw-time-field]:hover::-webkit-calendar-picker-indicator { opacity: 1; }
`;

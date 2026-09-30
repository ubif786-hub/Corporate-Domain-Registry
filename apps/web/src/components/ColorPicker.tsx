import { CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   ColorPicker — a colour swatch field.

   A SERVER component wrapping a native <input type="color">: no client JS,
   submits a hex value in a plain form, and opens the OS colour picker on click.
   Named exports ColorPicker (root: label + swatch + helper/error) and ColorField
   (bare swatch). The native swatch is restyled to the field family through the
   vendor swatch pseudo-elements; the box carries the token border, radius, and
   focus ring.
   ============================================================ */

export type ColorPickerSize = "sm" | "md" | "lg";

type NativeColorProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size" | "value" | "defaultValue"
>;

export interface ColorFieldProps extends NativeColorProps {
  /** Optional here: a bare field wrapped in an external <label> needs none. */
  id?: string;
  size?: ColorPickerSize;
  error?: boolean;
  /** A hex value, e.g. "#A759A1". */
  value?: string;
  defaultValue?: string;
}

export interface ColorPickerProps extends Omit<ColorFieldProps, "error"> {
  /** Required on the root: it wires the rendered label's htmlFor to the field. */
  id: string;
  label?: ReactNode;
  helper?: ReactNode;
  /** Error message. When set, the swatch turns error-styled and this renders below.
   *  A bare `true` styles the field invalid without a message. */
  error?: ReactNode;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
}

export function ColorPicker({
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
}: ColorPickerProps) {
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
    <div data-mw-color="" style={rootStyle}>
      {label ? (
        <FieldLabel htmlFor={id} dataAttr="data-mw-color-label" marking={resolveMarking(marking, required)}>{label}</FieldLabel>
      ) : null}

      <ColorField
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
        <p key="error" id={errorId} role="alert" data-mw-color-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : helper ? (
        <p key="helper" id={helperId} data-mw-color-helper="" style={helperStyle}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- ColorField ---------- */

export function ColorField({
  id,
  size = "md",
  error = false,
  disabled = false,
  value,
  defaultValue,
  ...rest
}: ColorFieldProps) {
  const controlled =
    value !== undefined ? { value } : defaultValue !== undefined ? { defaultValue } : {};
  return (
    <>
      <style href="magentaweb-color" precedence="default">{colorCss}</style>
      <input
        type="color"
        id={id}
        disabled={disabled}
        aria-invalid={error || undefined}
        data-mw-color-field=""
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
  // cursor lives in the hoisted sheet, not here: an inline declaration always beats
  // a sheet rule, so the :disabled { cursor: not-allowed } below could never win and
  // a disabled swatch still showed the pointer. Same fix Button, Checkbox, and Input
  // already carry.
  outline: "none",
  transition: "border-color var(--motion-transition), box-shadow var(--motion-transition)",
};

const helperStyle: CSSProperties = {
  margin: 0, marginTop: "var(--space-2xs)", fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--text-positive-secondary)",
};
const errorStyle: CSSProperties = {
  margin: 0, marginTop: "var(--space-2xs)", fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--status-danger-text)",
};

const colorCss = `
[data-mw-color-field] {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid var(--border-positive-secondary);
  border-radius: var(--component-radius);
  background: var(--background-positive-secondary);
  padding: var(--space-3xs);
}
/* Size names ride the control ramp one rung offset on purpose: the swatch reads
   smaller than its hit area suggests, so sm maps to the md rung and up the line.
   Do not realign the names to the ramp. */
[data-mw-color-field][data-size="sm"] { width: var(--control-size-md); height: var(--control-size-md); }
[data-mw-color-field][data-size="md"] { width: var(--control-size-xl); height: var(--control-size-xl); }
[data-mw-color-field][data-size="lg"] { width: var(--control-size-2xl); height: var(--control-size-2xl); }
[data-mw-color-field]::-webkit-color-swatch-wrapper { padding: 0; }
[data-mw-color-field]::-webkit-color-swatch { border: none; border-radius: calc(var(--component-radius) * 0.75); }
[data-mw-color-field]::-moz-color-swatch { border: none; border-radius: calc(var(--component-radius) * 0.75); }
[data-mw-color-field]:hover:not(:disabled) { border-color: var(--text-positive-tertiary); }
[data-mw-color-field]:focus { border-color: var(--accent-base); box-shadow: var(--shadow-focus); }
[data-mw-color-field] { cursor: pointer; }
[data-mw-color-field][data-error="true"] { border-color: var(--border-error); }
[data-mw-color-field][data-error="true"]:focus { box-shadow: var(--shadow-focus-error); }
[data-mw-color-field]:disabled { opacity: 0.5; cursor: not-allowed; }
`;

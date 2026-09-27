import { CSSProperties, ReactNode, Ref, TextareaHTMLAttributes } from "react";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   Textarea — the multi-line free-text form field.

   A SERVER component wrapping a native <textarea>: no client JS, submits in a
   plain <form> (server actions included). It stands alongside Input's textarea
   TYPE for cases that want a bare, zero-JS multi-line field without pulling the
   client Input family in (the same reason Select exists next to a hypothetical
   client combobox). Not a compound/context family: a server component cannot
   provide context, so the root renders label + field + helper/error from props,
   and TextareaField is a standalone named export.

   Base background/border live in the hoisted sheet (NOT inline) so the
   hover/focus/disabled/error/size rules win the cascade (Input's F1 lesson).
   Shares Input's field tokens exactly, so the two read as one family.

   The error and helper lines carry distinct keys so React mounts a fresh
   alert node instead of mutating the helper into one (a live region that
   arrives on an existing node is the documented-unreliable case), and a
   bare error={true} keeps the helper: hasError still drives aria-invalid and
   the invalid styling, but the message branch renders only for a real
   message, so no empty alert is ever emitted and aria-describedby always
   points at real text.

   [aria-disabled="true"] on the field mirrors the :disabled look. A composer
   in flight (ChatComposer) uses readOnly + aria-disabled instead of the
   native attribute so the field can keep focus across the round trip; the
   sheet makes that state read disabled all the same.
   ============================================================ */

export type TextareaSize = "sm" | "md" | "lg";

type NativeTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "defaultValue"
>;

export interface TextareaFieldProps extends NativeTextareaProps {
  /** Optional here: a bare field wrapped in an external <label> needs none. The
   *  Textarea root sets it so its own <label htmlFor> associates. */
  id?: string;
  size?: TextareaSize;
  error?: boolean;
  value?: string;
  defaultValue?: string;
  /** Reaches the native <textarea> (React 19 ref-as-prop). ChatComposer uses
   *  it to return focus to the field after a send. */
  ref?: Ref<HTMLTextAreaElement>;
}

export interface TextareaProps extends Omit<TextareaFieldProps, "error"> {
  /** Required on the root: it wires the rendered label's htmlFor to the field. */
  id: string;
  label?: ReactNode;
  helper?: ReactNode;
  /** Error message. When set, the field turns error-styled and this renders below it.
   *  A bare `true` styles the field invalid without a message. */
  error?: ReactNode;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  /* children removed (AUD-17, D44 carve-out, 2 Sep 2026): same copy-forward as Slider;
     it rode ...rest into React's textarea-children error path. Zero fleet consumers. */
}

export function Textarea({
  id,
  label,
  helper,
  error,
  required = false,
  marking,
  size = "md",
  disabled = false,
  rows = 4,
  value,
  defaultValue,
  ...rest
}: TextareaProps) {
  const errorMessage = typeof error === "boolean" ? undefined : error;
  const hasError = error === true || Boolean(errorMessage);
  // The message branch needs a real message; a bare `true` keeps the helper.
  const showErrorMessage = Boolean(errorMessage);
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = showErrorMessage ? errorId : helper ? helperId : undefined;

  return (
    <div data-mw-textarea="" style={rootStyle}>
      {label ? (
        <FieldLabel htmlFor={id} dataAttr="data-mw-textarea-label" marking={resolveMarking(marking, required)} style={labelBindStyle}>{label}</FieldLabel>
      ) : null}

      <TextareaField
        id={id}
        size={size}
        error={hasError}
        disabled={disabled}
        required={required}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        aria-describedby={describedBy}
        {...rest}
      />

      {showErrorMessage ? (
        <p key="error" id={errorId} role="alert" data-mw-textarea-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : helper ? (
        <p key="helper" id={helperId} data-mw-textarea-helper="" style={helperStyle}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- TextareaField ---------- */

export function TextareaField({
  id,
  size = "md",
  error = false,
  disabled = false,
  rows = 4,
  value,
  defaultValue,
  ref,
  ...rest
}: TextareaFieldProps) {
  const controlled =
    value !== undefined ? { value } : defaultValue !== undefined ? { defaultValue } : {};
  return (
    <>
      <style href="magentaweb-textarea" precedence="default">{textareaCss}</style>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        disabled={disabled}
        aria-invalid={error || undefined}
        data-mw-textarea-field=""
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

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  // Fill the container's inline size in a flex/grid parent (see Input rootStyle).
  alignSelf: "stretch",
};



// SECOND LAW (audit finding, 4 Sep 2026): see Input.tsx's identical note. The extra rung
// that used to double up here (root flex gap + this marginTop) moves to the label instead
// (labelBindStyle, below).
const helperStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-secondary)",
};

const errorStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--status-danger-text)",
};

const labelBindStyle: CSSProperties = {
  marginBottom: "var(--space-2xs)",
};

// Structural only; background/border/color live in the sheet so state rules win.
const fieldStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "var(--text-positive-primary)",
  borderRadius: "var(--component-radius)",
  outline: "none",
  width: "100%",
  resize: "vertical",
  // --space-fixed-4xl is 6rem at every spacing dial: the minimum height is control geometry,
  // which this system keeps dial-independent on purpose (the fixed family exists for exactly
  // this), and component code reads only semantic tokens (CLAUDE.md), never a raw rem literal.
  // See the sheet comment below for the "about four text rows" caveat this already carried.
  minHeight: "var(--space-fixed-4xl)",
  transition:
    "border-color var(--motion-transition), background var(--motion-transition), box-shadow var(--motion-transition)",
};

const textareaCss = `
[data-mw-textarea-field] {
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
  /* DECLARED, NOT INHERITED (the leading-pins census, 2 Sep 2026). This is the one
     control in the kit that deliberately does NOT take --leading-tight: it holds
     multiple rows of prose, and 1.2 is the wrong leading to read four lines at. It
     takes the paragraph leading, which is the value it was already inheriting, so
     nothing moves on any site; what changes is that the value is now a decision
     rather than whatever the body happened to be set to. The inherited version also
     rode the spacing dial silently, and it still does here, deliberately: the text
     inside a textarea is paragraph text and should follow the paragraph rhythm.
     NOTE the coupling this makes visible: minHeight (--space-fixed-4xl, 6rem at every
     dial) is "about four text rows" ONLY at the normal dial, because --leading-normal
     is multiplied by 0.9333 at compact and 1.1 at dramatic while the minimum height,
     being control geometry, deliberately does not ride --spacing-multiplier (the fixed
     family exists for exactly that). The visible row count therefore drifts by a
     fraction of a row across the dial; that is the fixed family working, not a defect. */
  line-height: var(--leading-normal);
}
[data-mw-textarea-field][data-size="sm"] {
  font-size: var(--type-sm);
  padding: var(--space-xs) var(--space-sm);
}
[data-mw-textarea-field][data-size="md"] {
  font-size: var(--type-md);
  padding: var(--space-sm) var(--space-md);
}
[data-mw-textarea-field][data-size="lg"] {
  font-size: var(--type-lg);
  padding: var(--space-md);
}
[data-mw-textarea-field]:hover:not(:focus):not(:disabled):not([aria-disabled="true"]) {
  border-color: var(--text-positive-tertiary);
}
[data-mw-textarea-field]:focus {
  border-color: var(--accent-base);
  background: var(--background-positive-primary);
  box-shadow: var(--shadow-focus);
}
/* aria-disabled mirrors :disabled: an in-flight field (readOnly, still
   focusable so focus survives the round trip) must read disabled all the same. */
[data-mw-textarea-field]:disabled,
[data-mw-textarea-field][aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--background-positive-primary);
}
[data-mw-textarea-field][data-error="true"] {
  border-color: var(--border-error);
}
[data-mw-textarea-field][data-error="true"]:focus {
  box-shadow: var(--shadow-focus-error);
}
[data-mw-textarea-field]::placeholder {
  color: var(--text-positive-tertiary);
}
`;

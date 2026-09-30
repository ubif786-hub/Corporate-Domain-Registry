"use client";

import { ClipboardEvent, CSSProperties, KeyboardEvent, ReactNode, useId, useRef, useState } from "react";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   Otp — a segmented one-time-code field (a verification PIN). N single-character
   boxes: typing fills a box and advances, Backspace clears and steps back, the
   arrow keys move, and pasting a whole code distributes it across the boxes.

   A CLIENT component (focus management, paste distribution). The joined code
   submits in a form through a hidden input named `name`; each box is a plain
   text input restricted to one valid character. Field surface tokens match the
   family; the first box carries autoComplete="one-time-code" so mobile OS and
   SMS autofill offer the code.
   ============================================================ */

export type OtpSize = "sm" | "md" | "lg";

export interface OtpProps {
  id?: string;
  /** Submitted form field name; the hidden input holds the joined code. */
  name?: string;
  label?: ReactNode;
  /** Number of characters. */
  length?: number;
  /** Restrict input: digits only, or letters and digits. */
  type?: "numeric" | "alphanumeric";
  defaultValue?: string;
  /** Fires with the JOINED code on every edit (typing, clearing, paste). The
   *  boxes stay UNCONTROLLED (defaultValue seeds them); this only reports, so
   *  a consumer can react, submit on the last digit, say, without reading the
   *  hidden input back out of the DOM (A-045). */
  onChange?: (value: string) => void;
  helper?: ReactNode;
  /** Error message. When set, the boxes turn error-styled and this renders below. */
  error?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  size?: OtpSize;
}

export function Otp({
  id: idProp,
  name,
  label,
  length = 6,
  type = "numeric",
  defaultValue = "",
  onChange,
  helper,
  error,
  disabled = false,
  required = false,
  marking,
  size = "md",
}: OtpProps) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const labelId = `${id}-label`;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const errorMessage = typeof error === "boolean" ? undefined : error;
  const hasError = error === true || Boolean(errorMessage);
  // A bare `true` styles the field invalid and carries no text, so the message
  // line is gated on a real message: the helper stays rendered and described,
  // and no empty alert is ever emitted. hasError keeps driving aria-invalid.
  const hasErrorMessage = Boolean(errorMessage);

  const valid = (c: string) => (type === "numeric" ? /^[0-9]$/.test(c) : /^[0-9a-z]$/i.test(c));
  const [values, setValues] = useState<string[]>(() => {
    const chars = [...defaultValue].filter(valid).slice(0, length);
    return Array.from({ length }, (_, i) => chars[i] ?? "");
  });
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Either / or, matching every sibling field (Checkbox, Combobox, Listbox,
  // MultiSelect, Radio, ColorPicker). The joined form pointed at helperId even
  // when an error was showing, and the helper <p> is not rendered in that state,
  // so aria-describedby referenced an id that was not in the document.
  const describedBy = hasErrorMessage ? errorId : helper ? helperId : undefined;

  // The box aria-labels take a plain string only; a non-string ReactNode label
  // would stringify to "[object Object]", so it falls back to the bare
  // position (the Rating and Combobox guard).
  const boxLabelPrefix = typeof label === "string" && label ? `${label}, ` : "";

  // Both mutation paths (setAt for typing and Backspace, the paste distributor
  // below) compute the next array from the committed values in the event
  // handler, then call setValues and onChange as siblings, so the hook fires
  // exactly once per edit. Reporting from inside the setValues updater looked
  // equivalent but was not: an updater must be pure and React re-invokes it
  // (StrictMode runs every updater twice in dev), so the documented
  // submit-on-the-last-digit consumer submitted twice. Each handler performs
  // one edit per event, so the render closure's `values` is safe to compute
  // from.
  const setAt = (i: number, ch: string) => {
    const next = values.map((c, k) => (k === i ? ch : c));
    setValues(next);
    onChange?.(next.join(""));
  };
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const onBoxChange = (i: number, raw: string) => {
    const ch = raw.slice(-1);
    if (ch === "") { setAt(i, ""); return; }
    if (!valid(ch)) return;
    setAt(i, ch);
    if (i < length - 1) focus(i + 1);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (values[i]) { setAt(i, ""); }
      else if (i > 0) { focus(i - 1); setAt(i - 1, ""); }
    } else if (e.key === "ArrowLeft") { e.preventDefault(); focus(i - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); focus(i + 1); }
  };

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const chars = [...e.clipboardData.getData("text")].filter(valid).slice(0, length - i);
    if (!chars.length) return;
    const next = values.map((c, k) => (k >= i && k < i + chars.length ? chars[k - i] : c));
    setValues(next);
    onChange?.(next.join(""));
    focus(i + chars.length);
  };

  return (
    <div data-mw-otp="" style={rootStyle}>
      <style href="magentaweb-otp" precedence="default">{otpCss}</style>
      {name ? <input type="hidden" name={name} value={values.join("")} /> : null}

      {label ? (
        <FieldLabel as="span" id={labelId} dataAttr="data-mw-otp-label" marking={resolveMarking(marking, required)}>{label}</FieldLabel>
      ) : null}

      <div
        role="group"
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={describedBy}
        data-mw-otp-boxes=""
        style={boxesStyle}
      >
        {values.map((v, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode={type === "numeric" ? "numeric" : "text"}
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={v}
            disabled={disabled}
            required={required}
            aria-label={`${boxLabelPrefix}character ${i + 1} of ${length}`}
            aria-invalid={hasError || undefined}
            data-mw-otp-box=""
            data-size={size}
            data-error={hasError ? "true" : "false"}
            style={boxStyle}
            onChange={(e) => onBoxChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>

      {/* Keyed so React inserts the alert instead of mutating the helper node into
          it: role="alert" added to an element already in the DOM is the unreliable
          case for live regions. */}
      {hasErrorMessage ? (
        <p key="error" id={errorId} role="alert" data-mw-otp-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : helper ? (
        <p key="helper" id={helperId} data-mw-otp-helper="" style={helperStyle}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2xs)", alignItems: "flex-start" };



const boxesStyle: CSSProperties = { display: "flex", gap: "var(--space-2xs)" };

const boxStyle: CSSProperties = {
  textAlign: "center",
  fontFamily: "var(--font-code)",
  color: "var(--text-positive-primary)",
  borderRadius: "var(--component-radius)",
  outline: "none",
  transition:
    "border-color var(--motion-transition), background var(--motion-transition), box-shadow var(--motion-transition)",
};

const helperStyle: CSSProperties = {
  margin: 0, marginTop: "var(--space-2xs)", fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--text-positive-secondary)",
};
const errorStyle: CSSProperties = {
  margin: 0, marginTop: "var(--space-2xs)", fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--status-danger-text)",
};

const otpCss = `
[data-mw-otp-box] {
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
}
/* OTP boxes are field geometry, taller than square so the caret and glyph breathe.
   Deliberately not on the square control ramp. */
[data-mw-otp-box][data-size="sm"] { width: 2rem; height: 2.25rem; font-size: var(--type-sm); }
[data-mw-otp-box][data-size="md"] { width: 2.5rem; height: 2.75rem; font-size: var(--type-md); }
[data-mw-otp-box][data-size="lg"] { width: 3rem; height: 3.25rem; font-size: var(--type-lg); }
[data-mw-otp-box]:hover:not(:focus):not(:disabled) { border-color: var(--text-positive-tertiary); }
[data-mw-otp-box]:focus { border-color: var(--accent-base); background: var(--background-positive-primary); box-shadow: var(--shadow-focus); }
[data-mw-otp-box]:disabled { opacity: 0.5; cursor: not-allowed; background: var(--background-positive-primary); }
[data-mw-otp-box][data-error="true"] { border-color: var(--border-error); }
[data-mw-otp-box][data-error="true"]:focus { box-shadow: var(--shadow-focus-error); }
`;

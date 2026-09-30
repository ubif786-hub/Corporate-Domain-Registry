"use client";

import {
  ChangeEvent,
  CSSProperties,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Input, InputHelper, InputError } from "@/components/Input";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   MaskedInput: a labelled field that FORMATS as it is typed. The literals of a
   pattern are inserted for the user, so a phone number reads "(555) 000-1234"
   on screen while the form receives "5550001234". Scope today is phone
   (PHONE_MASK); a date of birth uses the native date control, so it is not a
   mask case.

   The mask is a plain pattern string: "#" is a digit slot and every other
   character is a literal the field inserts on its own. That keeps the next mask
   (a postcode, a card number) a one-line constant plus its own inputMode /
   autoComplete pair rather than a new component. The pair defaults to "tel" /
   "tel" because phone is the mask in service; a non-phone mask overrides both,
   or a card field raises the phone keypad and offers the user's stored phone
   number as autofill.

   CLIENT, because a mask is keystroke state. Every change re-derives the raw
   digits from whatever the field now holds, reformats them, and puts the caret
   back; that one path covers typing, pasting a bare "5550001234", and typing a
   character that is not a digit (it simply does not survive the filter).
   Backspace is the one rule that needs its own handler: it deletes the previous
   DIGIT rather than the literal sitting in front of the caret, so the key never
   reads as dead on a bracket or a dash.

   Shape mirrors TextField, its practical sibling, so the two are visually one
   field: the sanctioned <Input> shell (which emits the shared "magentaweb-input"
   sheet and owns the helper / error ids) wrapping one real <input> that opts
   into the mother field styling through the data-mw-input-field / data-size /
   data-error contract. It exists for the same reason TextField does: the
   mother's InputField carries no `name`, so a plain form submit receives
   nothing. Here `name` rides a HIDDEN input holding the raw digits, because the
   formatted string is for the eye and the server wants the number.
   ============================================================ */

/** The one mask in service. Ten digit slots, brackets and a dash as literals.
 *  US ten digit deliberately: "+" is not a digit and cannot be typed, so an
 *  international number needs its own mask. A current limit, not an oversight. */
export const PHONE_MASK = "(###) ###-####";

const DIGIT_SLOT = "#";

const isDigit = (c: string) => c >= "0" && c <= "9";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const maskCapacity = (mask: string) => [...mask].filter((c) => c === DIGIT_SLOT).length;

/** Lay `digits` onto `mask`, stopping at the last digit given. Exported because a
 *  consumer that stored the raw digits needs the same formatting to display them
 *  back (a summary row, a confirmation screen) without mounting the field.
 *
 *  Deliberately lazy: a trailing literal is only emitted once a digit follows it,
 *  so the value never ENDS in a bracket or a dash. A user who stops at three
 *  digits sees "(555", not "(555) ", and the next Backspace has a digit to take. */
export function formatWithMask(mask: string, digits: string): string {
  let out = "";
  let i = 0;
  for (const ch of mask) {
    if (i >= digits.length) break;
    if (ch === DIGIT_SLOT) {
      out += digits[i];
      i += 1;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Where the caret belongs once `count` digits sit behind it. Literals shift as
 *  the value reformats; the number of digits before the caret does not, which is
 *  why every caret in this file is expressed as a digit count. */
function caretAfterDigits(mask: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  let index = 0;
  for (const ch of mask) {
    index += 1;
    if (ch === DIGIT_SLOT) {
      seen += 1;
      if (seen === count) return index;
    }
  }
  return index;
}

type FieldSize = "sm" | "md" | "lg";

export interface MaskedInputProps {
  /** Wires the label's htmlFor and the helper / error describedby ids. */
  id: string;
  /** The FormData key. The hidden input carries it, holding the RAW digits. */
  name: string;
  /** Visible field label. */
  label: ReactNode;
  /** The value is REAL and submits, but cannot be edited. Distinct from disabled: a read-only
   *  field stays focusable, copyable, announced and in FormData, so a record shown back to its
   *  owner keeps every value reachable. */
  readOnly?: boolean;
  /** Pattern: "#" is a digit slot, anything else is an auto-inserted literal. */
  mask?: string;
  /** Keyboard hint on the visible input. Defaults to "tel", the phone keypad;
   *  a non-phone mask usually wants "numeric". */
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  /** Autofill hint on the visible input. Defaults to "tel", the stored phone
   *  number. A non-phone mask MUST bring its own ("postal-code", "cc-number",
   *  "off"), or the browser offers the user's phone number into a card field. */
  autoComplete?: InputHTMLAttributes<HTMLInputElement>["autoComplete"];
  /** Controlled value. Formatted or raw both work, only its digits are read.
   *  Pair it with onChange; an unchanged value holds the field where it was. */
  value?: string;
  /** Uncontrolled starting value. Formatted or raw both work. */
  defaultValue?: string;
  /** (value, raw): the formatted display string first, then the digits alone.
   *  Both, because the consumer needs the raw for submission and the formatted
   *  for anything it mirrors on screen. Positional and value-first to match the
   *  mother Input's `onChange(value)`, so the extra argument is the only news. */
  onChange?: (value: string, raw: string) => void;
  placeholder?: string;
  /** Guidance shown below the field when there is no error. */
  helper?: ReactNode;
  /** Error message; when set it replaces the helper and marks the field invalid. */
  error?: ReactNode;
  /** Native required constraint plus aria-required. */
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  disabled?: boolean;
  /** Control size, forwarded to the mother field styling. Defaults to "md". */
  size?: FieldSize;
}

export function MaskedInput({
  id,
  name,
  label,
  mask = PHONE_MASK,
  inputMode = "tel",
  autoComplete = "tel",
  value,
  defaultValue,
  onChange,
  placeholder,
  helper,
  error,
  required = false,
  marking,
  disabled = false,
  readOnly = false,
  size = "md",
}: MaskedInputProps) {
  const controlled = value !== undefined;
  const capacity = maskCapacity(mask);
  const [innerDigits, setInnerDigits] = useState(() =>
    onlyDigits(defaultValue ?? "").slice(0, capacity),
  );
  // Digits are the state of record in both modes; the display string is derived,
  // never stored, so the two can never disagree about what the field holds.
  const digits = controlled ? onlyDigits(value).slice(0, capacity) : innerDigits;
  const display = formatWithMask(mask, digits);

  const fieldRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  // React writes the controlled value back on every keystroke, which parks the
  // caret at the end of the field. Restore it before paint, or editing anywhere
  // but the tail throws the caret to the end on every character.
  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el || caretRef.current === null) return;
    el.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  });

  const commit = (nextDigits: string, nextCaret: number) => {
    const capped = nextDigits.slice(0, capacity);
    if (capped === digits) {
      // Nothing survived the filter: a character that is not a digit, or a
      // keystroke past the last slot. React restores the field to `display` on
      // its own, and queuing a caret here would strand it, because state that
      // did not change never re-renders and the effect never runs.
      caretRef.current = null;
      return;
    }
    const next = formatWithMask(mask, capped);
    caretRef.current = Math.min(nextCaret, next.length);
    if (!controlled) setInnerDigits(capped);
    onChange?.(next, capped);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    commit(
      onlyDigits(raw),
      caretAfterDigits(mask, Math.min(onlyDigits(raw.slice(0, caret)).length, capacity)),
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace") return;
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    // A selection is a plain edit: the native delete plus handleChange already
    // re-derive the right digits, so only the collapsed caret needs this rule.
    if (start !== (el.selectionEnd ?? start)) return;

    // Walk back past literals to the digit the user means. Parked after ")", the
    // native delete would eat the bracket, the reformat would put it straight
    // back, and the key would read as dead until the user pressed it twice.
    let i = start - 1;
    while (i >= 0 && !isDigit(display[i])) i -= 1;
    e.preventDefault();
    if (i < 0) return;

    const index = onlyDigits(display.slice(0, i)).length;
    commit(digits.slice(0, index) + digits.slice(index + 1), caretAfterDigits(mask, index));
  };

  const hasError = Boolean(error);
  const errorMessage = typeof error === "boolean" ? undefined : error;
  // A bare `true` styles the field invalid and carries no text, so the message
  // line is gated on a real message: the helper stays rendered and described,
  // and no empty alert is ever emitted. hasError keeps driving aria-invalid.
  const hasErrorMessage = Boolean(errorMessage);
  // Ids match the mother Input convention so InputHelper / InputError (which
  // derive them from context) line up with this input's aria-describedby.
  const describedBy = hasErrorMessage ? `${id}-error` : helper ? `${id}-helper` : undefined;

  return (
    <Input id={id} size={size} required={required} marking={marking} disabled={disabled}>
      {/* The FieldLabel primitive directly, not InputLabel: the marking is
          resolved here, beside the `required` it defaults from, so the label and
          the input read the same two props from one place. */}
      <FieldLabel
        htmlFor={id}
        dataAttr="data-mw-input-label"
        marking={resolveMarking(marking, required)}
      >
        {label}
      </FieldLabel>
      {/* What the server gets: digits, no brackets, no dash. The visible input
          deliberately carries NO name, so FormData holds one clean value. */}
      <input type="hidden" name={name} value={digits} />
      <input
        ref={fieldRef}
        id={id}
        // Text, not tel: the value carries mask literals, so nothing about it is
        // a bare number. The default inputMode still brings up the phone keypad,
        // and the default autoComplete still offers the stored number, which is
        // the whole win. Both are props so a non-phone mask brings its own pair.
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={display}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={hasError || undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        data-mw-input-field=""
        data-size={size}
        data-error={hasError ? "true" : "false"}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        style={fieldStyle}
      />
      {hasErrorMessage ? (
        <InputError>{errorMessage}</InputError>
      ) : helper ? (
        <InputHelper>{helper}</InputHelper>
      ) : null}
    </Input>
  );
}

/* ---------- inline styles (token-pure) ---------- */

// TextField's fieldStyle verbatim: background, border, padding and font-size
// arrive from the hoisted "magentaweb-input" sheet keyed on
// [data-mw-input-field], and these are the properties the mother applies inline
// on its own field. Any drift here is a masked field that no longer matches the
// plain one beside it in the same form.
const fieldStyle: CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-body)",
  color: "var(--text-positive-primary)",
  borderRadius: "var(--component-radius)",
  outline: "none",
  transition:
    "border-color var(--motion-transition), background var(--motion-transition), box-shadow var(--motion-transition)",
};

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
   CurrencyInput: a labelled field for MONEY. Digits group live as they are
   typed, so "1234567.89" reads "1,234,567.89" on screen, and the currency
   symbol sits inside the field as an adornment the value never contains.

   SUBMISSION FORMAT, the one fact every consumer must know: the form receives
   the RAW MINOR UNITS through a hidden input carrying `name`. Integer cents,
   no symbol, no separators, no decimal point: $1,234.56 submits as "123456",
   and with decimals={0} the whole units submit as typed ("1234567"). An empty
   field submits "". The server does arithmetic on an integer and never strips
   a dollar string; the formatting is for the eye alone.

   At decimals={0} a decimal point TRUNCATES: a pasted "$1,234.56" submits 1234,
   not 123456 (v5.2.0). The point is still not kept — it does not display and it
   does not submit — but it ends the integer part, which is the difference
   between dropping a fraction and multiplying an amount by a hundred.

   Why not MaskedInput: a mask is a FIXED grammar of digit slots, so it can
   say "(###) ###-####" but it cannot say "any number of digits, grouped in
   threes from the right, with an optional fraction". Variable length with
   live regrouping needs its own reformat rule, which is this component. The
   shape and the caret discipline are MaskedInput's, carried over.

   CLIENT, because grouping is keystroke state. Every change re-derives the
   significant characters (digits plus the one decimal point the user may
   type) from whatever the field now holds, reformats the integer part through
   Intl.NumberFormat("en-US"), and puts the caret back by SIGNIFICANT COUNT:
   group separators shift as the value regroups, but the number of significant
   characters before the caret does not. The count includes the decimal point,
   unlike MaskedInput's digit count, because here the point is typed by the
   user and the caret must be able to rest after it. One path covers typing,
   pasting "1234.5" or "$1,234.50", and non-digit keys (they simply do not
   survive the filter). Backspace gets the sibling's one extra rule: parked
   after a group separator it deletes the digit the separator follows, so the
   key never reads as dead on a comma.

   Shape mirrors MaskedInput, its structural sibling: the sanctioned <Input>
   shell (which emits the shared "magentaweb-input" sheet and owns the
   helper / error ids) wrapping one real <input> that opts into the mother
   field styling through the data-mw-input-field / data-size / data-error
   contract. The visible input carries NO name; `name` rides the hidden input
   holding the minor units, because the grouped string is for the eye and the
   server wants the integer.
   ============================================================ */

/** Only the fraction lengths money actually uses. 2 is cents; 0 is whole units. */
export type CurrencyDecimals = 0 | 2;

type FieldSize = "sm" | "md" | "lg";

/** Grouping is capped here so Number(int) stays exact (2^53 is 16 digits).
 *  Fifteen integer digits is a quadrillion dollars; keystrokes past the cap
 *  do not survive the filter, the same fate as a non-digit. */
const MAX_INTEGER_DIGITS = 15;

const isDigit = (c: string) => c >= "0" && c <= "9";

// The one grouper: en-US comma grouping on the integer part only. The fraction
// is appended verbatim from what the user typed, so "12.50" never collapses to
// "12.5" mid-edit.
const GROUPER = new Intl.NumberFormat("en-US", { useGrouping: true, maximumFractionDigits: 0 });

// Symbol lookup is cached per code: the formatter construction is the costly
// part and the answer never changes within a session.
const symbolCache = new Map<string, string>();

function currencySymbol(code: string): string {
  const hit = symbolCache.get(code);
  if (hit !== undefined) return hit;
  let symbol: string;
  try {
    symbol =
      new Intl.NumberFormat("en-US", { style: "currency", currency: code })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? code;
  } catch {
    // An unknown code still labels the field rather than crashing it.
    symbol = code;
  }
  symbolCache.set(code, symbol);
  return symbol;
}

/** The parsed shape of what the field holds: integer digits, whether the user
 *  has typed the decimal point, and the fraction digits so far. `dot` is
 *  tracked separately from `frac` so "12." keeps its point mid-edit. */
interface ParsedAmount {
  int: string;
  dot: boolean;
  frac: string;
}

function parseAmount(text: string, decimals: CurrencyDecimals): ParsedAmount {
  let int = "";
  let frac = "";
  let dot = false;
  // A decimal point ENDS the integer part at every `decimals` setting, zero included.
  // Tracked apart from `dot` because at decimals=0 the point is not KEPT: it neither
  // displays nor submits, but it must still stop the digits behind it from landing in
  // the integer. The old condition skipped the point entirely at 0, so those digits
  // ran on: a pasted "$1,234.56" submitted 123456 and "0.99" submitted 99, each a
  // hundredfold overstatement produced by a filter that deleted the point and then
  // kept its fraction. Typing a point at 0 is still inert, as documented — nothing
  // survives the filter, so the field is unchanged and the next digit is an integer
  // digit. It is a WHOLE pasted amount that this protects.
  let past = false;
  for (const ch of text) {
    if (isDigit(ch)) {
      if (past) {
        if (frac.length < decimals) frac += ch;
      } else if (int.length < MAX_INTEGER_DIGITS) {
        int += ch;
      }
    } else if (ch === "." && !past) {
      past = true;
      dot = decimals > 0;
    }
  }
  // Leading zeros normalize away ("05" holds as "5") so the grouped display
  // and the significant string always agree digit for digit.
  return { int: int.replace(/^0+(?=\d)/, ""), dot, frac };
}

/** The state of record: digits plus the user's one decimal point, nothing
 *  else. "1,234.56" and "1234.56" both reduce to "1234.56". */
const significantOf = (p: ParsedAmount) => p.int + (p.dot ? "." : "") + p.frac;

/** The eye's version: the integer part grouped, the fraction as typed. */
function formatDisplay(p: ParsedAmount): string {
  const grouped = p.int ? GROUPER.format(Number(p.int)) : "";
  return grouped + (p.dot ? "." : "") + p.frac;
}

/** What the server gets: integer minor units. "" stays "" so an empty optional
 *  field submits empty, not zero. */
function minorUnitsOf(p: ParsedAmount, decimals: CurrencyDecimals): string {
  if (significantOf(p) === "") return "";
  if (decimals === 0) return p.int || "0";
  const combined = (p.int || "0") + p.frac.padEnd(decimals, "0");
  return combined.replace(/^0+(?=\d)/, "");
}

/** Where the caret belongs once `count` significant characters sit behind it.
 *  Group separators shift as the value regroups; the number of digits and the
 *  decimal point before the caret do not, which is why every caret in this
 *  file is expressed as a significant count (MaskedInput's rule, widened by
 *  one character class). */
function caretAfterSignificant(display: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  let index = 0;
  for (const ch of display) {
    index += 1;
    if (isDigit(ch) || ch === ".") {
      seen += 1;
      if (seen === count) return index;
    }
  }
  return index;
}

/** Render stored minor units back as a currency string without mounting the
 *  field (a summary row, a confirmation screen): formatMinorUnits("123456")
 *  is "$1,234.56". Exported for the same reason MaskedInput exports
 *  formatWithMask: the consumer that stored the raw value needs the same
 *  formatting to display it back. */
export function formatMinorUnits(
  minor: string | number,
  currency: string = "USD",
  decimals: CurrencyDecimals = 2,
): string {
  if (minor === "") return "";
  const amount = Number(minor) / 10 ** decimals;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    // An unknown code degrades to the bare grouped amount, matching the
    // field's own fallback posture.
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }
}

export interface CurrencyInputProps {
  /** Wires the label's htmlFor and the helper / error describedby ids. */
  id: string;
  /** The FormData key. The hidden input carries it, holding the RAW MINOR
   *  UNITS: integer cents ("123456" for $1,234.56), whole units at
   *  decimals={0}, "" when empty. */
  name: string;
  /** Visible field label. */
  label: ReactNode;
  /** ISO 4217 code driving the symbol adornment. Defaults to "USD". */
  currency?: string;
  /** Fraction digits the field accepts: 2 (cents, the default) or 0 (whole
   *  units, where the decimal point does not survive the filter). */
  decimals?: CurrencyDecimals;
  /** Controlled value: the DECIMAL amount string, formatted or plain
   *  ("1,234.56" and "1234.56" both work). NOT minor units; a stored "123456"
   *  would read as $123,456.00. Pair it with onChange; an unchanged value
   *  holds the field where it was. */
  value?: string;
  /** Uncontrolled starting value. Same decimal-amount reading as `value`. */
  defaultValue?: string;
  /** (value, minor): the formatted display string first, then the raw minor
   *  units. Both, because the consumer needs the minor units for submission
   *  and the formatted string for anything it mirrors on screen. Positional
   *  and value-first to match the mother Input's `onChange(value)`, so the
   *  extra argument is the only news. */
  onChange?: (value: string, minor: string) => void;
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
  /** Virtual keyboard hint. Defaults to "decimal": the numeric keypad with a
   *  decimal key, which is the right board for an amount. */
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  /** Defaults to "off": an amount is transactional, so no stored value is the
   *  right suggestion. Override where one exists (e.g. "transaction-amount"). */
  autoComplete?: string;
}

export function CurrencyInput({
  id,
  name,
  label,
  currency = "USD",
  decimals = 2,
  value,
  defaultValue,
  onChange,
  placeholder,
  helper,
  error,
  required = false,
  marking,
  disabled = false,
  size = "md",
  inputMode = "decimal",
  autoComplete = "off",
}: CurrencyInputProps) {
  const controlled = value !== undefined;
  const [innerRaw, setInnerRaw] = useState(() =>
    significantOf(parseAmount(defaultValue ?? "", decimals)),
  );
  // The significant string is the state of record in both modes; the display
  // string is derived, never stored, so the two can never disagree about what
  // the field holds.
  const raw = controlled ? significantOf(parseAmount(value, decimals)) : innerRaw;
  const parsed = parseAmount(raw, decimals);
  const display = formatDisplay(parsed);
  const symbol = currencySymbol(currency);

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

  const commit = (text: string, caretOffset: number) => {
    const next = parseAmount(text, decimals);
    const nextRaw = significantOf(next);
    if (nextRaw === raw) {
      // Nothing survived the filter: a letter, a second point, a digit past a
      // cap. React restores the field to `display` on its own, and queuing a
      // caret here would strand it, because state that did not change never
      // re-renders and the effect never runs.
      caretRef.current = null;
      return;
    }
    const nextDisplay = formatDisplay(next);
    const before = significantOf(parseAmount(text.slice(0, caretOffset), decimals));
    caretRef.current = Math.min(caretAfterSignificant(nextDisplay, before.length), nextDisplay.length);
    if (!controlled) setInnerRaw(nextRaw);
    onChange?.(nextDisplay, minorUnitsOf(next, decimals));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    commit(text, e.target.selectionStart ?? text.length);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace") return;
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    // A selection is a plain edit, and so is deleting a digit or the point:
    // the native delete plus handleChange already re-derive the right value.
    // Only the collapsed caret parked after a group separator needs this rule.
    if (start !== (el.selectionEnd ?? start) || start === 0) return;
    const prev = display[start - 1];
    if (isDigit(prev) || prev === ".") return;

    // The native delete would eat the comma, the reformat would put it
    // straight back, and the key would read as dead. Delete the digit the
    // separator follows instead.
    e.preventDefault();
    let i = start - 1;
    while (i >= 0 && !isDigit(display[i]) && display[i] !== ".") i -= 1;
    if (i < 0) return;
    commit(display.slice(0, i) + display.slice(i + 1), i);
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
      {/* What the server gets: integer minor units, no symbol, no separators.
          The visible input deliberately carries NO name, so FormData holds one
          clean value. */}
      <input type="hidden" name={name} value={minorUnitsOf(parsed, decimals)} />
      {/* The NumberField wrapper idiom: relative shell, absolute adornment. The
          symbol is aria-hidden because the label names the amount; announcing
          "$" as well would be a second reading of the same fact. */}
      <div style={wrapStyle}>
        <span
          aria-hidden="true"
          style={{
            ...symbolStyle,
            left: SYMBOL_OFFSET[size],
            fontSize: SYMBOL_TYPE[size],
            // Matches the sheet's :disabled rule so the adornment mutes with
            // the field it decorates.
            opacity: disabled ? 0.5 : undefined,
          }}
        >
          {symbol}
        </span>
        <input
          ref={fieldRef}
          id={id}
          // Text, not number: the value carries group separators, so nothing
          // about it is a bare number. inputMode still brings up the numeric
          // keypad with its decimal key.
          type="text"
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={display}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          data-mw-input-field=""
          data-size={size}
          data-error={hasError ? "true" : "false"}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{
            ...fieldStyle,
            // Clears the symbol column: the size's own left padding, the
            // symbol's width in ch of the field's font (the symbol renders at
            // the field's type size, so the unit tracks it), and a small gap.
            paddingLeft: `calc(${SYMBOL_OFFSET[size]} + ${symbol.length}ch + var(--space-2xs))`,
          }}
        />
      </div>
      {hasErrorMessage ? (
        <InputError>{errorMessage}</InputError>
      ) : helper ? (
        <InputHelper>{helper}</InputHelper>
      ) : null}
    </Input>
  );
}

/* ---------- inline styles (token-pure) ---------- */

// The mother sheet keys horizontal padding and type size on data-size (sm is
// --space-sm at --type-sm; md and lg both pad --space-md). These two maps
// mirror those rules so the adornment sits exactly on the field's own text
// inset; any drift here is a symbol that no longer aligns with the value
// beside it.
const SYMBOL_OFFSET: Record<FieldSize, string> = {
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-md)",
};

const SYMBOL_TYPE: Record<FieldSize, string> = {
  sm: "var(--type-sm)",
  md: "var(--type-md)",
  lg: "var(--type-lg)",
};

// NumberField's wrapper verbatim: a plain relative shell for the adornment.
const wrapStyle: CSSProperties = {
  position: "relative",
  display: "block",
};

// Secondary ink, not primary: the symbol is chrome, one register quieter than
// the value, one louder than the placeholder.
const symbolStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  fontFamily: "var(--font-body)",
  color: "var(--text-positive-secondary)",
};

// TextField's fieldStyle verbatim: background, border, padding and font-size
// arrive from the hoisted "magentaweb-input" sheet keyed on
// [data-mw-input-field], and these are the properties the mother applies inline
// on its own field. Any drift here is a currency field that no longer matches
// the plain one beside it in the same form.
const fieldStyle: CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-body)",
  color: "var(--text-positive-primary)",
  borderRadius: "var(--component-radius)",
  outline: "none",
  transition:
    "border-color var(--motion-transition), background var(--motion-transition), box-shadow var(--motion-transition)",
};

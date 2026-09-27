"use client";

import {
  createContext,
  CSSProperties,
  ReactNode,
  useContext,
  useId,
  useState,
} from "react";
import { groupLegendStyle, srOnly } from "@/components/internal/styles";
import { FieldLabel, FieldMarking, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   Radio + RadioGroup — single-selection across a set. RadioGroup owns
   the selected value and threads name / value / select handler to its
   Radio children through context; each Radio renders a real
   <input type="radio"> (visually hidden, focusable) so the browser's
   native radio behaviour, including arrow-key navigation within the
   shared name, works without custom key handling. A sibling <span>
   draws the circle and inner dot.

   When a label is provided the group renders inside a <fieldset> with a
   <legend> so screen readers announce the grouping. Each radio's label
   text is its accessible name via the wrapping <label>; an optional
   description line links through aria-describedby.

   Ids are minted with useId and carry NO caller text: the group mints one
   root for its helper and error lines, and each Radio mints its own for
   the input and its description. Until 26 Aug 2026 every id was
   `${name}-...`, so two groups sharing a name on one page (a sidebar
   FilterPanel and its drawer twin) emitted duplicate ids: a label's
   htmlFor then resolved to the FIRST matching input in the document,
   which was the other panel's, and a pick silently landed there. Pass 2
   put the ids under the group's useId but kept `-${value}` (whitespace
   folded) as a readable seed, and a fold collides: "Same day" and
   "Same-day" (ChoiceCard falls back to the LABEL as the value) made one
   id, so the second card's label landed on the first card's input. The
   seed went on 27 Aug 2026; the id shape is a contract change (see the
   changelog). `name` itself stays exactly what the caller passed: it is
   the native radio group and the submitted field name, and the browser
   keeps one checked radio per name, so a second mount that must be
   independent takes its own name.
   ============================================================ */

interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  onSelect: (value: string) => void;
  disabled: boolean;
  required: boolean;
  hasError: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

function useRadioGroupContext(): RadioGroupContextValue {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error("<Radio> must be used inside <RadioGroup>");
  }
  return ctx;
}

export interface RadioGroupProps {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  orientation?: "vertical" | "horizontal";
  label?: ReactNode;
  /** Names the group WITHOUT a visible legend, for a fieldset already titled by
   *  a heading on the page: a step wizard whose h1 is the question, say. Without
   *  it such a group renders a bare fieldset and a screen reader announces
   *  "group" with nothing after it. Ignored when `label` is set, since the legend
   *  is then the accessible name. */
  ariaLabel?: string;
  /** The legend's voice. "field" (default): the FieldLabel dress, one rung under a form's group
   *  legends, for a radio set that sits among fields. "group": FormGroup's own legend dress
   *  (code face, --type-sm, primary ink), for a radio set that is a peer of FormGroups, as in
   *  FilterPanel, where single- and multi-select groups must read as one voice. (v5.6.0) */
  legendVariant?: "field" | "group";
  helper?: ReactNode;
  /** Error line below the group, replacing the helper, with role="alert"; the circles take the
   *  error border. A bare `true` gives the invalid state (aria-invalid, the border) WITHOUT a
   *  message: the helper stays and no empty alert is emitted. */
  error?: ReactNode;
  children: ReactNode;
}

export function RadioGroup({
  name,
  value,
  defaultValue,
  onChange,
  disabled = false,
  required = false,
  marking,
  orientation = "vertical",
  label,
  ariaLabel,
  legendVariant = "field",
  helper,
  error,
  children,
}: RadioGroupProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string | undefined>(defaultValue);
  const current = isControlled ? value : internal;

  const hasError = Boolean(error);
  // A bare `true` flags the group invalid without a message: aria-invalid and the circles'
  // error border key off hasError, but the message branch needs real text, so the helper stays
  // rendered and aria-describedby keeps naming it (27 Aug 2026; the Checkbox note).
  const errorMessage: ReactNode = error === true ? null : error;
  const hasErrorMessage = hasError && errorMessage != null;
  // Per instance, not per name: see the header. Stable across server and client.
  const idPrefix = useId();
  const helperId = `${idPrefix}-helper`;
  const errorId = `${idPrefix}-error`;
  const describedBy = hasErrorMessage ? errorId : helper ? helperId : undefined;

  const onSelect = (v: string) => {
    if (!isControlled) setInternal(v);
    onChange?.(v);
  };

  const ctx: RadioGroupContextValue = {
    name,
    value: current,
    onSelect,
    disabled,
    required,
    hasError,
  };

  return (
    <RadioGroupContext.Provider value={ctx}>
      <style href="magentaweb-radio" precedence="default">{radioCss}</style>
      {/* AUD-17 (owner, 2 Sep 2026): the doc always said aria-required sits on the
          group and the code never set it. The doc's claim matches the kit convention
          (Switch, TextField), so the code catches up rather than the doc walking back. */}
      <fieldset
        style={fieldsetStyle}
        aria-label={label ? undefined : ariaLabel}
        aria-required={required || undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
      >
        {label && legendVariant === "group" ? (
          <legend data-mw-formgroup-legend="" style={groupLegendStyle}>
            {label}
            <FieldMarking marking={resolveMarking(marking, required)} />
          </legend>
        ) : label ? (
          <FieldLabel as="legend" marking={resolveMarking(marking, required)} style={legendStyle}>
            {label}
          </FieldLabel>
        ) : null}
        <div
          style={orientation === "horizontal" ? groupRowStyle : groupColStyle}
          role="presentation"
        >
          {children}
        </div>
        {/* Keyed so React REPLACES the node when the helper gives way to the error, instead of
            flipping role="alert" onto a node already in the tree (announced unreliably; the
            Checkbox note, 27 Aug 2026). */}
        {hasErrorMessage ? (
          <p key="error" id={errorId} role="alert" style={errorStyle}>{errorMessage}</p>
        ) : helper ? (
          <p key="helper" id={helperId} style={helperStyle}>{helper}</p>
        ) : null}
      </fieldset>
    </RadioGroupContext.Provider>
  );
}

/* ---------- Radio ---------- */

export interface RadioProps {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export function Radio({ value, label, disabled: radioDisabled, description }: RadioProps) {
  const ctx = useRadioGroupContext();
  const checked = ctx.value === value;
  const disabled = ctx.disabled || Boolean(radioDisabled);
  // Per Radio, from useId, with no trace of `value` (header): a value is caller data, and
  // folding it into an id either fails (a space splits the IDREF list) or collides (a fold).
  const inputId = useId();
  const descId = description ? `${inputId}-desc` : undefined;

  return (
    <label htmlFor={inputId} data-disabled={disabled ? "true" : "false"} style={radioRowStyle}>
      <input
        id={inputId}
        type="radio"
        name={ctx.name}
        value={value}
        checked={checked}
        disabled={disabled}
        required={ctx.required}
        aria-describedby={descId}
        onChange={() => ctx.onSelect(value)}
        style={srOnly}
      />
      <span
        data-mw-radio-circle=""
        data-checked={checked ? "true" : "false"}
        data-error={ctx.hasError ? "true" : "false"}
        aria-hidden="true"
        style={circleStyle}
      >
        {checked ? <span style={dotStyle} /> : null}
      </span>
      <span style={textColStyle}>
        <span style={labelTextStyle}>{label}</span>
        {description ? (
          <span id={descId} style={descStyle}>{description}</span>
        ) : null}
      </span>
    </label>
  );
}

/* ---------- inline styles ---------- */

const fieldsetStyle: CSSProperties = {
  border: 0,
  margin: 0,
  padding: 0,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
};

// Only what is TRUE OF A LEGEND and not of every field label. FieldLabel supplies
// the house voice (mono, uppercase, tracked, secondary ink, A-041 contrast), and
// merges this after it, so re-declaring those five here would just restate them
// and give them somewhere to drift.
const legendStyle: CSSProperties = {
  // A legend carries the browser's own padding; the group owns its spacing.
  padding: 0,
  // A section heading for the set, not a peer of the radios, so it gets more
  // breathing room than the intra-radio gap. See --radio-group-legend-gap.
  marginBottom: "var(--radio-group-legend-gap)",
};


const groupColStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
};

const groupRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: "var(--space-lg)",
};

const radioRowStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "flex-start",
  // WCAG 2.5.8 floor on the LABEL (26 Aug 2026, owner): a bare Radio is an 18px mark.
  minHeight: "var(--target-min)",
  minWidth: "var(--target-min)",
  // Larger than the checkbox gap on purpose: see --radio-label-gap in
  // tokens.css for the optical-mass rationale.
  gap: "var(--radio-label-gap)",
};

/* background/border/cursor live in the hoisted sheet: inline values beat the
   checked/hover/error border rules, so the accent ring never painted (audit
   F4/F7, the A-036 class Checkbox already fixed). */
const circleStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "var(--control-mark)",
  height: "var(--control-mark)",
  marginTop: "0.1rem",
  borderRadius: "var(--radius-full)",
  transition: "border-color var(--motion-transition)",
};

const dotStyle: CSSProperties = {
  width: "var(--control-mark-dot)",
  height: "var(--control-mark-dot)",
  background: "var(--accent-base)",
  border: "1px solid var(--text-on-accent)",
  borderRadius: "var(--radius-full)",
  // Scale-in draw on select, instant under reduced motion.
  animation: "mw-radio-in var(--motion-duration) var(--motion-ease) both",
};

const textColStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
};

const labelTextStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-primary)",
  lineHeight: "var(--leading-snug)",
};

const descStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-tertiary)",
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

const radioCss = `
@keyframes mw-radio-in {
  from { transform: scale(0); }
  to   { transform: scale(1); }
}
/* Base visual state in the SHEET so the state rules below can win (audit F4/F7).
   position too, and deliberately NOT inline: the label is the srOnly input's
   containing block (see the contract in internal/styles.ts), but ChoiceCard's
   image variant must be able to override it back to static so the card takes
   both the indicator and the containing-block role. */
label:has([data-mw-radio-circle]) {
  cursor: pointer;
  position: relative;
}
[data-mw-radio-circle] {
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
}
label[data-disabled="true"]:has([data-mw-radio-circle]) {
  opacity: 0.5;
  cursor: not-allowed;
}
label:hover [data-mw-radio-circle]:not([data-checked="true"]) {
  border-color: var(--text-positive-tertiary);
}
[data-mw-radio-circle][data-checked="true"] {
  border-color: var(--accent-base);
}
[data-mw-radio-circle][data-error="true"] {
  border-color: var(--border-error);
}
input:focus-visible + [data-mw-radio-circle] {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

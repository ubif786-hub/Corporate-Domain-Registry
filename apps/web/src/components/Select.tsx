import { CSSProperties, ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "@carbon/icons-react";
import { srOnly } from "@/components/internal/styles";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   Select — the form field for choosing one value from a known set.

   A SERVER component by design (no "use client"): it wraps a native
   <select>, so it needs no client JavaScript, submits its value in a
   plain <form> (server actions included), and hands phones the native
   OS picker for free. That is why it is not a compound/context family
   like Input: a server component cannot share React context, so the
   root renders label + field + helper/error from props directly, and
   SelectField is exposed as a standalone named export for hand
   composition. See the compound-component policy in CLAUDE.md.

   The browser's default dropdown chevron cannot be restyled through box
   properties, so the field sets appearance:none and draws its own
   ChevronDown, token-coloured, with room reserved in padding-inline-end.
   Base background/border live in the hoisted sheet (NOT inline) so the
   hover/focus/disabled/error/size rules win the cascade, the same lesson
   Input banked (audit F1).

   Options come from an `options` array or hand-written <option> children;
   children win when both are present.
   ============================================================ */

export type SelectSize = "sm" | "md" | "lg";
/** "field" (default) is the form field: bordered, filling its column, at its size. "filter"
 *  (v6.35.0) is a filter over a list, set in a panel's head beside its title: the control wash
 *  and no border, at the sm type with a shorter box, as wide as its longest choice. */
export type SelectAppearance = "field" | "filter";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type NativeSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "size" | "children" | "value" | "defaultValue"
>;

export interface SelectFieldProps extends NativeSelectProps {
  /** Optional here: a bare field wrapped in an external <label> (or given aria-label)
   *  needs none. The Select root sets it so its own <label htmlFor> associates. */
  id?: string;
  size?: SelectSize;
  /** The look (v6.35.0): "field" (default) or "filter". A filter ignores size: it is one rung,
   *  the panel head's, so a row of them lines up with the head's other controls. */
  appearance?: SelectAppearance;
  error?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  value?: string;
  defaultValue?: string;
  children?: ReactNode;
}

export interface SelectProps extends Omit<SelectFieldProps, "error"> {
  /** Required on the root: it wires the rendered label's htmlFor to the field. */
  id: string;
  label?: ReactNode;
  helper?: ReactNode;
  /** Error message. When set, the field turns error-styled and this renders below it.
   *  A bare `true` styles the field invalid without a message (the old field
   *  pass-through form). */
  error?: ReactNode;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  /** Keeps the `<label>` in the DOM, visually hidden (v6.31.0), so the accessible name holds while
   *  the surface names the field: a toolbar's group-by beside a search on one baseline. The
   *  placeholder or the chosen value carries the visible word. Needs `label`. */
  labelHidden?: boolean;
}

export function Select({
  id,
  label,
  helper,
  error,
  required = false,
  marking,
  labelHidden = false,
  size = "md",
  disabled = false,
  placeholder,
  options,
  value,
  defaultValue,
  children,
  ...rest
}: SelectProps) {
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
    <div data-mw-select="" style={rest.appearance === "filter" ? filterRootStyle : rootStyle}>
      {label && labelHidden ? (
        <label htmlFor={id} data-mw-select-label="" style={srOnly}>{label}</label>
      ) : label ? (
        <FieldLabel htmlFor={id} dataAttr="data-mw-select-label" marking={resolveMarking(marking, required)} style={labelBindStyle}>{label}</FieldLabel>
      ) : null}

      <SelectField
        id={id}
        size={size}
        error={hasError}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        options={options}
        value={value}
        defaultValue={defaultValue}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </SelectField>

      {/* Keyed so React inserts the alert instead of mutating the helper node into
          it: role="alert" added to an element already in the DOM is the unreliable
          case for live regions. */}
      {hasErrorMessage ? (
        <p key="error" id={errorId} role="alert" data-mw-select-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : helper ? (
        <p key="helper" id={helperId} data-mw-select-helper="" style={helperStyle}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- SelectField ---------- */

export function SelectField({
  id,
  size = "md",
  appearance = "field",
  error = false,
  disabled = false,
  placeholder,
  options,
  value,
  defaultValue,
  children,
  ...rest
}: SelectFieldProps) {
  // v4.8.0: when a placeholder is given and the caller pins no value, the select
  // must START on the placeholder option. A native <select> defaults to the first
  // NON-disabled option, silently skipping the disabled placeholder and
  // preselecting a real choice the user never made — so seed defaultValue "".
  const controlled =
    value !== undefined
      ? { value }
      : defaultValue !== undefined
        ? { defaultValue }
        : placeholder !== undefined
          ? { defaultValue: "" }
          : {};
  // A filter is as wide as its CURRENT choice, not its longest (a native select sizes to its longest
  // option, so "All clients" over a list that holds "American Islamic Center of Florida" ran 250 px
  // where the boards draw 110). The current label is rendered hidden in the same grid cell and the
  // select stretches to it; a controlled filter re-renders on change, so the width follows the value.
  const filter = appearance === "filter";
  const current = value ?? defaultValue;
  const currentLabel = filter ? (options?.find((o) => o.value === current)?.label ?? (current === "" || current === undefined ? placeholder : undefined) ?? "") : "";
  return (
    <span data-mw-select-wrap="" data-appearance={appearance} data-disabled={disabled ? "true" : "false"} style={filter ? wrapFilterStyle : wrapStyle}>
      <style href="magentaweb-select" precedence="default">{selectCss}</style>
      {filter ? <span aria-hidden="true" data-mw-select-sizer="" style={sizerStyle}>{currentLabel}</span> : null}
      <select
        id={id}
        disabled={disabled}
        aria-invalid={error || undefined}
        data-mw-select-field=""
        data-size={size}
        data-appearance={appearance}
        data-error={error ? "true" : "false"}
        {...controlled}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {children ?? options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} aria-hidden="true" data-mw-select-chevron="" style={appearance === "filter" ? chevronFilterStyle : chevronStyle} />
    </span>
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
// A filter takes its own width and its row's alignment: stretched in a head's flex row it would
// grow to the row's height and hang its box from the top.
const filterRootStyle: CSSProperties = {
  ...rootStyle,
  alignSelf: "auto",
};



// SECOND LAW (audit finding, 4 Sep 2026): see Input.tsx's identical note. The extra rung
// that used to double up here (root flex gap + this marginTop) moves to the label instead
// (labelBindStyle, below), so label -> field now exceeds field -> helper as the law
// requires, instead of the reverse.
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

const wrapStyle: CSSProperties = {
  position: "relative",
  display: "block",
  maxWidth: "100%",
};
// The filter's wrap: the sizer is the only thing in flow, so the wrap is exactly the current
// label's box; the select sits over it out of flow (a select in flow, even at width 0, still
// contributes its longest option to a grid or flex track's intrinsic size).
const wrapFilterStyle: CSSProperties = {
  position: "relative",
  display: "inline-block",
  maxWidth: "100%",
  verticalAlign: "middle",
};
// The sizer wears the filter's own type and padding (the sheet below sets both on the field), so
// its box is the box the select needs for the current label.
const sizerStyle: CSSProperties = {
  display: "block",
  visibility: "hidden",
  whiteSpace: "nowrap",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-tight)",
  padding: "var(--space-2xs) var(--space-xs)",
  paddingInlineEnd: "calc(var(--space-fixed-xs) + var(--space-fixed-md) + var(--space-fixed-2xs))",
  border: "1px solid transparent",
};

// The chevron's own offset from the edge stays on --space-sm, which DOES ride
// the spacing dial. Sanctioned (S-11, D35): it tracks the field's own inline
// padding, so the glyph keeps its optical relationship to the text at every
// dial, and it is the inset behind it, not this offset, that was the dead
// space. The pairing is measured, not assumed: probe-control-geometry.mjs
// reads the gap between this glyph and the field's content box at all three
// dials and the tightest reading is at dramatic, where the offset is widest.
const chevronStyle: CSSProperties = {
  position: "absolute",
  right: "var(--space-sm)",
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  color: "var(--text-positive-tertiary)",
  display: "inline-flex",
};
// The filter's chevron sits at the fixed xs offset: its box is one rung tighter than a field's.
const chevronFilterStyle: CSSProperties = {
  ...chevronStyle,
  right: "var(--space-fixed-xs)",
};

// The room reserved for the chevron (D35, 27 Aug 2026). It used to be a spacing
// RUNG: --space-xl at sm, --space-2xl at md and lg. Those ride
// --spacing-multiplier, so the dead inset moved with a CONTENT dial while the
// thing it clears is fixed control geometry, a 16px glyph at a fixed offset.
// Measured at 1280px: 38.66 / 51.55 / 82.48 px at compact / normal / dramatic on
// md, and at sm the compact end came within 1.12px of the text box, the wrong
// direction for the one dial that has least room. It is now composed from the
// control's own geometry instead: the WCAG target floor plus one rung, both
// dial-independent, so every size reserves the same 38.66px at every dial. Same
// value for sm, md and lg on purpose: the glyph is 16px and its offset is
// --space-sm whatever the field size, so the room it needs is size-independent
// too. Guarded by scripts/probe-control-geometry.mjs.
const CHEVRON_INSET = "var(--control-adornment-inset)";

// Hover, focus, disabled, error, and size variants. Base background/border live HERE, not
// inline, so the state rules below win the cascade (Input audit F1). React 19 dedupes the
// hoisted sheet by precedence, so it emits once per page.
const selectCss = `
[data-mw-select-field] {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  font-family: var(--font-body);
  color: var(--text-positive-primary);
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
  border-radius: var(--component-radius);
  cursor: pointer;
  outline: none;
  transition:
    border-color var(--motion-transition),
    background var(--motion-transition),
    box-shadow var(--motion-transition);
}
/* CONTROL HEIGHT PARITY (31 Aug 2026), the same fix as Input.tsx and for the same
   reason: this field pinned font-size and padding but no leading, so it inherited
   the body's prose leading (--leading-normal, 1.5) while Button pins
   --leading-tight (1.2). A Select beside a Button was taller by
   font-size x 0.3, which is 6.19px at lg. Select is a single-line control and
   belongs to the form kit, so it takes the kit's leading. Measured proof and the
   full write-up live in the Input.tsx comment. */
[data-mw-select-field] {
  line-height: var(--leading-tight);
}
[data-mw-select-field][data-size="sm"] {
  font-size: var(--type-sm);
  padding: var(--space-xs) var(--space-sm);
  padding-inline-end: ${CHEVRON_INSET};
}
[data-mw-select-field][data-size="md"] {
  font-size: var(--type-md);
  padding: var(--space-sm) var(--space-md);
  padding-inline-end: ${CHEVRON_INSET};
}
[data-mw-select-field][data-size="lg"] {
  font-size: var(--type-lg);
  padding: var(--space-md);
  padding-inline-end: ${CHEVRON_INSET};
}
[data-mw-select-field]:hover:not(:focus):not(:disabled) {
  border-color: var(--text-positive-tertiary);
}
[data-mw-select-field]:focus {
  border-color: var(--accent-base);
  background: var(--background-positive-primary);
  box-shadow: var(--shadow-focus);
}
[data-mw-select-field]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--background-positive-primary);
}
[data-mw-select-field][data-error="true"] {
  border-color: var(--border-error);
}
[data-mw-select-field][data-error="true"]:focus {
  box-shadow: var(--shadow-focus-error);
}
[data-mw-select-wrap][data-disabled="true"] [data-mw-select-chevron] {
  opacity: 0.5;
}
/* FILTER (v6.35.0, the owner on the HQ boards: a filter in a table in a panel in a page is nested
   deep enough that the plainest control is the clearest; "a slight fill instead of bare, but not
   as tall or as heavy, narrower and shorter to fit the panel"). The control wash, no border, the
   sm type at the 2xs block rung, as wide as its longest choice, the chevron's room composed of
   fixed rungs (its offset, the 16px glyph, a hair) so it holds at every dial as the field's does.
   The border comes back on hover, the field's focus ring is unchanged. Declared after the size
   rules on the same specificity, so a filter is one rung whatever size it is handed. */
[data-mw-select-field][data-appearance="filter"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  max-width: 100%;
  font-size: var(--type-sm);
  background: var(--background-control-wash);
  border-color: transparent;
  padding: var(--space-2xs) var(--space-xs);
  padding-inline-end: calc(var(--space-fixed-xs) + var(--space-fixed-md) + var(--space-fixed-2xs));
}
[data-mw-select-field][data-appearance="filter"]:hover:not(:focus):not(:disabled) {
  border-color: var(--border-positive-secondary);
}
`;

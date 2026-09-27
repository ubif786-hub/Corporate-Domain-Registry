"use client";

import { ChangeEvent, CSSProperties, KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Close, Search as SearchGlyph } from "@carbon/icons-react";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";
import { srOnly } from "@/components/internal/styles";

/* ============================================================
   Search: the dedicated inline search field, Input's sibling.
   One anatomy: a leading Carbon Search glyph, the text input on
   the Input field surface, and a clear button that appears once
   the field is non-empty. Where Input captures typed data,
   Combobox picks one option from a known set, and CommandPalette
   is the modal command overlay, Search is the field that filters
   a list or table in place.

   A native <input type="search"> for the implicit searchbox
   semantics; the UA's own cancel button is suppressed in the
   hoisted sheet because the component renders its own clear
   affordance (one clear control, not two).

   Works controlled (value + onChange) and uncontrolled
   (defaultValue). onChange receives the string value, Input's
   simplified signature. The only internal state is a mirror of
   the uncontrolled value, kept solely so the clear button knows
   when the field is non-empty.

   The Escape contract: Escape in a NON-EMPTY field clears it and
   stops propagating, so a stray overlay does not close while the
   user is only backing out of a query. Escape in an EMPTY field
   is left alone and still reaches a parent overlay (Modal,
   CommandPalette), the element-level Escape claim.

   Client component because the clear affordance is state (it
   renders only while the field is non-empty) and the field owns
   keyboard and clear handlers.

   Base background/border/padding live in the hoisted sheet, not
   inline, so the hover/focus/disabled/error state rules win the
   cascade (the audit F1 lesson Input carries).
   ============================================================ */

export interface SearchProps {
  /** Threaded to the field's id and the label's htmlFor. Must be unique on the page. */
  id: string;
  /** Convenience label rendered above the field, Input's label treatment. */
  label?: ReactNode;
  /** Names the field WITHOUT a visible label, for a search box already named by its surface (a
   *  toolbar whose heading says what is being searched). Applied to the input only when `label`
   *  is absent, the Radio idiom; ignored otherwise. A placeholder is not a name: without either
   *  the field has none, and dev builds warn. */
  ariaLabel?: string;
  /** What the label SHOWS. Search has no required state, so this is how a Search field is marked optional. */
  marking?: FieldMarkingKind;
  /** Controlled value. Pair with onChange to own the state externally. Omit for an uncontrolled field. */
  value?: string;
  /** Initial value for uncontrolled use. */
  defaultValue?: string;
  /** Fires on every keystroke, and with "" on clear, carrying the new value as a string (Input's simplified signature). */
  onChange?: (value: string) => void;
  /** Fires after the field is cleared, by the clear button or a non-empty Escape. */
  onClear?: () => void;
  /** Placeholder text shown while the field is empty. Not an accessible name; pass label for that. */
  placeholder?: string;
  /** Caption below the field, linked via aria-describedby. Hidden when error is set. */
  helper?: ReactNode;
  /** When set: border swaps to --border-error, aria-invalid is set, and the message replaces any helper with role="alert".
   *  A bare `true` gives the invalid border and aria-invalid WITHOUT a message: the helper stays and no empty alert is emitted. */
  error?: ReactNode;
  /** Renders the field at 50% opacity with cursor: not-allowed. The clear button never renders while disabled. */
  disabled?: boolean;
  /** Submitted form field name on the native input. */
  name?: string;
  /** The field's rung (v6.30.0). "md" (default) is the form field. "sm" is the TOOLBAR rung: the
   *  type and padding Button sm and SegmentedControl sm sit on, so a search beside a view switch
   *  shares its height and its baseline. */
  size?: "sm" | "md";
  /** Keeps the `<label>` in the DOM, visually hidden (v6.30.0), so the accessible name and the
   *  aria-describedby binding hold while the surface names the field (a toolbar whose heading
   *  says what is searched). The placeholder carries the visible instruction. Needs `label`. */
  labelHidden?: boolean;
}

export function Search({
  id,
  label,
  ariaLabel,
  marking,
  value,
  defaultValue,
  onChange,
  onClear,
  placeholder,
  helper,
  error,
  disabled = false,
  name,
  size = "md",
  labelHidden = false,
}: SearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Mirror state for the uncontrolled case only: the clear button needs to
  // know whether the field is non-empty without owning the value.
  const [inner, setInner] = useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const current = isControlled ? value : inner;

  const hasError = Boolean(error);
  // A bare `true` flags the field invalid without a message: the border and aria-invalid key
  // off hasError, but the message branch needs real text, so the helper stays rendered and
  // aria-describedby keeps naming it (27 Aug 2026; the Checkbox note).
  const errorMessage: ReactNode = error === true ? null : error;
  const hasErrorMessage = hasError && errorMessage != null;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = hasErrorMessage ? errorId : helper ? helperId : undefined;

  // Dev-only: a search field with neither a label nor ariaLabel has no accessible name; the
  // placeholder does not count (the Modal slot-versus-prop warning is the precedent).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && !label && !ariaLabel) {
      console.warn(
        `Search "${id}": no accessible name. Pass \`label\`, or \`ariaLabel\` when the name is visible elsewhere.`,
      );
    }
  }, [id, label, ariaLabel]);

  const clear = () => {
    if (!isControlled) {
      setInner("");
      if (inputRef.current) inputRef.current.value = "";
    }
    // Controlled: onChange("") IS the clear. Uncontrolled: the same call keeps
    // the consumer's change stream complete (a clear is a value change too).
    onChange?.("");
    onClear?.();
    // The clear button removes itself once the field empties; focus returns to
    // the input so the keyboard user is not dropped.
    inputRef.current?.focus();
  };

  const onFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInner(e.target.value);
    onChange?.(e.target.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Escape" || current === "") return;
    // Non-empty Escape clears in place and claims the key, so a parent overlay
    // stays open while the user backs out of a query. Empty Escape falls
    // through untouched and still closes the overlay. preventDefault also
    // stops the UA's own type="search" Escape-clear from double-acting.
    e.preventDefault();
    e.stopPropagation();
    clear();
  };

  const controlledProps = isControlled
    ? { value }
    : defaultValue !== undefined
      ? { defaultValue }
      : {};

  return (
    <div data-mw-search="" data-size={size} style={rootStyle}>
      <style href="magentaweb-search" precedence="default">{searchCss}</style>
      {label && labelHidden ? (
        <label htmlFor={id} data-mw-search-label="" style={srOnly}>{label}</label>
      ) : label ? (
        <FieldLabel htmlFor={id} dataAttr="data-mw-search-label" marking={resolveMarking(marking, false)}>{label}</FieldLabel>
      ) : null}
      <div data-mw-search-wrap="" style={wrapStyle}>
        <SearchGlyph size={16} aria-hidden="true" data-mw-search-glyph="" style={glyphStyle} />
        <input
          ref={inputRef}
          id={id}
          type="search"
          name={name}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          data-mw-search-field=""
          data-error={hasError ? "true" : "false"}
          onChange={onFieldChange}
          onKeyDown={onKeyDown}
          {...controlledProps}
          style={fieldStyle}
        />
        {current !== "" && !disabled ? (
          <button
            type="button"
            aria-label="Clear search"
            data-mw-search-clear=""
            onClick={clear}
            style={clearStyle}
          >
            <Close size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {/* Keyed so React REPLACES the node when the helper gives way to the error, instead of
          flipping role="alert" onto a node already in the tree (announced unreliably; the
          Checkbox note, 27 Aug 2026). */}
      {hasErrorMessage ? (
        <p key="error" id={errorId} role="alert" data-mw-search-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : helper ? (
        <p key="helper" id={helperId} data-mw-search-helper="" style={helperStyle}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  alignSelf: "stretch", // v4.7.0 field-fill guard (see Input rootStyle)
};


const wrapStyle: CSSProperties = {
  position: "relative",
  display: "block",
  maxWidth: "100%",
};

// The glyph's own offset from the edge stays on --space-sm, and the clear
// button's on --space-2xs; both DO ride the spacing dial. Sanctioned (S-11,
// D35): they track the field's own inline padding, so the adornments keep their
// optical relationship to the text at every dial, and it is the inset behind
// them, not these offsets, that was the dead space. Measured, not assumed:
// probe-control-geometry.mjs reads the gap between each adornment and the
// field's content box at all three dials, on both sides.
const glyphStyle: CSSProperties = {
  position: "absolute",
  left: "var(--space-sm)",
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  color: "var(--text-positive-tertiary)",
  display: "inline-flex",
};

/* background, border, and padding live in the hoisted sheet (the base
   [data-mw-search-field] rule), NOT here: inline values beat the
   :hover/:focus/:disabled/[data-error] state rules (audit F1). */
const fieldStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "var(--text-positive-primary)",
  borderRadius: "var(--component-radius)",
  outline: "none",
  width: "100%",
  transition:
    "border-color var(--motion-transition), background var(--motion-transition), box-shadow var(--motion-transition)",
};

const clearStyle: CSSProperties = {
  position: "absolute",
  right: "var(--space-2xs)",
  top: "50%",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "var(--control-size-xs)",
  height: "var(--control-size-xs)",
  padding: 0,
  background: "transparent",
  border: 0,
  borderRadius: "var(--component-radius)",
  color: "var(--text-positive-secondary)",
  cursor: "pointer",
  transition: "background var(--motion-transition), color var(--motion-transition)",
};

const helperStyle: CSSProperties = {
  margin: 0,
  marginTop: "var(--space-2xs)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-secondary)",
};

const errorStyle: CSSProperties = {
  margin: 0,
  marginTop: "var(--space-2xs)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--status-danger-text)",
};

// The room reserved for the two adornments (D35, 27 Aug 2026). Both sides used
// to be --space-2xl, a spacing RUNG that rides --spacing-multiplier, so the dead
// inset moved with a CONTENT dial while the things it clears are fixed control
// geometry: a 16px glyph at the start and a --control-size-xs clear button at
// the end, each at a fixed offset. Measured at 1280px: 38.66 / 51.55 / 82.48 px
// at compact / normal / dramatic. It is now composed from the control's own
// geometry: the WCAG target floor plus one rung, both dial-independent. The
// clear button IS --control-size-xs, the same 1.5rem the floor resolves to, so
// this reads as "the button, plus a rung of air" on the end side and "the
// glyph's slot, plus the same air" on the start side. The Select comment carries
// the full reasoning; guarded by scripts/probe-control-geometry.mjs.
const ADORNMENT_INSET = "var(--control-adornment-inset)";

// State rules and the base visual state live in the hoisted sheet so
// hover/focus/disabled/error win the cascade. React 19 dedupes by precedence,
// so the rule emits once across the page.
const searchCss = `
[data-mw-search-field] {
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
  font-size: var(--type-md);
  /* CONTROL HEIGHT PARITY (AUD-2, 1 Sep 2026): the member the v6.3.1 Input/Select fix
     missed. No pinned leading meant the shell inherited the dial-riding prose leading
     (1.5) through font: inherit and sat taller than every kit sibling by
     font-size x 0.3. The full write-up lives in Input.tsx. */
  line-height: var(--leading-tight);
  padding: var(--space-sm) var(--space-md);
  /* Inline clearance for the adornments: the leading glyph on the left, the
     clear button on the right (the Combobox padding-inline-end precedent).
     BOTH sides, because both are the same class of reservation. */
  padding-inline-start: ${ADORNMENT_INSET};
  padding-inline-end: ${ADORNMENT_INSET};
}
/* sm: the toolbar rung, Button sm's type and block padding, so the field shares a height with
   the view switch beside it. The adornment inset stays: the glyph and the clear button are the
   same fixed geometry at every size. */
[data-mw-search][data-size="sm"] [data-mw-search-field] {
  font-size: var(--type-sm);
  line-height: var(--leading-tight);
  padding-block: var(--space-xs);
}
[data-mw-search-field]:hover:not(:focus):not(:disabled) {
  border-color: var(--text-positive-tertiary);
}
[data-mw-search-field]:focus {
  border-color: var(--accent-base);
  background: var(--background-positive-primary);
  box-shadow: var(--shadow-focus);
}
[data-mw-search-field]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--background-positive-primary);
}
[data-mw-search-field][data-error="true"] {
  border-color: var(--border-error);
}
[data-mw-search-field][data-error="true"]:focus {
  box-shadow: var(--shadow-focus-error);
}
[data-mw-search-field]::placeholder {
  color: var(--text-positive-tertiary);
}

/* Kill the UA's own search chrome: the component renders its own clear
   affordance, so the WebKit cancel button (and the results decorations some
   engines add) must not layer a second clear control inside the field. */
[data-mw-search-field]::-webkit-search-cancel-button,
[data-mw-search-field]::-webkit-search-decoration,
[data-mw-search-field]::-webkit-search-results-button,
[data-mw-search-field]::-webkit-search-results-decoration {
  -webkit-appearance: none;
  appearance: none;
  display: none;
}

[data-mw-search-clear]:hover {
  background: var(--background-positive-primary);
  color: var(--text-positive-primary);
}
[data-mw-search-clear]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

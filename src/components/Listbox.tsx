"use client";

import { type ReactNode, CSSProperties, KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Checkmark } from "@carbon/icons-react";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   Listbox — an always-visible option list, single or multi select. The
   complement to Select (a dropdown) and Combobox (a searchable field): reach
   for it when the choices should stay on screen rather than hidden behind a
   trigger.

   A CLIENT component (keyboard navigation + selection state). It follows the
   WAI-ARIA listbox pattern: a focusable role="listbox" that tracks the active
   option with aria-activedescendant, options are role="option" with
   aria-selected. In single-select, selection follows focus (arrow keys move and
   select); in multi-select, focus moves independently and Space toggles. Every
   selected value submits as a hidden input named `name` (an array in multi).

   Surface tokens match the field family; selected options use accent-soft /
   accent-emphasis; the keyboard-active option carries an inset accent ring.
   ============================================================ */

export type ListboxSize = "sm" | "md" | "lg";

export interface ListboxOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** A leading glyph for this option (v4.10.2). Any ReactNode: a Carbon icon,
   *  an inline SVG, a product category mark. Rendered before the label in its
   *  own fixed slot, so labels stay aligned whether or not an option has one.
   *  This is the reason a category picker cannot be a native Select: an
   *  <option> renders text only. */
  icon?: ReactNode;
}

export interface ListboxProps {
  id?: string;
  /** Submitted form field name; one hidden input per selected value. */
  name?: string;
  label?: ReactNode;
  options: ListboxOption[];
  /** Allow choosing several values. */
  multiple?: boolean;
  /** Fires with the new selection. The list stays UNCONTROLLED (defaultValue
   *  seeds it); this only reports, so a consumer can react to a choice without
   *  reading the hidden inputs back out of the DOM. */
  onChange?: (value: string | string[]) => void;
  /** Initially-selected value(s). A string (or string[]) either way is accepted. */
  defaultValue?: string | string[];
  helper?: ReactNode;
  /** Error message. When set, the list turns error-styled and this renders below it. */
  error?: ReactNode;
  disabled?: boolean;
  /** Requires a selection. NOTE: a SINGLE-select list that starts with one can
   *  never be emptied, so its `required` is vacuous there and the component
   *  suppresses both the mark and aria-required. It bites on a single-select
   *  that starts EMPTY, and on any multi-select (which can be deselected to
   *  nothing). Also note there is no NATIVE constraint either way: selection
   *  submits through hidden inputs, so a real gate belongs in the handler. */
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  size?: ListboxSize;
  /** Visible rows before the list scrolls. */
  rows?: number;
}

const toArray = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

export function Listbox({
  id: idProp,
  name,
  label,
  options,
  multiple = false,
  defaultValue,
  onChange,
  helper,
  error,
  disabled = false,
  required = false,
  marking,
  size = "md",
  rows = 6,
}: ListboxProps) {
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

  const [selected, setSelected] = useState<string[]>(() => {
    const init = toArray(defaultValue);
    return multiple ? init : init.slice(0, 1);
  });

  const enabled = useMemo(() => options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0), [options]);
  // Initial active option: the first selected (if any), else the first enabled row. Computed once
  // from the initial props/state in the useState initialiser, so no effect and no stale-deps lint.
  const [active, setActive] = useState(() => {
    const sel = options.findIndex((o) => selected.includes(o.value) && !o.disabled);
    return sel >= 0 ? sel : options.findIndex((o) => !o.disabled);
  });

  // A SINGLE-select listbox that starts with a selection can never be emptied:
  // picking another option moves the selection, it never clears it. So its
  // `required` can never fail, and a mark promising a validation that cannot
  // fire is noise. Suppressed here rather than at each call site, so two
  // consumers of the same control cannot disagree about it (readilyhome had a
  // marked Category beside an unmarked Room name, both auto-defaulting).
  //
  // Multi-select is different: deselecting every option DOES empty it, so there
  // `required` is a real constraint and keeps both its mark and its aria.
  // Single-select starting EMPTY is also real, and keeps both.
  const autoSatisfied = !multiple && selected.length > 0;
  const effectiveRequired = required && !autoSatisfied;

  const listRef = useRef<HTMLUListElement>(null);

  // Keep the active option inside the list. The list is height-capped by
  // `rows` and aria-activedescendant moves nothing by itself, so an arrow walk
  // past the fold used to select rows the user could not see (in single-select
  // the selection follows focus). Runs on mount as well: the initial active row
  // is the selection, and a preselected value can start below the fold
  // (readilyhome's Category: sixteen rows at rows={5}, preselected on edit).
  // Scrolls the LIST only, never scrollIntoView: that walks every scrollable
  // ancestor up to the viewport, and a Listbox below the fold, or inside a
  // modal body, would drag the page to itself on mount. No hover path sets
  // `active` here (pointerdown does, on a row that is visible by definition),
  // so an effect on `active` cannot cascade the way a hover-driven one would.
  useEffect(() => {
    const list = listRef.current;
    const row = active >= 0 ? document.getElementById(`${id}-opt-${active}`) : null;
    if (!list || !row) return;
    const l = list.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const top = l.top + list.clientTop;
    const bottom = top + list.clientHeight;
    if (r.top < top) list.scrollTop -= top - r.top;
    else if (r.bottom > bottom) list.scrollTop += r.bottom - bottom;
  }, [active, id]);

  const describedBy = hasErrorMessage ? errorId : helper ? helperId : undefined;

  // onChange only REPORTS. The list stays uncontrolled, so the selection is
  // computed here and handed out, rather than the consumer owning it: that keeps
  // the hidden inputs and the keyboard model exactly as they were, and adds only
  // the ability to react to a choice.
  const selectSingle = (value: string) => {
    setSelected([value]);
    onChange?.(value);
  };
  // The next set is computed from `selected` in the event handler, where state
  // is current, and the report runs as a SIBLING of setSelected, never inside
  // the updater: updaters must stay pure, and StrictMode double-invokes them in
  // dev, so a callback inside one fired twice per toggle.
  const toggleMulti = (value: string) => {
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
    setSelected(next);
    onChange?.(next);
  };

  const activate = (index: number) => {
    const o = options[index];
    if (!o || o.disabled) return;
    setActive(index);
    if (!multiple) selectSingle(o.value);
  };

  const step = (from: number, dir: 1 | -1): number => {
    const pos = enabled.indexOf(from);
    if (pos === -1) return dir === 1 ? enabled[0] : enabled[enabled.length - 1];
    const next = pos + dir;
    if (next < 0 || next >= enabled.length) return from;
    return enabled[next];
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown") { e.preventDefault(); activate(step(active, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); activate(step(active, -1)); }
    else if (e.key === "Home") { e.preventDefault(); activate(enabled[0]); }
    else if (e.key === "End") { e.preventDefault(); activate(enabled[enabled.length - 1]); }
    else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const o = options[active];
      if (!o || o.disabled) return;
      if (multiple) toggleMulti(o.value);
      else selectSingle(o.value);
    }
  };

  const anyIcon = options.some((o) => o.icon != null);
  return (
    <div data-mw-listbox="" style={rootStyle}>
      <style href="magentaweb-listbox" precedence="default">{listboxCss}</style>
      {name ? selected.map((v) => <input key={v} type="hidden" name={name} value={v} />) : null}

      {label ? (
        <FieldLabel as="span" id={labelId} dataAttr="data-mw-listbox-label" marking={resolveMarking(marking, effectiveRequired)}>{label}</FieldLabel>
      ) : null}

      {/* Naming: the labelledby reference wins whenever a visible label exists, and an
          unlabelled listbox falls back to "Options" rather than shipping nameless.
          Combobox and MultiSelect already did that; Listbox alone did not (A-099). */}
      <ul
        id={id}
        ref={listRef}
        role="listbox"
        aria-multiselectable={multiple || undefined}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : "Options"}
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-invalid={hasError || undefined}
        aria-required={effectiveRequired || undefined}
        aria-describedby={describedBy}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        data-mw-listbox-list=""
        data-size={size}
        data-error={hasError ? "true" : "false"}
        data-disabled={disabled ? "true" : "false"}
        style={{
          ...listStyle,
          // 2.6em approximates one option row (line height plus the row
          // padding) so the rows prop converts to a height. Revisit if the
          // option padding changes.
          //
          // S-11, sanctioned at D35 (27 Aug 2026). The unit is em, so the row
          // model tracks the option's own FONT SIZE and ignores the spacing
          // dial, while the row's real padding is --space-* and does not. The
          // two disagree at compact and dramatic, so `rows` is an approximation
          // of a row count rather than a promise of one. It stays because the
          // prop's contract is "about this many rows before it scrolls", which
          // is what a consumer picking rows={5} is asking for, and because the
          // honest alternative (measuring a rendered row and setting a px cap)
          // trades a stable, server-renderable height for a layout read and a
          // reflow on every dial change. Nothing renders wrong: the list scrolls
          // correctly at every dial, it just shows a little more or less than
          // the nominal count.
          maxHeight: `calc(${rows} * 2.6em)`,
        }}
        onKeyDown={onKeyDown}
      >
        {options.map((o, i) => {
          const isSel = selected.includes(o.value);
          // The glyph slot renders for EVERY option once any option carries an icon, so labels
          // share one x in a mixed list; an all-text list carries no slot (v5.5.0).
          return (
            <li
              key={o.value}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={isSel}
              aria-disabled={o.disabled || undefined}
              data-mw-listbox-option=""
              data-active={i === active ? "true" : "false"}
              data-selected={isSel ? "true" : "false"}
              onPointerDown={(e) => {
                // preventDefault stops the browser's focus handoff, which would
                // land on the non-focusable li and leave the list unfocused, so
                // the list is focused explicitly instead: click then arrow keys
                // keeps working.
                e.preventDefault();
                if (disabled || o.disabled) return;
                listRef.current?.focus({ preventScroll: true });
                setActive(i);
                if (multiple) toggleMulti(o.value);
                else selectSingle(o.value);
              }}
            >
              <span data-mw-listbox-check="" aria-hidden="true">
                {isSel ? <Checkmark size={16} /> : null}
              </span>
              {anyIcon ? (
                <span data-mw-listbox-icon="" aria-hidden="true" style={optionIconStyle}>
                  {o.icon ?? null}
                </span>
              ) : null}
              {o.label}
            </li>
          );
        })}
      </ul>

      {/* Keyed so React inserts the alert instead of mutating the helper node into
          it: role="alert" added to an element already in the DOM is the unreliable
          case for live regions. */}
      {hasErrorMessage ? (
        <p key="error" id={errorId} role="alert" data-mw-listbox-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : helper ? (
        <p key="helper" id={helperId} data-mw-listbox-helper="" style={helperStyle}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2xs)", alignSelf: "stretch" }; // v4.7.0 field-fill guard



// The per-option glyph slot. Fixed size and flex:0 0 auto so every label starts
// at the same x whether or not its option carries an icon: a ragged left edge is
// exactly what a mixed list would otherwise produce.
const optionIconStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  width: "var(--control-mark)",
  height: "var(--control-mark)",
  color: "var(--text-positive-secondary)",
};

const listStyle: CSSProperties = {
  margin: 0,
  padding: "var(--space-3xs)",
  listStyle: "none",
  overflowY: "auto",
  outline: "none",
};

const helperStyle: CSSProperties = {
  margin: 0, marginTop: "var(--space-2xs)", fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--text-positive-secondary)",
};
const errorStyle: CSSProperties = {
  margin: 0, marginTop: "var(--space-2xs)", fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--status-danger-text)",
};

const listboxCss = `
[data-mw-listbox-list] {
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
  border-radius: var(--component-radius);
  transition: border-color var(--motion-transition), box-shadow var(--motion-transition);
}
[data-mw-listbox-list][data-size="sm"] { font-size: var(--type-sm); }
[data-mw-listbox-list][data-size="md"] { font-size: var(--type-md); }
[data-mw-listbox-list][data-size="lg"] { font-size: var(--type-lg); }
[data-mw-listbox-list]:focus-visible { border-color: var(--accent-base); box-shadow: var(--shadow-focus); }
[data-mw-listbox-list][data-error="true"] { border-color: var(--border-error); }
[data-mw-listbox-list][data-error="true"]:focus-visible { box-shadow: var(--shadow-focus-error); }
[data-mw-listbox-list][data-disabled="true"] { opacity: 0.5; cursor: not-allowed; }

[data-mw-listbox-option] {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: var(--space-xs) var(--space-sm);
  /* Shared menu-option rhythm (see Combobox): tight leading keeps rows dense. */
  line-height: var(--leading-tight);
  border-radius: var(--component-radius);
  font-family: var(--font-body);
  color: var(--text-positive-secondary);
  cursor: pointer;
}

/* The icon slot breathes before the label. The row's own 2xs gap is right for
   check-to-icon, where two glyphs sit in one adornment cluster, but it crowds a
   glyph against a word: at 2xs the icon reads as attached to the first letter
   rather than as a leading mark. Icon to label is a within-item micro pairing,
   which the spacing ladder puts at 2xs to sm, so this lifts it one rung to xs.
   Expressed as the DIFFERENCE from the row gap so the total lands exactly on the
   named rung instead of on an unnamed sum, and so it tracks the spacing dial.
   Only the icon carries it, so text-only options are untouched. */
[data-mw-listbox-option] > [data-mw-listbox-icon] {
  margin-inline-end: calc(var(--space-xs) - var(--space-2xs));
}
[data-mw-listbox-check] {
  display: inline-flex;
  width: var(--control-mark); /* the same slot width as the icon beside it (v5.5.0: was a 1rem literal) */
  flex: 0 0 var(--control-mark);
  color: var(--accent-emphasis);
}
[data-mw-listbox-option]:hover:not([aria-disabled="true"]) { background: var(--background-hover-wash); }
[data-mw-listbox-option][data-selected="true"] { background: var(--accent-soft); color: var(--accent-emphasis); }
[data-mw-listbox-list]:focus-visible [data-mw-listbox-option][data-active="true"] { box-shadow: inset 0 0 0 1px var(--accent-base); }
[data-mw-listbox-option][aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; }
`;

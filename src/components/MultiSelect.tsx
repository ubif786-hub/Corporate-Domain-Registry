"use client";

import { CSSProperties, FocusEvent, KeyboardEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Close } from "@carbon/icons-react";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   MultiSelect — a tag input: choose many values from a list, shown as
   removable tokens in the field, with a filterable dropdown of the rest.

   A CLIENT component. Selected values render as chips inside the control; a
   filter input sits after them; the popover listbox shows the remaining
   options (already-chosen ones are chips, so they leave the list). Clicking or
   Enter adds; a chip's × or Backspace on an empty query removes. Every selected
   value submits in a form as a repeated hidden input named `name` (so the
   server reads `name` as an array), matching how a native multiple <select>
   submits.

   Field tokens match Input/Select/Combobox; the popover uses the raised-surface
   recipe; chips use the accent-soft / accent-emphasis pair.

   The popover is a positioned wrapper holding the <ul role="listbox"> (the
   scroller) and, when the filter finds nothing, the emptyText line as the
   listbox's SIBLING, never its child: a listbox may own only options and
   groups, and a bare <li> inside one is invalid owned content. The listbox
   simply owns nothing while it has nothing.

   The error and helper lines carry distinct keys so React mounts a fresh
   alert node instead of mutating the helper into one, and a bare error={true}
   keeps the helper: hasError still drives aria-invalid and the invalid
   styling, but the message branch renders only for a real message.
   ============================================================ */

export type MultiSelectSize = "sm" | "md" | "lg";

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  id?: string;
  /** Submitted form field name; one hidden input per selected value. */
  name?: string;
  label?: ReactNode;
  options: MultiSelectOption[];
  placeholder?: string;
  /** Initially-selected values (uncontrolled). */
  defaultValue?: string[];
  /** Fires with the FULL selected set after every add or remove. The control
   *  stays UNCONTROLLED (defaultValue seeds it); this only reports, so a
   *  consumer can react without reading the hidden inputs back out of the DOM
   *  (A-045, the Listbox idiom). */
  onChange?: (value: string[]) => void;
  helper?: ReactNode;
  /** Error message. When set, the control turns error-styled and this renders below. */
  error?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  size?: MultiSelectSize;
  emptyText?: string;
}

export function MultiSelect({
  id: idProp,
  name,
  label,
  options,
  placeholder = "Search…",
  defaultValue,
  onChange,
  helper,
  error,
  disabled = false,
  required = false,
  marking,
  size = "md",
  emptyText = "No matches",
}: MultiSelectProps) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const listId = `${id}-listbox`;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const errorMessage = typeof error === "boolean" ? undefined : error;
  const hasError = error === true || Boolean(errorMessage);
  // The message branch needs a real message; a bare `true` keeps the helper.
  const showErrorMessage = Boolean(errorMessage);

  const [selected, setSelected] = useState<string[]>(defaultValue ?? []);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // The <ul> IS the scroller (listStyle caps its height), so the arrow walk can
  // scroll it directly instead of asking the browser to walk ancestors.
  const listRef = useRef<HTMLUListElement>(null);

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !selected.includes(o.value) && (!q || o.label.toLowerCase().includes(q)));
  }, [query, options, selected]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  // Focus leaving the control closes the popover (the Combobox shape: onBlur
  // on the root is focusout, which bubbles). A move to a chip's remove button
  // stays inside rootRef and is ignored; a move outside, or to nothing
  // (relatedTarget null), closes. The pointerdown listener above cannot see a
  // keyboard leaving, so a tabbed-past field used to keep its list painted
  // over the next controls with aria-expanded still true.
  const onRootBlur = (e: FocusEvent<HTMLDivElement>) => {
    const to = e.relatedTarget as Node | null;
    if (to && rootRef.current?.contains(to)) return;
    setOpen(false);
    setActiveIndex(-1);
  };

  const describedBy = showErrorMessage ? errorId : helper ? helperId : undefined;

  // Every commit path funnels through add (option pointerdown, Enter) or
  // remove (a chip's ×, Backspace on an empty query), so the report hook fires
  // once per change with the next set. The next set is computed from `selected`
  // in the event handler, where state is current, and the report runs as a
  // SIBLING of setSelected, never inside the updater: updaters must stay pure,
  // and StrictMode double-invokes them in dev, so a callback inside one fired
  // twice per change. Listbox's toggleMulti follows the same shape.
  const add = (o: MultiSelectOption) => {
    if (o.disabled || selected.includes(o.value)) return;
    const next = [...selected, o.value];
    setSelected(next);
    onChange?.(next);
    setQuery("");
    setActiveIndex(-1);
    inputRef.current?.focus();
  };
  const remove = (value: string) => {
    const next = selected.filter((v) => v !== value);
    setSelected(next);
    onChange?.(next);
    inputRef.current?.focus();
  };

  // Brings one row into view by scrolling the LIST, never scrollIntoView: that
  // walks every scrollable ancestor up to the viewport, so a field near the fold
  // drags the whole page to its popover (the Listbox mount rule, and the shape
  // Combobox's open effect already used).
  const scrollRowIntoList = (index: number) => {
    const list = listRef.current;
    const row = index >= 0 ? document.getElementById(`${id}-opt-${index}`) : null;
    if (!list || !row) return;
    const l = list.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const top = l.top + list.clientTop;
    const bottom = top + list.clientHeight;
    if (r.top < top) list.scrollTop -= top - r.top;
    else if (r.bottom > bottom) list.scrollTop += r.bottom - bottom;
  };

  // A keyboard move of the active option keeps it in view (the Combobox
  // shape, and the reason it is done on the key rather than in an effect on
  // activeIndex: a pointer sets activeIndex too, and a hover-driven scroll
  // cascades down a list one partially visible row at a time).
  const moveActive = (next: number) => {
    setActiveIndex(next);
    scrollRowIntoList(next);
  };

  // A pointer sets the active option, but ONLY when the pointer actually moved.
  // Any scroll re-fires the hover events on whatever row lands under a
  // STATIONARY pointer, and that row sits BEHIND the one the arrows just
  // reached, so the highlight walks backwards (measured on Combobox, 27 Aug
  // 2026; MultiSelect shares the model and the defect). Chromium re-dispatches
  // that move at the last real pointer position, so comparing coordinates
  // separates a user's move from the browser's bookkeeping. pointermove rather
  // than pointerenter for the same reason: enter cannot tell the two apart.
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const setActiveFromPointer = (index: number, x: number, y: number) => {
    if (lastPointer.current && lastPointer.current.x === x && lastPointer.current.y === y) return;
    lastPointer.current = { x, y };
    setActiveIndex(index);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      moveActive(Math.min(activeIndex + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      moveActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        add(filtered[activeIndex]);
      }
    } else if (e.key === "Backspace" && query === "" && selected.length > 0) {
      remove(selected[selected.length - 1]);
    } else if (e.key === "Escape") {
      // Claim the key only while the popover is open (the Search/CommandPalette
      // contract): preventDefault marks the event consumed before a parent
      // overlay's window listener sees it, so one Escape closes the popover and
      // the next one closes the overlay, instead of a single press collapsing
      // both and a FormModal remount destroying the draft. Already closed,
      // Escape falls through untouched.
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  return (
    <div data-mw-multiselect="" style={rootStyle} ref={rootRef} onBlur={onRootBlur}>
      <style href="magentaweb-multiselect" precedence="default">{multiselectCss}</style>
      {label ? (
        <FieldLabel htmlFor={id} dataAttr="data-mw-multiselect-label" marking={resolveMarking(marking, required)}>{label}</FieldLabel>
      ) : null}

      <div data-mw-multiselect-wrap="" style={wrapStyle}>
        <div
          data-mw-multiselect-control=""
          data-size={size}
          data-error={hasError ? "true" : "false"}
          data-disabled={disabled ? "true" : "false"}
          style={controlStyle}
          // mousedown, cancelled, rather than click: a press on the chip area
          // or the control's padding moved focus to <body> for the length of
          // the click, which with the blur-close would unmount the popover
          // and remount it on the click's focus(). Cancelling the mousedown
          // keeps focus in the input throughout. The input itself is excluded
          // so caret placement and drag-selection keep working; a chip's
          // remove button still gets its click (remove() refocuses the input).
          onMouseDown={(e) => {
            if (disabled || e.target === inputRef.current) return;
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          {name ? selected.map((v) => <input key={v} type="hidden" name={name} value={v} />) : null}

          {selected.map((v) => (
            <span key={v} data-mw-multiselect-chip="" style={chipStyle}>
              {byValue.get(v)?.label ?? v}
              {!disabled ? (
                <button
                  type="button"
                  data-mw-multiselect-chip-x=""
                  aria-label={`Remove ${byValue.get(v)?.label ?? v}`}
                  style={chipXStyle}
                  onClick={() => remove(v)}
                >
                  <Close size={12} aria-hidden="true" />
                </button>
              ) : null}
            </span>
          ))}

          <input
            id={id}
            ref={inputRef}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
            aria-invalid={hasError || undefined}
            aria-required={required || undefined}
            aria-describedby={describedBy}
            disabled={disabled}
            placeholder={selected.length === 0 ? placeholder : ""}
            value={query}
            data-mw-multiselect-input=""
            style={inputStyle}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
        </div>
        <ChevronDown size={16} aria-hidden="true" data-mw-multiselect-chevron="" style={chevronStyle} />

      {/* The popover wrapper carries the raised surface and cancels onMouseDown
          so nothing in it takes focus off the input (see onRootBlur): the empty
          line, the padding, the scrollbar. The <ul> inside is the listbox AND
          the scroller; its aria-label takes a plain string only (a non-string
          ReactNode label falls back to the generic name), and tabIndex -1
          keeps it out of the tab sequence (Chromium 130+ tab-stops a
          scrollable element with no focusable children, see Combobox). The
          emptyText line is the listbox's sibling, not its child. */}
      {open ? (
        <div data-mw-multiselect-popover="" style={popoverStyle} onMouseDown={(e) => e.preventDefault()}>
          <ul id={listId} ref={listRef} role="listbox" aria-multiselectable="true" aria-label={typeof label === "string" ? label : "Options"} data-mw-multiselect-list="" style={listStyle} tabIndex={-1}>
            {filtered.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={false}
                aria-disabled={o.disabled || undefined}
                data-mw-multiselect-option=""
                data-active={i === activeIndex ? "true" : "false"}
                onPointerDown={(e) => { e.preventDefault(); add(o); }}
                onPointerMove={(e) => setActiveFromPointer(i, e.clientX, e.clientY)}
              >
                {o.label}
              </li>
            ))}
          </ul>
          {filtered.length === 0 ? (
            <div data-mw-multiselect-empty="" style={emptyStyle}>{selected.length && !query ? "All selected" : emptyText}</div>
          ) : null}
        </div>
      ) : null}
      </div>

      {showErrorMessage ? (
        <p key="error" id={errorId} role="alert" data-mw-multiselect-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : helper ? (
        <p key="helper" id={helperId} data-mw-multiselect-helper="" style={helperStyle}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = { position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-2xs)", alignSelf: "stretch" }; // v4.7.0 field-fill guard



const wrapStyle: CSSProperties = { position: "relative", display: "block", maxWidth: "100%" };

// The room reserved for the chevron (D35, 27 Aug 2026). It used to be
// --space-2xl, a spacing RUNG that rides --spacing-multiplier, so the dead inset
// moved with a CONTENT dial while the thing it clears is fixed control geometry,
// a 16px glyph at a fixed offset. Measured at 1280px: 38.66 / 51.55 / 82.48 px at
// compact / normal / dramatic. It is now composed from the control's own
// geometry: the WCAG target floor plus one rung, both dial-independent. Declared
// TWICE on purpose, here and per size in the sheet below: this inline value wins
// over the sheet, so a fix that touched only the sheet would change nothing, and
// the size rules use the padding SHORTHAND, which resets the inline-end longhand
// if it is not restated after it. Guarded by scripts/probe-control-geometry.mjs.
const CHEVRON_INSET = "var(--control-adornment-inset)";

const controlStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-3xs)",
  paddingInlineEnd: CHEVRON_INSET,
  cursor: "text",
  minWidth: 0,
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-3xs)",
  fontFamily: "var(--font-body)",
  background: "var(--accent-soft)",
  color: "var(--accent-emphasis)",
  borderRadius: "var(--component-radius)",
  paddingBlock: "var(--space-3xs)",
  paddingInline: "var(--space-2xs)",
  whiteSpace: "nowrap",
  maxWidth: "100%",
};

const chipXStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  // WCAG 2.5.8. The glyph stays 12px; the box around it reaches the floor. As
  // rendered today these pass on the spacing exception (chips are wide, so the
  // remove buttons sit ~114px apart), but that holds only while chips stay on
  // one line: wrapped to a second row they are a chip-height apart, and a
  // 12x12 control is poor to hit regardless of what the exception permits.
  minWidth: "var(--target-min)",
  minHeight: "var(--target-min)",
  padding: 0,
  border: 0,
  background: "transparent",
  color: "var(--accent-emphasis)",
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  flex: "1 1 6ch",
  minWidth: "6ch",
  border: 0,
  outline: "none",
  background: "transparent",
  color: "var(--text-positive-primary)",
  fontFamily: "var(--font-body)",
  padding: 0,
};

// The chevron's own offset from the edge stays on --space-sm, which DOES ride
// the spacing dial. Sanctioned (S-11, D35): it tracks the control's own inline
// padding, so the glyph keeps its optical relationship to the chips and the
// input at every dial, and it is the inset behind it, not this offset, that was
// the dead space. The TOP offset is on the same rung deliberately: the control
// grows downward as chips wrap, and the chevron stays pinned beside the first
// row. Measured, not assumed: probe-control-geometry.mjs reads the gap between
// this glyph and the control's content box at all three dials.
const chevronStyle: CSSProperties = {
  position: "absolute",
  right: "var(--space-sm)",
  top: "var(--space-sm)",
  pointerEvents: "none",
  color: "var(--text-positive-tertiary)",
  display: "inline-flex",
};

// The popover: position and the raised surface. The 3xs inset that used to sit
// on the list is here now, so the empty line and the options share one frame.
const popoverStyle: CSSProperties = {
  /* Anchored to the FIELD WRAP, not the field group (2 Sep 2026); see Combobox for
     the measurement. The wrap holds the control alone, so --popover-offset is the
     whole distance between the control and the list it owns. */
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  margin: "var(--popover-offset) 0 0",
  padding: "var(--space-3xs)",
  background: "var(--background-positive-primary)",
  border: "1px solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  boxShadow: "var(--shadow-raised)",
  zIndex: tokenNumber("var(--z-overlay)"),
};

// The listbox is the scroller; owning nothing, it takes no room.
const listStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  maxHeight: "var(--popover-max-height)",
  overflowY: "auto",
};

const emptyStyle: CSSProperties = { padding: "var(--space-sm) var(--space-md)", fontSize: "var(--type-sm)", color: "var(--text-positive-tertiary)" };

const helperStyle: CSSProperties = {
  margin: 0, marginTop: "var(--space-2xs)", fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--text-positive-secondary)",
};
const errorStyle: CSSProperties = {
  margin: 0, marginTop: "var(--space-2xs)", fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)", color: "var(--status-danger-text)",
};

// The control is the styled field (focus-within wins), and the options carry their states here.
const multiselectCss = `
[data-mw-multiselect-control] {
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
  border-radius: var(--component-radius);
  /* CONTROL HEIGHT PARITY (CG-2, 2 Sep 2026). This control pinned NO leading, so its input
     and chips inherited the body's prose 1.5 against the kit's --leading-tight (1.2) and the
     field stood font-size x 0.3 too tall. The response, in v5.5.0, was to cut the md vertical
     padding two rungs to --space-2xs and write "the vertical stays 2xs because the chips add
     the height" beside it. That treated the symptom: measured, it overshot, leaving an empty
     md MultiSelect 12.04px SHORTER than a Button and an sm one 4.83px taller, and no chip
     count ever brought md near parity (-12.04 empty, -7.65 at one to three chips, +20.28 once
     the row wraps). It is the same defect as Input/Select (v6.3.1) and Combobox (v6.5.1) --
     the third instance -- and it hid here because the file's only line-height is on
     [data-mw-multiselect-option], the MENU row, so a property grep cleared the component.
     Pin the leading, and the padding can go back to the sibling recipe below. */
  line-height: var(--leading-tight);
  transition: border-color var(--motion-transition), background var(--motion-transition), box-shadow var(--motion-transition);
}
[data-mw-multiselect-control][data-size="sm"] { padding: var(--space-xs) var(--space-sm); font-size: var(--type-sm); padding-inline-end: ${CHEVRON_INSET}; }
[data-mw-multiselect-control][data-size="md"] { padding: var(--space-sm) var(--space-md); font-size: var(--type-md); padding-inline-end: ${CHEVRON_INSET}; } /* the sibling recipe, identical to Combobox md; the v5.5.0 2xs vertical was a workaround for the unpinned leading fixed above (CG-2) */
[data-mw-multiselect-control][data-size="lg"] { padding: var(--space-md); font-size: var(--type-lg); padding-inline-end: ${CHEVRON_INSET}; } /* the sibling recipe, identical to Combobox lg (CG-2) */
[data-mw-multiselect-control] [data-mw-multiselect-input] { font-size: inherit; }
[data-mw-multiselect-control]:hover:not(:focus-within) { border-color: var(--text-positive-tertiary); }
[data-mw-multiselect-control]:focus-within { border-color: var(--accent-base); background: var(--background-positive-primary); box-shadow: var(--shadow-focus); }
[data-mw-multiselect-control][data-error="true"] { border-color: var(--border-error); }
[data-mw-multiselect-control][data-error="true"]:focus-within { box-shadow: var(--shadow-focus-error); }
[data-mw-multiselect-control][data-disabled="true"] { opacity: 0.5; cursor: not-allowed; background: var(--background-positive-primary); }
[data-mw-multiselect-input]::placeholder { color: var(--text-positive-tertiary); }
[data-mw-multiselect-chip-x]:hover { color: var(--accent-ink); }
[data-mw-multiselect-chip-x]:focus-visible { outline: var(--focus-outline); outline-offset: 1px; border-radius: 2px; } /* micro radius on a tiny control, deliberately below the radius scale */

[data-mw-multiselect-option] {
  padding: var(--space-xs) var(--space-sm);
  /* Shared menu-option rhythm (see Combobox): tight leading keeps rows dense. */
  line-height: var(--leading-tight);
  border-radius: var(--component-radius);
  font-family: var(--font-body);
  font-size: var(--type-sm);
  color: var(--text-positive-secondary);
  cursor: pointer;
}
[data-mw-multiselect-option][data-active="true"] { background: var(--accent-soft); color: var(--accent-emphasis); }
[data-mw-multiselect-option][aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; }
`;

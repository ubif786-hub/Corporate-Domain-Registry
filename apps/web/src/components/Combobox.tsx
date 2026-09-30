"use client";

import { CSSProperties, FocusEvent, KeyboardEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "@carbon/icons-react";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   Combobox — a searchable/typeahead select for long option lists.

   A CLIENT component (the first in the form family): it filters options as you
   type, moves an active highlight with the arrow keys, and follows the WAI-ARIA
   combobox pattern (input role="combobox" + a listbox popover of role="option"
   items, wired by aria-activedescendant). The chosen VALUE submits in a form
   through a hidden input named `name`; the visible input shows the label.

   Typing is a FILTER, not a value (pass 3, 27 Aug 2026). Only a pick (Enter on
   the active option, a press on an option) commits. Every close WITHOUT a pick
   (Escape, a pointer down elsewhere, focus leaving the field) funnels through
   one helper that reconciles the text with the committed value: the query
   reverts to the selected label. The one exception is an EMPTIED field, the
   deliberate no-value gesture: closing it clears the selection (hidden input
   "", onChange("")). Before this, the two states drifted apart for good: with
   "Germany" chosen, typing "Fra" and clicking away left the field reading
   "Fra" while the form submitted "germany".

   Where Select (a native <select>) is the right call for short, zero-JS lists
   and the mobile OS picker, Combobox earns its client cost when the list is long
   enough to need type-ahead filtering. Field surface tokens match Input/Select;
   the popover uses the raised-surface recipe (Modal/Lightbox language).
   ============================================================ */

export type ComboboxSize = "sm" | "md" | "lg";

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  id?: string;
  /** Submitted form field name (on the hidden value input). */
  name?: string;
  label?: ReactNode;
  options: ComboboxOption[];
  placeholder?: string;
  /** Initially-selected value (uncontrolled). */
  defaultValue?: string;
  /** Fires with the chosen option's value. The field stays UNCONTROLLED
   *  (defaultValue seeds it); this only reports, so a consumer can react to a
   *  choice without reading the hidden input back out of the DOM (A-045). Also
   *  fires with "" when an emptied field is closed without a pick (the
   *  selection is cleared). */
  onChange?: (value: string) => void;
  helper?: ReactNode;
  /** Error message. When set, the field turns error-styled and this renders below it.
   *  A bare `true` styles the field invalid without a message: the helper stays
   *  rendered and keeps describing the field, and no empty alert is emitted. */
  error?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  size?: ComboboxSize;
  /** Shown when the query matches no option. */
  emptyText?: string;
}

export function Combobox({
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
}: ComboboxProps) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const listId = `${id}-listbox`;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const errorMessage = typeof error === "boolean" ? undefined : error;
  // hasError drives aria-invalid and the invalid styling; the MESSAGE branch
  // below renders only for a real message (a bare `true` keeps the helper).
  const hasError = error === true || Boolean(errorMessage);
  const showErrorMessage = Boolean(errorMessage);

  const initialLabel = options.find((o) => o.value === defaultValue)?.label ?? "";
  const [selectedValue, setSelectedValue] = useState(defaultValue ?? "");
  const [query, setQuery] = useState(initialLabel);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLabel = options.find((o) => o.value === selectedValue)?.label ?? "";
  // Unedited (query still equals the selection) shows the whole list on reopen; typing filters.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || query === selectedLabel) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options, selectedLabel]);
  // Where the committed value sits in the list on show (-1 with nothing selected
  // or the filter hiding it). Opening lands on it: onKeyDown and the open effect.
  const selectedIndex = selectedValue === "" ? -1 : filtered.findIndex((o) => o.value === selectedValue);
  // ...but only while the query is UNEDITED, which is the same condition that
  // keeps `filtered` the whole option set. Once the field has been typed into or
  // emptied, the list is a set of SUGGESTIONS and the first arrow belongs at the
  // top of it: with "Romania" committed, typing "an" must reach Canada, the first
  // match, not jump back to the value being replaced (skeptic pass, 27 Aug 2026).
  const anchorIndex = query === selectedLabel ? selectedIndex : -1;

  // THE uncommitted-close path. Every way out of the popover that is not a
  // pick (Escape, a pointer down outside, focus leaving) ends here, so the
  // visible text and the submitted value can never disagree after a close:
  // the text reverts to the selected label, or an emptied field clears the
  // selection (the one deliberate no-value gesture). See the header.
  const closeUncommitted = () => {
    setOpen(false);
    setActiveIndex(-1);
    if (query === selectedLabel) return;
    if (query.trim() === "") {
      setQuery("");
      if (selectedValue !== "") {
        setSelectedValue("");
        onChange?.("");
      }
      return;
    }
    setQuery(selectedLabel);
  };
  // The outside-pointerdown listener is registered once per open and would
  // otherwise close over a stale query; it reads the latest helper through a ref.
  const closeUncommittedRef = useRef(closeUncommitted);
  useEffect(() => {
    closeUncommittedRef.current = closeUncommitted;
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeUncommittedRef.current();
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  // Focus leaving the field closes the popover. React's onBlur on the root is
  // focusout, which bubbles, so this sees every focus move inside the field
  // and acts only when the destination is outside it (Tab to the next
  // control) or nowhere (relatedTarget null: the window lost focus, or a
  // press on non-focusable chrome). The pointerdown listener above cannot
  // see a keyboard leaving, so a tabbed-past combobox used to keep its list
  // painted over the next two fields with aria-expanded still true. Pointer
  // work inside the popover never reaches here: the popover cancels mousedown
  // below, so the input keeps focus through an option press, a press on the
  // empty row, or a scrollbar drag.
  const onRootBlur = (e: FocusEvent<HTMLDivElement>) => {
    const to = e.relatedTarget as Node | null;
    if (to && rootRef.current?.contains(to)) return;
    closeUncommitted();
  };

  const describedBy = showErrorMessage ? errorId : helper ? helperId : undefined;

  // Every commit path funnels through here (option pointerdown, Enter on the
  // active option), so the report hook fires exactly once per choice.
  const choose = (o: ComboboxOption) => {
    if (o.disabled) return;
    setSelectedValue(o.value);
    setQuery(o.label);
    setOpen(false);
    setActiveIndex(-1);
    onChange?.(o.value);
  };

  // Brings one row into view by scrolling the LIST, never scrollIntoView: that
  // walks every scrollable ancestor up to the viewport, so a field near the fold
  // drags the whole page to its popover (the Listbox mount rule). The open
  // effect below used this shape already; the arrow walk did not, and now both
  // go through one function. getElementById rather than CommandPalette's
  // querySelector, because useId() ids carry colons that a selector needs
  // escaped and an id lookup does not.
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

  // A keyboard move of the active option keeps it in view. The popover is
  // height-capped (--popover-max-height, about seven rows) and
  // aria-activedescendant moves nothing by itself, so an arrow walk past the
  // fold used to drive an invisible highlight. Scrolled here, on the key, and
  // not in an effect on activeIndex: a pointer sets activeIndex too, and a
  // partially visible row that scrolls itself fully into view slides the next
  // row under the still pointer, which enters, scrolls, and so on to the end
  // of the list. The other half of that pair is the stationary-pointer guard on
  // the options themselves (see setActiveFromPointer).
  const moveActive = (next: number) => {
    setActiveIndex(next);
    scrollRowIntoList(next);
  };

  // A pointer sets the active option, but ONLY when the pointer actually moved.
  // Any scroll re-fires the hover events on whatever row lands under a
  // STATIONARY pointer, and that row sits BEHIND the one the arrows just
  // reached, so the highlight walked backwards: parked over row 4 on
  // /components/combobox, three ArrowDowns read 5, 6, 7, 5 (pass 4 follow-up,
  // measured 27 Aug 2026). Chromium re-dispatches that move at the last real
  // pointer position, so comparing coordinates separates a user's move from the
  // browser's bookkeeping. pointermove rather than pointerenter for the same
  // reason: enter carries no way to tell the two apart.
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const setActiveFromPointer = (index: number, x: number, y: number) => {
    if (lastPointer.current && lastPointer.current.x === x && lastPointer.current.y === y) return;
    lastPointer.current = { x, y };
    setActiveIndex(index);
  };

  // On open, the selection is brought into view inside the LIST. Not
  // scrollIntoView: that walks every scrollable ancestor, and a field near the
  // fold would drag the page to its popover on focus (the Listbox mount rule).
  // A focus-open keeps nothing active, so the selection is simply visible; an
  // arrow-open also makes it the active option (set in the same update as the
  // open, so this sees it). A typing-open has no anchor at all (anchorIndex) and
  // stays at the top of its matches. Once per open, not on every activeIndex
  // change: a pointer move sets activeIndex too, and a hover-driven scroll
  // cascades down the list one partially visible row at a time.
  const scrolledThisOpen = useRef(false);
  useEffect(() => {
    if (!open) { scrolledThisOpen.current = false; return; }
    if (scrolledThisOpen.current) return;
    scrolledThisOpen.current = true;
    scrollRowIntoList(activeIndex >= 0 ? activeIndex : anchorIndex);
  }, [open, activeIndex, anchorIndex, id]);

  // The arrows follow the APG editable-combobox shape for a field that already
  // holds a value (B4, 27 Aug 2026): on a closed field they open it with the
  // SELECTED option active; on an open field with nothing active yet (a
  // focus-open) the first press lands on the selection rather than the top of
  // the list, and the next walks on from it. With no selection in the list, or
  // once the query has been edited, the walk starts at the first option as
  // before: see anchorIndex.
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); setActiveIndex(anchorIndex); return; }
      moveActive(activeIndex < 0 && anchorIndex >= 0 ? anchorIndex : Math.min(activeIndex + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); setActiveIndex(anchorIndex); return; }
      moveActive(activeIndex < 0 && anchorIndex >= 0 ? anchorIndex : Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        choose(filtered[activeIndex]);
      }
    } else if (e.key === "Escape") {
      // Claim the key only while the popover is open (the Search/CommandPalette
      // contract): preventDefault marks the event consumed before a parent
      // overlay's window listener sees it, so one Escape closes the popover and
      // the next one closes the overlay, instead of a single press collapsing
      // both and a FormModal remount destroying the draft. Already closed,
      // Escape falls through untouched. Closing is uncommitted: the text
      // reverts to the selection.
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        closeUncommitted();
      }
    }
  };

  return (
    <div data-mw-combobox="" style={rootStyle} ref={rootRef} onBlur={onRootBlur}>
      <style href="magentaweb-combobox" precedence="default">{comboboxCss}</style>
      {label ? (
        <FieldLabel htmlFor={id} dataAttr="data-mw-combobox-label" marking={resolveMarking(marking, required)}>{label}</FieldLabel>
      ) : null}

      <div data-mw-combobox-wrap="" style={wrapStyle}>
        {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
        <input
          id={id}
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
          placeholder={placeholder}
          value={query}
          data-mw-combobox-input=""
          data-size={size}
          data-error={hasError ? "true" : "false"}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <ChevronDown size={16} aria-hidden="true" data-mw-combobox-chevron="" style={chevronStyle} />

      {/* The popover surface holds the listbox and, beside it, the no-match
          message: a listbox may own only options (or groups), so the empty
          state is a SIBLING of the list, not a role-less child inside it
          (pass 3, 27 Aug 2026). The list keeps its own scroll (height-capped)
          and collapses its padding when it owns nothing, so the message sits
          exactly where the old in-list row did.
          The list's aria-label takes a plain string only; a non-string
          ReactNode label falls back to the generic name. onMouseDown is
          cancelled on the surface so nothing in the popover takes focus off
          the input (see onRootBlur); the options' own pointerdown handlers
          already do this for themselves, this covers the empty message, the
          padding and the scrollbar. tabIndex -1 keeps the list out of the tab
          sequence: Chromium 130+ makes a scrollable element with no focusable
          children a keyboard tab stop, so Tab from the input landed on the
          popover itself, inside the field, and the field never saw focus
          leave. */}
      {open ? (
        <div data-mw-combobox-popover="" style={popoverStyle} onMouseDown={(e) => e.preventDefault()}>
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label={typeof label === "string" ? label : "Options"}
            data-mw-combobox-list=""
            style={filtered.length === 0 ? emptyListStyle : listStyle}
            tabIndex={-1}
          >
            {filtered.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={o.value === selectedValue}
                aria-disabled={o.disabled || undefined}
                data-mw-combobox-option=""
                data-active={i === activeIndex ? "true" : "false"}
                data-selected={o.value === selectedValue ? "true" : "false"}
                onPointerDown={(e) => {
                  // pointerdown (not click) so the outside-close listener does not fire first
                  e.preventDefault();
                  choose(o);
                }}
                onPointerMove={(e) => setActiveFromPointer(i, e.clientX, e.clientY)}
              >
                {o.label}
              </li>
            ))}
          </ul>
          {filtered.length === 0 ? (
            <div data-mw-combobox-empty="" style={emptyStyle}>{emptyText}</div>
          ) : null}
        </div>
      ) : null}
      </div>

      {/* Distinct keys: the two branches are both <p>, and without keys React
          reuses the node and swaps role="alert" onto it in the same commit as
          its text, which screen readers typically never announce. A keyed
          branch mounts a fresh alert node. */}
      {showErrorMessage ? (
        <p key="error" id={errorId} role="alert" data-mw-combobox-error="" style={errorStyle}>
          {errorMessage}
        </p>
      ) : helper ? (
        <p key="helper" id={helperId} data-mw-combobox-helper="" style={helperStyle}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  position: "relative",
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

// The chevron's own offset from the edge stays on --space-sm, which DOES ride
// the spacing dial. Sanctioned (S-11, D35): it tracks the field's own inline
// padding, so the glyph keeps its optical relationship to the text at every
// dial, and it is the inset behind it, not this offset, that was the dead
// space. Measured, not assumed: probe-control-geometry.mjs reads the gap
// between this glyph and the field's content box at all three dials.
const chevronStyle: CSSProperties = {
  position: "absolute",
  right: "var(--space-sm)",
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  color: "var(--text-positive-tertiary)",
  display: "inline-flex",
};

// The popover surface (the raised-surface recipe); the list inside it scrolls.
const popoverStyle: CSSProperties = {
  /* Anchored to the FIELD WRAP, not the field group (2 Sep 2026). top:100% resolves
     against the nearest positioned ancestor, which used to be the root, so the list
     opened below the helper line rather than below the input: measured 33.8px on a
     DatePicker with helper text against 3.9px for a DropdownMenu, and it swung with
     the spacing dial because the group's own gaps ride the multiplier. The wrap holds
     the control alone, so 100% is the control's bottom edge and --popover-offset is
     the whole distance. */
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  margin: "var(--popover-offset) 0 0",
  background: "var(--background-positive-primary)",
  border: "1px solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  boxShadow: "var(--shadow-raised)",
  zIndex: tokenNumber("var(--z-overlay)"),
};

const listStyle: CSSProperties = {
  margin: 0,
  padding: "var(--space-3xs)",
  listStyle: "none",
  maxHeight: "var(--popover-max-height)",
  overflowY: "auto",
};

// An empty listbox takes no room; the message beside it carries the inset.
const emptyListStyle: CSSProperties = {
  ...listStyle,
  padding: 0,
};

const emptyStyle: CSSProperties = {
  margin: "var(--space-3xs)",
  padding: "var(--space-sm) var(--space-md)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-tertiary)",
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

// The room reserved for the chevron (D35, 27 Aug 2026). It used to be
// --space-2xl, a spacing RUNG that rides --spacing-multiplier, so the dead inset
// moved with a CONTENT dial while the thing it clears is fixed control geometry,
// a 16px glyph at a fixed offset. Measured at 1280px: 38.66 / 51.55 / 82.48 px at
// compact / normal / dramatic. It is now composed from the control's own
// geometry: the WCAG target floor plus one rung, both dial-independent, so every
// size reserves the same 38.66px at every dial. Same value at sm, md and lg on
// purpose: the glyph is 16px and its offset is --space-sm whatever the field
// size. The Select comment carries the full reasoning; guarded for all four
// fields by scripts/probe-control-geometry.mjs.
const CHEVRON_INSET = "var(--control-adornment-inset)";

// State rules for the input and options live here so hover/focus/active win the cascade.
const comboboxCss = `
[data-mw-combobox-input] {
  width: 100%;
  font-family: var(--font-body);
  /* CONTROL HEIGHT PARITY (CG-1, 2 Sep 2026): the FIELD had no pinned leading, so it
     inherited the body's prose 1.5 against Button's --leading-tight and stood
     font-size x 0.3 taller: measured 53.53px against Button's 48.38px at md, and the
     gap widened with the spacing dial (3.42 / 5.15 / 7.74px at compact / normal /
     dramatic). Two censuses missed it because the file DOES contain line-height, on
     [data-mw-combobox-option] eleven rules below: a grep for the property found the
     menu row and reported the component as already pinned. Match the USE, not the
     mention. */
  line-height: var(--leading-tight);
  color: var(--text-positive-primary);
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
  border-radius: var(--component-radius);
  outline: none;
  padding-inline-end: ${CHEVRON_INSET};
  transition:
    border-color var(--motion-transition),
    background var(--motion-transition),
    box-shadow var(--motion-transition);
}
[data-mw-combobox-input][data-size="sm"] { font-size: var(--type-sm); padding: var(--space-xs) var(--space-sm); padding-inline-end: ${CHEVRON_INSET}; }
[data-mw-combobox-input][data-size="md"] { font-size: var(--type-md); padding: var(--space-sm) var(--space-md); padding-inline-end: ${CHEVRON_INSET}; }
[data-mw-combobox-input][data-size="lg"] { font-size: var(--type-lg); padding: var(--space-md); padding-inline-end: ${CHEVRON_INSET}; }
[data-mw-combobox-input]:hover:not(:focus):not(:disabled) { border-color: var(--text-positive-tertiary); }
[data-mw-combobox-input]:focus { border-color: var(--accent-base); background: var(--background-positive-primary); box-shadow: var(--shadow-focus); }
[data-mw-combobox-input]:disabled { opacity: 0.5; cursor: not-allowed; background: var(--background-positive-primary); }
[data-mw-combobox-input][data-error="true"] { border-color: var(--border-error); }
[data-mw-combobox-input][data-error="true"]:focus { box-shadow: var(--shadow-focus-error); }
[data-mw-combobox-input]::placeholder { color: var(--text-positive-tertiary); }

[data-mw-combobox-option] {
  padding: var(--space-xs) var(--space-sm);
  /* Shared menu-option rhythm: without this the option inherits the body's
     relaxed (~1.5) leading and each row reads loose; leading-tight matches the
     density of DropdownMenu/Listbox/MultiSelect and the rest of the form kit. */
  line-height: var(--leading-tight);
  border-radius: var(--component-radius);
  font-family: var(--font-body);
  font-size: var(--type-sm);
  color: var(--text-positive-secondary);
  cursor: pointer;
}
[data-mw-combobox-option][data-active="true"] {
  background: var(--accent-soft);
  color: var(--accent-emphasis);
}
[data-mw-combobox-option][data-selected="true"] {
  color: var(--text-positive-primary);
  font-family: var(--font-code);
}
[data-mw-combobox-option][aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}
`;

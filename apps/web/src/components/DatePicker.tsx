"use client";

import {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Calendar, ChevronLeft, ChevronRight } from "@carbon/icons-react";
import { dateFieldBaseCss, DATE_FIELD_BASE_HREF } from "@/components/internal/dateFieldStyles";
import { srOnly, tokenNumber } from "@/components/internal/styles";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   DatePicker — V1 scaffold. Single-date selection, single-month view.
   Range, presets, and multi-month layouts are explicitly deferred.

   Composition: a trigger field that mirrors InputField's visual
   treatment and a calendar popover positioned absolutely below.
   Date logic is inline (no date-fns dependency); the surface area
   stays small for V1 and the standard Date object is sufficient.

   Outside-click and Escape both close the popover. Keyboard nav on
   the grid follows the standard pattern: Arrows move the focused
   day within the month, Enter selects, Escape closes. The trigger
   is a button with aria-haspopup="dialog" / aria-expanded pointing
   to a role="dialog" popover; the day grid uses ARIA grid semantics.
   ============================================================ */

type DateFormat = "short" | "long";

export interface DatePickerProps {
  id: string;
  label?: ReactNode;
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  helper?: ReactNode;
  error?: ReactNode;
  format?: DateFormat;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// en-US abbreviations, matching what toLocaleDateString("en-US", { month:
// "short" }) produces, so the unpinned formatDate below renders the exact
// text the pinned version did for a correctly labeled day.
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

// Returns the offset of the first day of the displayed month from Monday (0..6).
function mondayFirstOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  // JS: Sunday = 0, Monday = 1. We want Monday-first so Monday → 0, Sunday → 6.
  return (day + 6) % 7;
}

function formatDate(d: Date, fmt: DateFormat): string {
  // Format from the LOCAL calendar fields (getFullYear/getMonth/getDate), the
  // same fields isSameDay and the grid cells read, so the trigger label always
  // names the day the grid highlights. The old timeZone:"UTC" pin here dodged
  // a #418 hydration mismatch but formatted the instant, so zones east of UTC
  // labeled the trigger with the day before the selected cell. Determinism
  // survives the unpin: a fixed en-US month table plus plain field reads is a
  // pure function of the fields, no Intl zone lookup at format time, so SSR
  // and client render byte-identical text from the same date fields. The
  // trigger label stays the only SSR surface (the grid renders while open,
  // client-only).
  const month = (fmt === "short" ? MONTHS_SHORT : MONTHS)[d.getMonth()];
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

interface DayCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

function buildGrid(
  viewYear: number,
  viewMonth: number,
  selected: Date | null,
  today: Date,
  minDate?: Date,
  maxDate?: Date,
): DayCell[] {
  const cells: DayCell[] = [];
  const offset = mondayFirstOffset(viewYear, viewMonth);
  // Always render a 6-week grid (42 cells) for stable height.
  const startDate = new Date(viewYear, viewMonth, 1 - offset);
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const inMonth = date.getMonth() === viewMonth;
    const isDisabled =
      (!!minDate && date < startOfDay(minDate)) ||
      (!!maxDate && date > startOfDay(maxDate));
    cells.push({
      date,
      inMonth,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, selected),
      isDisabled,
    });
  }
  return cells;
}

// The day cell that carries the roving tab stop. focusedDate names it while it
// sits in the displayed month. After the month nav pages the view away from it
// (focusedDate stays put on purpose: moving it would run the focus effect and
// yank focus off the nav button on every press, so a keyboard user paging
// three months forward would lose the button after the first Enter), the stop
// is derived instead: the enabled in-month cell nearest the same day-of-month,
// clamped to the month's length, so 31 Aug maps to 30 Sep. Null only when
// every day of the displayed month is disabled, and then there is nothing in
// the grid to reach. This is also the day the keyboard is ON, so moveFocus and
// Enter start from it rather than from a focusedDate the view left behind.
function tabStopFor(grid: DayCell[], viewDate: Date, focusedDate: Date | null): Date | null {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const preferred =
    focusedDate && focusedDate.getFullYear() === y && focusedDate.getMonth() === m
      ? startOfDay(focusedDate)
      : new Date(y, m, Math.min(focusedDate?.getDate() ?? 1, daysInMonth));
  let best: Date | null = null;
  let bestDistance = Infinity;
  for (const cell of grid) {
    if (!cell.inMonth || cell.isDisabled) continue;
    const distance = Math.abs(cell.date.getTime() - preferred.getTime());
    if (distance < bestDistance) {
      best = cell.date;
      bestDistance = distance;
    }
  }
  return best;
}

export function DatePicker({
  id,
  label,
  value,
  defaultValue,
  onChange,
  placeholder = "Select a date",
  minDate,
  maxDate,
  disabled = false,
  required = false,
  marking,
  helper,
  error,
  format = "short",
}: DatePickerProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<Date | null>(defaultValue ?? null);
  const selected: Date | null = isControlled ? (value ?? null) : internalValue;

  const hasError = Boolean(error);
  const errorMessage = typeof error === "boolean" ? undefined : error;
  // A bare `true` styles the field invalid and carries no text, so the message
  // line is gated on a real message: the helper stays rendered and described,
  // and no empty alert is ever emitted. hasError keeps driving aria-invalid.
  const hasErrorMessage = Boolean(errorMessage);
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const requiredId = `${id}-required`;
  const popoverId = `${id}-popover`;
  // Required is announced via a visually-hidden describedby hint (aria-required is
  // dropped on the button role); the error is the role="alert" message, also
  // referenced via describedby when present (A-011).
  const describedBy =
    [required ? requiredId : null, hasErrorMessage ? errorId : helper ? helperId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => {
    const seed = selected ?? new Date();
    return new Date(seed.getFullYear(), seed.getMonth(), 1);
  });
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  // Focus restore on keyboard/selection closes (audit F9): closing used to
  // unmount the focused day and drop focus to <body>. Outside-click closes
  // pass refocus=false (the user is already elsewhere).
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  // Single close path: clears the keyboard-focused day with the popover. Lets
  // focusedDate be driven from the open/close event handlers instead of an
  // effect that synced it from `open` (and re-triggered itself via its own dep).
  const closePopover = useCallback((refocus = true) => {
    setOpen(false);
    setFocusedDate(null);
    if (refocus) triggerRef.current?.focus();
  }, []);

  // Viewport fit, the same contract DateRangePicker carries (B5, 27 Aug 2026). The popover
  // anchors at the field's left edge (left: 0 of the root) against a fixed floor width, so a
  // field that does not start at the viewport gutter pushes it toward the right edge. At 390px
  // it clears by 36px on the NORMAL spacing dial, which is not a margin: one wider row and it is
  // the range picker's bug verbatim. On the DRAMATIC dial it was not clearing at all. The dial
  // widens the popover's own padding (288.5px to 305.6px) and moves the field, and the docs
  // demo measured 9.5px past the right edge at 390px before this, so the class was open, not
  // merely close to opening. CSS cannot know the anchor's viewport offset, so it is measured once the
  // popover exists (again on resize, and when the month nav changes what the header holds) and
  // handed to the sheet as two px custom properties; the sheet owns the arithmetic (slide left
  // by the overshoot past the gutter, never past the left gutter). Measured UNSHIFTED, so a
  // re-measure never compounds the last slide.
  const monthKey = `${viewDate.getFullYear()}-${viewDate.getMonth()}`;
  useLayoutEffect(() => {
    if (!open) return;
    const popover = rootRef.current?.querySelector<HTMLElement>("[data-mw-date-popover]");
    if (!popover) return;
    const measure = () => {
      popover.style.removeProperty("--mw-date-overshoot");
      popover.style.removeProperty("--mw-date-anchor");
      const r = popover.getBoundingClientRect();
      popover.style.setProperty("--mw-date-overshoot", `${r.right - document.documentElement.clientWidth}px`);
      popover.style.setProperty("--mw-date-anchor", `${r.left}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, monthKey]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: globalThis.MouseEvent) => {
      const t = e.target as Node | null;
      if (rootRef.current && t && !rootRef.current.contains(t)) {
        closePopover(false);
      }
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Escape on the open popover closes it and claims the key, so an
      // ancestor overlay (useDialogOverlay yields on e.defaultPrevented) stays
      // open while the user backs out of the calendar. The defaultPrevented
      // check yields the same way to an inner claimant (the grid's own Escape
      // case runs first via React's root and has already closed). This
      // listener only exists while open, so a closed picker lets Escape fall
      // through untouched and still close the ancestor.
      e.preventDefault();
      e.stopPropagation();
      closePopover();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closePopover]);

  const openPopover = () => {
    if (disabled) return;
    setOpen(true);
    setFocusedDate(selected ?? today);
    if (selected) {
      setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  };

  const selectDate = (d: Date) => {
    if (!isControlled) setInternalValue(d);
    onChange?.(d);
    closePopover();
  };

  const grid = buildGrid(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    selected,
    today,
    minDate,
    maxDate,
  );
  // Exactly one visible day is tabbable, whichever month the nav paged to.
  const tabStop = tabStopFor(grid, viewDate, focusedDate);

  const moveFocus = (delta: number) => {
    // From the tab stop, which is the cell the keyboard is on: focusedDate
    // itself while the view shows it, the derived stop once the month nav has
    // paged the view away from it (see tabStopFor).
    const base = tabStop ?? focusedDate ?? selected ?? today;
    const next = new Date(base);
    next.setDate(next.getDate() + delta);
    setFocusedDate(next);
    // If we left the displayed month, follow it.
    if (next.getMonth() !== viewDate.getMonth() || next.getFullYear() !== viewDate.getFullYear()) {
      setViewDate(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  };

  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowLeft": e.preventDefault(); moveFocus(-1); break;
      case "ArrowRight": e.preventDefault(); moveFocus(1); break;
      case "ArrowUp": e.preventDefault(); moveFocus(-7); break;
      case "ArrowDown": e.preventDefault(); moveFocus(7); break;
      case "Enter":
      case " ":
        // The tab stop is an enabled cell by construction, so no bounds check.
        if (tabStop) {
          e.preventDefault();
          selectDate(tabStop);
        }
        break;
      case "Escape": e.preventDefault(); closePopover(); break;
    }
  };

  // Stable per-day DOM id + focus-follows effect (ported from DateRangePicker,
  // audit F8): arrow keys used to move only React state while DOM focus sat on
  // an outline-suppressed grid, so keyboard users saw NO indicator at all.
  const dayCellId = (d: Date) =>
    `${id}-day-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  useEffect(() => {
    if (!open || !focusedDate) return;
    document.getElementById(dayCellId(focusedDate))?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dayCellId is render-stable (derives only from the id prop)
  }, [open, focusedDate, id]);

  const triggerLabel = selected ? formatDate(selected, format) : placeholder;
  const triggerHasValue = Boolean(selected);

  return (
    <div ref={rootRef} style={rootStyle} data-mw-date-picker="">
      <style href={DATE_FIELD_BASE_HREF} precedence="default">{dateFieldBaseCss}</style>
      <style href="magentaweb-date-picker" precedence="default">{datePickerCss}</style>

      {label ? (
        <FieldLabel htmlFor={id} marking={resolveMarking(marking, required)}>{label}</FieldLabel>
      ) : null}

      {/* The control's own positioning context (2 Sep 2026). The popover is anchored
          with top:100%, which resolves against the nearest positioned ancestor: that
          used to be the field group, so the calendar opened below the HELPER line, a
          measured 33.8px from the control against 3.9px for a DropdownMenu, and the
          distance moved with the spacing dial because the group's gaps ride the
          multiplier. This wrap holds the control alone, so 100% is the control's own
          bottom edge and --popover-offset is the entire gap. */}
      <div style={fieldWrapStyle}>
        <button
          ref={triggerRef}
          type="button"
          id={id}
          data-mw-date-trigger=""
          data-error={hasError ? "true" : "false"}
          data-has-value={triggerHasValue ? "true" : "false"}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={popoverId}
          aria-describedby={describedBy}
          onClick={openPopover}
        >
          <span style={triggerLabelStyle}>{triggerLabel}</span>
          <Calendar size={18} aria-hidden="true" />
        </button>

        {open ? (
          <div
            id={popoverId}
            role="dialog"
            aria-label="Choose date"
            aria-modal="false"
            style={popoverStyle}
            data-mw-date-popover=""
          >
            <div style={popoverHeaderStyle}>
              <button
                type="button"
                aria-label="Previous month"
                data-mw-date-nav=""
                onClick={() => setViewDate(addMonths(viewDate, -1))}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span style={monthLabelStyle} aria-live="polite">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                aria-label="Next month"
                data-mw-date-nav=""
                onClick={() => setViewDate(addMonths(viewDate, 1))}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>

            {/* No tabIndex: the roving-focus days are the tab stop (audit F8; a
                focusable grid with a suppressed outline was an invisible stop). */}
            <div
              role="grid"
              aria-label={`${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
              onKeyDown={onGridKeyDown}
              style={gridStyle}
            >
              <div role="row" style={weekdayRowStyle}>
                {WEEKDAYS.map((w) => (
                  <span key={w} role="columnheader" style={weekdayStyle}>{w}</span>
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, weekIdx) => (
                <div key={weekIdx} role="row" style={weekRowStyle}>
                  {grid.slice(weekIdx * 7, weekIdx * 7 + 7).map((cell, dayIdx) => {
                    // Gated on inMonth: the tab stop is always an in-month date,
                    // and the 42-cell grid never repeats a date, so this marks
                    // exactly one cell. (Before the derived stop, a focusedDate
                    // left behind by the month nav matched no cell at all, or one
                    // in the leading/trailing week by accident.)
                    const isTabStop = cell.inMonth && isSameDay(tabStop, cell.date);
                    return (
                      <button
                        key={`${weekIdx}-${dayIdx}`}
                        type="button"
                        role="gridcell"
                        id={cell.inMonth ? dayCellId(cell.date) : undefined}
                        tabIndex={isTabStop ? 0 : -1}
                        data-mw-date-day=""
                        data-in-month={cell.inMonth ? "true" : "false"}
                        data-today={cell.isToday ? "true" : "false"}
                        data-selected={cell.isSelected ? "true" : "false"}
                        data-focused={isTabStop ? "true" : "false"}
                        aria-selected={cell.isSelected}
                        aria-current={cell.isToday ? "date" : undefined}
                        aria-disabled={cell.isDisabled || undefined}
                        disabled={cell.isDisabled}
                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          selectDate(cell.date);
                        }}
                        onMouseEnter={() => setFocusedDate(cell.date)}
                      >
                        {cell.date.getDate()}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {required ? (
        <span id={requiredId} style={srOnly}>required</span>
      ) : null}

      {/* Keyed so React inserts the alert instead of mutating the helper node into
          it: role="alert" added to an element already in the DOM is the unreliable
          case for live regions. */}
      {hasErrorMessage ? (
        <p key="error" id={errorId} role="alert" style={errorStyle}>{errorMessage}</p>
      ) : helper ? (
        <p key="helper" id={helperId} style={helperStyle}>{helper}</p>
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



const triggerLabelStyle: CSSProperties = {
  flex: 1,
  textAlign: "left",
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

/* The control's positioning context: block so the popover's left/right 0 resolve to the
   same edges the field group gave it, relative so top:100% is the control's bottom. */
const fieldWrapStyle: CSSProperties = { position: "relative", display: "block", maxWidth: "100%" };

const popoverStyle: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  marginTop: "var(--popover-offset)",
  background: "var(--background-positive-primary)",
  border: "1px solid var(--border-positive-primary)",
  borderRadius: "var(--component-radius)",
  boxShadow: "var(--shadow-raised)",
  padding: "var(--space-md)",
  zIndex: tokenNumber("var(--z-overlay)"),
  // Fits the seven-column day grid at the calendar type size; the range picker
  // documents its 40rem twin the same way.
  minWidth: "18rem",
  // Never wider than the viewport minus its two gutters. min-width wins over max-width by
  // definition, so this caps growth rather than shrinking the grid below its floor; the slide
  // in the sheet handles what is left over.
  maxWidth: "calc(100vw - 2 * var(--space-lg))",
};

const popoverHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--space-sm)",
};

const monthLabelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--text-positive-primary)",
};

const gridStyle: CSSProperties = {
  outline: "none",
};

const weekdayRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  marginBottom: "var(--space-2xs)",
};

const weekRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
};

const weekdayStyle: CSSProperties = {
  textAlign: "center",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  color: "var(--text-positive-tertiary)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  paddingBlock: "var(--space-2xs)",
};

// Trigger + month-nav rules live in the shared dateFieldBaseCss block (rendered
// under DATE_FIELD_BASE_HREF). This block is DatePicker's own single-month day
// grid: fixed-width day cells.
const datePickerCss = `
/* Viewport fit (the twin of the range picker's rule). --mw-date-overshoot is how far the
   unshifted right edge sits past the viewport edge (negative when it fits) and --mw-date-anchor
   is the unshifted left edge; both are measured px the component sets once the popover exists.
   The slide is the overshoot past the gutter, floored at 0 and capped so the left edge never
   crosses the gutter. The fallbacks resolve to no slide, which is also how the measurement
   itself reads the box unshifted. A margin, not a transform, so the text stays on whole pixels. */
[data-mw-date-popover] {
  --mw-date-fit: max(
    0px,
    min(
      calc(var(--mw-date-overshoot, -9999px) + var(--space-lg)),
      calc(var(--mw-date-anchor, 0px) - var(--space-lg))
    )
  );
  margin-left: calc(-1 * var(--mw-date-fit));
}
[data-mw-date-day] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-size-lg);
  height: var(--control-size-lg);
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-positive-primary);
  font-family: var(--font-code);
  font-size: var(--type-sm);
  cursor: pointer;
  border-radius: var(--component-radius);
  transition:
    background var(--motion-transition),
    color var(--motion-transition),
    border-color var(--motion-transition);
}
[data-mw-date-day][data-in-month="false"] {
  color: var(--text-positive-tertiary);
}
[data-mw-date-day][data-today="true"] {
  border-color: var(--accent-base);
}
[data-mw-date-day]:hover:not(:disabled) {
  background: var(--background-positive-secondary);
}
[data-mw-date-day][data-selected="true"] {
  background: var(--accent-base);
  color: var(--text-on-accent);
  border-color: var(--accent-base);
}
[data-mw-date-day]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
[data-mw-date-day]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

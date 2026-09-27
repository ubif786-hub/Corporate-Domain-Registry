"use client";

import {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Calendar, ChevronLeft, ChevronRight } from "@carbon/icons-react";
import { srOnly, tokenNumber } from "@/components/internal/styles";
import { dateFieldBaseCss, DATE_FIELD_BASE_HREF } from "@/components/internal/dateFieldStyles";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   DateRangePicker — V1 scaffold. Two-month calendar plus a preset
   list. Sibling to DatePicker rather than an extension: the
   interaction model differs enough (two-click selection, hover
   preview, presets, two-month layout) that sharing implementation
   would compromise both.

   Selection model: first click sets the start, second click sets the
   end. If the second click lands before the first, the pair swaps
   automatically. A third click after a complete range begins a new
   selection. Hovering during the in-flight state previews the
   prospective range with --accent-soft.

   Keyboard nav mirrors DatePicker, adapted for two months: arrows move
   a roving focus across the visible day grid (and page the two-month
   window when focus crosses its edge), Enter/Space commits the focused
   day as the range start, then the range end, and Escape closes. A
   useEffect moves DOM focus to the focused day so the native focus ring
   shows. Range animations and time-of-day pickers remain follow-ups.
   ============================================================ */

type DateFormat = "short" | "long";

export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

export interface DateRangePreset {
  label: string;
  getRange: () => { start: Date; end: Date };
}

export interface DateRangePickerProps {
  id: string;
  label?: ReactNode;
  value?: DateRangeValue;
  defaultValue?: DateRangeValue;
  onChange?: (range: DateRangeValue) => void;
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
  presets?: DateRangePreset[];
  showPresets?: boolean;
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

/* ---------- date math (inline; no date-fns dependency) ---------- */

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

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return startOfDay(x);
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function mondayFirstOffset(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return (day + 6) % 7;
}

function isBetween(d: Date, start: Date, end: Date): boolean {
  const t = d.getTime();
  return t > start.getTime() && t < end.getTime();
}

function startOfWeek(d: Date): Date {
  // Monday-start week to match the calendar's weekday header.
  const day = d.getDay();
  const diff = (day + 6) % 7;
  return addDays(d, -diff);
}

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return startOfDay(new Date(d.getFullYear(), q * 3, 1));
}

function startOfYear(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), 0, 1));
}

function formatDate(d: Date, fmt: DateFormat): string {
  // Format from the LOCAL calendar fields (getFullYear/getMonth/getDate), the
  // same fields isSameDay, the grid cells, and the presets read, so the
  // trigger label and the commit announcement always name the days the grid
  // highlights. The old timeZone:"UTC" pin here dodged a #418 hydration
  // mismatch but formatted the instant, so zones east of UTC labeled the
  // trigger with the day before the selected cell. Determinism survives the
  // unpin: a fixed en-US month table plus plain field reads is a pure
  // function of the fields, no Intl zone lookup at format time, so SSR and
  // client render byte-identical text from the same date fields. Mirrors
  // DatePicker.formatDate. The trigger label stays the only SSR surface (the
  // grid renders while open, client-only).
  const month = (fmt === "short" ? MONTHS_SHORT : MONTHS)[d.getMonth()];
  return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

// Stable DOM id for a day cell so the focus effect can move DOM focus to the
// keyboard-focused day (scoped by the picker id to stay unique on the page).
function dayId(pickerId: string, d: Date): string {
  return `${pickerId}-day-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Year and month collapsed to one ordinal, so "is this month beyond the
// visible window" is a plain comparison.
function monthIndex(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

// The tablet breakpoint, as JavaScript. The stylesheet at the bottom hides the
// secondary month under the same query, and the two keyboard paths (moveFocus's
// paging rule and the focus effect) have to know it too, or the roving focus
// walks into a display:none grid where focus() is a silent no-op. Subscribed
// through useSyncExternalStore so the read happens at render time: the server
// snapshot says "two months" (the popover is client-only, so nothing hydrates
// against it), the client snapshot asks matchMedia, and a viewport crossing
// re-renders. Same shape as Tabs' window-focus store (A-009).
const NARROW_QUERY = "(max-width: 767px)"; // --mw-bp-tablet
const subscribeNarrow = (onChange: () => void) => {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};
const getNarrow = () => window.matchMedia(NARROW_QUERY).matches;
const getNarrowOnServer = () => false;

// The day cell that carries the roving tab stop across the VISIBLE month grids
// (two at desktop, one below --mw-bp-tablet). focusedDate's own in-month cell
// while a visible grid holds one: the two grids share boundary dates in their
// leading and trailing weeks, so only the in-month cell counts, or the same
// date would be tabbable twice. Otherwise the enabled in-month cell of the
// FIRST visible month nearest the same day-of-month, clamped to that month's
// length. The month nav pages the view without moving focusedDate (moving it
// would run the focus effect and yank focus off the button on every press), so
// this is what keeps exactly one cell tabbable after a page, and it is the day
// the keyboard is ON: moveFocus and Enter start from it. Null only when every
// day of the first visible month is disabled.
function tabStopFor(grids: DayCell[][], focusedDate: Date | null): Date | null {
  if (focusedDate) {
    for (const grid of grids) {
      const own = grid.find((c) => c.inMonth && !c.isDisabled && isSameDay(c.date, focusedDate));
      if (own) return own.date;
    }
  }
  const inMonth = grids[0].filter((c) => c.inMonth);
  if (inMonth.length === 0) return null;
  const first = inMonth[0].date;
  const preferred = new Date(first.getFullYear(), first.getMonth(), Math.min(focusedDate?.getDate() ?? 1, inMonth.length));
  let best: Date | null = null;
  let bestDistance = Infinity;
  for (const cell of inMonth) {
    if (cell.isDisabled) continue;
    const distance = Math.abs(cell.date.getTime() - preferred.getTime());
    if (distance < bestDistance) {
      best = cell.date;
      bestDistance = distance;
    }
  }
  return best;
}

function formatRange(range: DateRangeValue, fmt: DateFormat, placeholder: string): string {
  if (!range.start && !range.end) return placeholder;
  if (range.start && !range.end) return `${formatDate(range.start, fmt)} → …`;
  if (range.start && range.end) {
    // Drop the year on the start when both fall in the same year for a tidier
    // line. Same local-field formatting as formatDate, minus the year, so the
    // start half of the label reads the same calendar day as its grid cell.
    if (range.start.getFullYear() === range.end.getFullYear()) {
      const startMonth = (fmt === "short" ? MONTHS_SHORT : MONTHS)[range.start.getMonth()];
      const startStr = `${startMonth} ${range.start.getDate()}`;
      return `${startStr} → ${formatDate(range.end, fmt)}`;
    }
    return `${formatDate(range.start, fmt)} → ${formatDate(range.end, fmt)}`;
  }
  return placeholder;
}

/* ---------- default presets ---------- */

const DEFAULT_PRESETS: DateRangePreset[] = [
  { label: "Today",         getRange: () => ({ start: startOfDay(new Date()), end: startOfDay(new Date()) }) },
  { label: "Yesterday",     getRange: () => ({ start: addDays(new Date(), -1), end: addDays(new Date(), -1) }) },
  { label: "Last 7 days",   getRange: () => ({ start: addDays(new Date(), -6), end: startOfDay(new Date()) }) },
  { label: "Last 30 days",  getRange: () => ({ start: addDays(new Date(), -29), end: startOfDay(new Date()) }) },
  { label: "This week",     getRange: () => ({ start: startOfWeek(new Date()), end: startOfDay(new Date()) }) },
  { label: "This month",    getRange: () => ({ start: startOfMonth(new Date()), end: startOfDay(new Date()) }) },
  { label: "This quarter",  getRange: () => ({ start: startOfQuarter(new Date()), end: startOfDay(new Date()) }) },
  { label: "Year to date",  getRange: () => ({ start: startOfYear(new Date()), end: startOfDay(new Date()) }) },
  { label: "All time",      getRange: () => ({ start: new Date(1970, 0, 1), end: startOfDay(new Date()) }) },
];

/* ---------- grid building ---------- */

interface DayCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
  isDisabled: boolean;
}

function buildMonthGrid(
  viewYear: number,
  viewMonth: number,
  range: DateRangeValue,
  pendingStart: Date | null,
  hoveredEnd: Date | null,
  today: Date,
  minDate?: Date,
  maxDate?: Date,
): DayCell[] {
  const cells: DayCell[] = [];
  const offset = mondayFirstOffset(viewYear, viewMonth);
  const start = new Date(viewYear, viewMonth, 1 - offset);

  // Compute the in-flight (preview) range when the user has clicked once and
  // is hovering. The preview always orders earlier-to-later so the highlight
  // reads correctly even when the pointer is left of the pending start.
  let previewStart: Date | null = null;
  let previewEnd: Date | null = null;
  if (pendingStart && hoveredEnd) {
    const a = startOfDay(pendingStart);
    const b = startOfDay(hoveredEnd);
    if (a.getTime() <= b.getTime()) {
      previewStart = a;
      previewEnd = b;
    } else {
      previewStart = b;
      previewEnd = a;
    }
  } else if (pendingStart) {
    previewStart = startOfDay(pendingStart);
    previewEnd = startOfDay(pendingStart);
  }

  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const inMonth = date.getMonth() === viewMonth;
    const isDisabled =
      (!!minDate && date < startOfDay(minDate)) ||
      (!!maxDate && date > startOfDay(maxDate));

    const committedStart = range.start ? startOfDay(range.start) : null;
    const committedEnd = range.end ? startOfDay(range.end) : null;

    const isStart =
      (previewStart && isSameDay(date, previewStart)) ||
      (committedStart && !pendingStart && isSameDay(date, committedStart));
    const isEnd =
      (previewEnd && isSameDay(date, previewEnd)) ||
      (committedEnd && !pendingStart && isSameDay(date, committedEnd));

    let isInRange = false;
    if (previewStart && previewEnd) {
      isInRange = isBetween(date, previewStart, previewEnd);
    } else if (committedStart && committedEnd && !pendingStart) {
      isInRange = isBetween(date, committedStart, committedEnd);
    }

    cells.push({
      date,
      inMonth,
      isToday: isSameDay(date, today),
      isStart: Boolean(isStart),
      isEnd: Boolean(isEnd),
      isInRange,
      isDisabled,
    });
  }
  return cells;
}

export function DateRangePicker({
  id,
  label,
  value,
  defaultValue,
  onChange,
  placeholder = "Select a date range",
  minDate,
  maxDate,
  disabled = false,
  required = false,
  marking,
  helper,
  error,
  format = "short",
  presets,
  showPresets = true,
}: DateRangePickerProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<DateRangeValue>(
    defaultValue ?? { start: null, end: null },
  );
  const selected: DateRangeValue = isControlled
    ? value as DateRangeValue
    : internalValue;

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
  const liveId = `${id}-live`;
  // Required is announced via a visually-hidden describedby hint (aria-required is
  // dropped on the button role); the error is the role="alert" message, also
  // referenced via describedby when present (A-011).
  const describedBy =
    [required ? requiredId : null, hasErrorMessage ? errorId : helper ? helperId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => {
    const seed = selected.start ?? new Date();
    return startOfMonth(seed);
  });
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [hoveredEnd, setHoveredEnd] = useState<Date | null>(null);
  const [activePresetLabel, setActivePresetLabel] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>("");
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  // Focus restore on keyboard/selection closes (audit F9): closing used to
  // unmount the focused day and drop focus to <body>. Outside-click closes do
  // NOT refocus (the user is already elsewhere).
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeAndRefocus = () => {
    setOpen(false);
    setPendingStart(null);
    setHoveredEnd(null);
    triggerRef.current?.focus();
  };
  const presetList = presets ?? DEFAULT_PRESETS;

  const today = useMemo(() => startOfDay(new Date()), []);
  // Below --mw-bp-tablet only month A is displayed (see the stylesheet).
  const isNarrow = useSyncExternalStore(subscribeNarrow, getNarrow, getNarrowOnServer);

  // Viewport fit (B5, 27 Aug 2026). The popover anchors at the field's left
  // edge (left: 0 of the root) and sizes itself against 100vw, so a field that
  // does not start at the viewport gutter pushed its popover past the right
  // edge: the docs demo at 390px sat 90px in, and with the mobile 20rem width
  // ended 21px past the viewport. CSS cannot know the anchor's viewport offset,
  // so it is measured once the popover exists (again on resize, and when the
  // month layout flips) and handed to the sheet as two px custom properties;
  // the sheet owns the token arithmetic (slide left by the overshoot past the
  // gutter, never past the left gutter). Measured UNSHIFTED, so a re-measure
  // never compounds the last slide.
  useLayoutEffect(() => {
    if (!open) return;
    const popover = rootRef.current?.querySelector<HTMLElement>("[data-mw-date-range-popover]");
    if (!popover) return;
    const measure = () => {
      popover.style.removeProperty("--mw-date-range-overshoot");
      popover.style.removeProperty("--mw-date-range-anchor");
      const r = popover.getBoundingClientRect();
      popover.style.setProperty("--mw-date-range-overshoot", `${r.right - document.documentElement.clientWidth}px`);
      popover.style.setProperty("--mw-date-range-anchor", `${r.left}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, isNarrow]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: globalThis.MouseEvent) => {
      const t = e.target as Node | null;
      if (rootRef.current && t && !rootRef.current.contains(t)) {
        setOpen(false);
        setPendingStart(null);
        setHoveredEnd(null);
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
      // through untouched and still close the ancestor. Mirrors DatePicker.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setPendingStart(null);
      setHoveredEnd(null);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openPopover = () => {
    if (disabled) return;
    setOpen(true);
    setPendingStart(null);
    setHoveredEnd(null);
    setFocusedDate(selected.start ?? selected.end ?? today);
    if (selected.start) {
      setViewDate(startOfMonth(selected.start));
    }
  };

  const monthA = viewDate;
  const monthB = addMonths(viewDate, 1);
  const gridA = buildMonthGrid(monthA.getFullYear(), monthA.getMonth(), selected, pendingStart, hoveredEnd, today, minDate, maxDate);
  const gridB = buildMonthGrid(monthB.getFullYear(), monthB.getMonth(), selected, pendingStart, hoveredEnd, today, minDate, maxDate);
  // Exactly one displayed day is tabbable, whichever months the nav paged to
  // and however many the viewport shows.
  const tabStop = tabStopFor(isNarrow ? [gridA] : [gridA, gridB], focusedDate);

  // Move the roving keyboard focus by `delta` days, paging the window when
  // focus crosses an edge of the VISIBLE months: two at desktop, one below
  // --mw-bp-tablet. The rule used to page only past month B whatever the
  // viewport, so on a phone the cursor walked a whole hidden month, and once
  // it left that one the page made the next month the new hidden month B, so
  // it stayed invisible indefinitely.
  const moveFocus = (delta: number) => {
    // From the tab stop, which is the cell the keyboard is on: focusedDate
    // itself while a visible month shows it, the derived stop once the month
    // nav has paged the view away from it (see tabStopFor).
    const base = tabStop ?? focusedDate ?? selected.start ?? today;
    const next = addDays(base, delta);
    setFocusedDate(next);
    const nIdx = monthIndex(next);
    const lastVisible = isNarrow ? viewDate : monthB;
    if (nIdx < monthIndex(viewDate)) {
      setViewDate(addMonths(viewDate, -1));
    } else if (nIdx > monthIndex(lastVisible)) {
      setViewDate(addMonths(viewDate, 1));
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
          onDayClick(tabStop, false);
        }
        break;
      case "Escape":
        e.preventDefault();
        closeAndRefocus();
        break;
    }
  };

  // Move DOM focus to the keyboard-focused day so its native focus ring shows.
  // Guards, in this order. Focus that already sits inside the popover but not
  // on a day (the month nav, a preset) is left alone: this effect re-runs when
  // viewDate pages, and stealing focus from "Next month" after every press
  // would strand a keyboard user paging three months forward. Then, below
  // --mw-bp-tablet, a focusedDate past month A sits in the display:none month
  // B. While focus is still inside the popover (the nav paged the view away
  // from it, or a mouse click put focus on a visible day) the view stays where
  // the user put it and the derived tab stop covers the grid; the nav guard
  // has to run first, or "Previous month" on a phone would page the view
  // straight back to focusedDate's month and the button would be dead. Only
  // when the cell vanished under focus (a viewport shrink while the popover
  // was open, and the browser dropped focus to body) is the view paged to
  // that month, the one setState this effect ever does, and the next run puts
  // focus on the now-visible cell. A hidden element counts as not holding
  // focus, for a browser that leaves activeElement on a display:none cell.
  useEffect(() => {
    if (!open || !focusedDate) return;
    const active = document.activeElement;
    const popover = rootRef.current?.querySelector("[data-mw-date-range-popover]");
    const focusInside =
      active instanceof HTMLElement && Boolean(popover?.contains(active)) && active.getClientRects().length > 0;
    if (focusInside && !active?.hasAttribute("data-mw-date-day")) return;
    if (isNarrow && monthIndex(focusedDate) > monthIndex(viewDate)) {
      if (focusInside) return;
      setViewDate(startOfMonth(focusedDate));
      return;
    }
    document.getElementById(dayId(id, focusedDate))?.focus();
  }, [open, focusedDate, id, isNarrow, viewDate]);

  const commitRange = (next: DateRangeValue, presetLabel: string | null = null) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
    setPendingStart(null);
    setHoveredEnd(null);
    setActivePresetLabel(presetLabel);
    if (next.start && next.end) {
      const days =
        Math.round((startOfDay(next.end).getTime() - startOfDay(next.start).getTime()) / 86_400_000) + 1;
      setAnnouncement(
        `${days} day${days === 1 ? "" : "s"} selected, ${formatDate(next.start, format)} to ${formatDate(next.end, format)}`,
      );
    } else {
      setAnnouncement("");
    }
  };

  const onDayClick = (date: Date, isDisabledDay: boolean) => {
    if (isDisabledDay) return;
    if (!pendingStart) {
      setPendingStart(date);
      setActivePresetLabel(null);
      return;
    }
    const start = pendingStart;
    const end = date;
    const ordered =
      start.getTime() <= end.getTime()
        ? { start: startOfDay(start), end: startOfDay(end) }
        : { start: startOfDay(end), end: startOfDay(start) };
    commitRange(ordered);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onDayHover = (date: Date) => {
    if (!pendingStart) return;
    setHoveredEnd(date);
  };

  const onGridLeave = () => {
    setHoveredEnd(null);
  };

  const selectPreset = (preset: DateRangePreset) => {
    const range = preset.getRange();
    const next: DateRangeValue = {
      start: startOfDay(range.start),
      end: startOfDay(range.end),
    };
    commitRange(next, preset.label);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const triggerLabel = formatRange(selected, format, placeholder);
  const triggerHasValue = Boolean(selected.start && selected.end);

  return (
    <div ref={rootRef} style={rootStyle} data-mw-date-range="">
      <style href={DATE_FIELD_BASE_HREF} precedence="default">{dateFieldBaseCss}</style>
      <style href="magentaweb-date-range" precedence="default">{datePickerCss}</style>

      {label ? (
        <FieldLabel htmlFor={id} marking={resolveMarking(marking, required)}>{label}</FieldLabel>
      ) : null}

      {/* Native button: Enter/Space already fire click, so no key handler
          (audit F17 deleted a redundant re-implementation). */}
      {/* The control's own positioning context (2 Sep 2026): see DatePicker. The wrap
          holds the control alone, so the popover's top:100% is the control's bottom edge
          rather than the field group's, and --popover-offset is the entire gap. */}
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
            aria-label="Choose date range"
            aria-modal="false"
            style={popoverStyle}
            data-mw-date-range-popover=""
          >
            {showPresets ? (
              <div style={presetColumnStyle} data-mw-date-range-presets="">
                {presetList.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    data-mw-date-range-preset=""
                    data-active={activePresetLabel === preset.label ? "true" : "false"}
                    onClick={() => selectPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div style={calendarColumnStyle}>
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
                  {MONTHS[monthA.getMonth()]} {monthA.getFullYear()}
                  {" to "}
                  {MONTHS[monthB.getMonth()]} {monthB.getFullYear()}
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

              <div style={twoMonthGridStyle} onMouseLeave={onGridLeave}>
                <MonthGrid
                  year={monthA.getFullYear()}
                  month={monthA.getMonth()}
                  cells={gridA}
                  inputId={id}
                  tabStop={tabStop}
                  onDayClick={onDayClick}
                  onDayHover={onDayHover}
                  onGridKeyDown={onGridKeyDown}
                  primaryGrid
                />
                <MonthGrid
                  year={monthB.getFullYear()}
                  month={monthB.getMonth()}
                  cells={gridB}
                  inputId={id}
                  tabStop={tabStop}
                  onDayClick={onDayClick}
                  onDayHover={onDayHover}
                  onGridKeyDown={onGridKeyDown}
                />
              </div>
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

      <span id={liveId} role="status" aria-live="polite" style={srOnly}>
        {announcement}
      </span>

    </div>
  );
}

/* ---------- MonthGrid subcomponent ---------- */

interface MonthGridProps {
  year: number;
  month: number;
  cells: DayCell[];
  inputId: string;
  /** The one day across the visible grids that carries tabIndex 0 (see tabStopFor). */
  tabStop: Date | null;
  onDayClick: (date: Date, isDisabled: boolean) => void;
  onDayHover: (date: Date) => void;
  onGridKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  primaryGrid?: boolean;
}

function MonthGrid({
  year,
  month,
  cells,
  inputId,
  tabStop,
  onDayClick,
  onDayHover,
  onGridKeyDown,
  primaryGrid,
}: MonthGridProps) {
  // Scoped by inputId like dayId: two pickers showing the same month must not
  // collide on aria-labelledby targets (audit F19).
  const monthLabelId = `${inputId}-monthlabel-${year}-${month}`;
  return (
    <div data-mw-date-range-month={primaryGrid ? "primary" : "secondary"} style={monthBlockStyle}>
      <div id={monthLabelId} style={monthSubLabelStyle}>
        {MONTHS[month]} {year}
      </div>
      <div
        role="grid"
        aria-labelledby={monthLabelId}
        style={gridStyle}
        onKeyDown={onGridKeyDown}
      >
        <div role="row" style={weekdayRowStyle}>
          {WEEKDAYS.map((w) => (
            <span key={w} role="columnheader" style={weekdayStyle}>{w}</span>
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, weekIdx) => (
          <div key={weekIdx} role="row" style={weekRowStyle}>
            {cells.slice(weekIdx * 7, weekIdx * 7 + 7).map((cell, dayIdx) => {
              const dayAria =
                cell.isStart && cell.isEnd
                  ? `Selected: ${cell.date.toDateString()}`
                  : cell.isStart
                    ? `Range start: ${cell.date.toDateString()}`
                    : cell.isEnd
                      ? `Range end: ${cell.date.toDateString()}`
                      : cell.isInRange
                        ? `In range: ${cell.date.toDateString()}`
                        : cell.date.toDateString();
              // Gate the tab stop + id on inMonth: the two months' 42-cell grids
              // share boundary dates, so without this the same date would yield
              // a duplicate id and two tabbable cells. The focusable target for
              // a date is always its in-month cell; tabStopFor picks one day
              // across the visible grids, so exactly one cell is tabbable.
              const isTabStop = cell.inMonth && isSameDay(tabStop, cell.date);
              return (
                <button
                  key={`${weekIdx}-${dayIdx}`}
                  id={cell.inMonth ? dayId(inputId, cell.date) : undefined}
                  type="button"
                  role="gridcell"
                  tabIndex={isTabStop ? 0 : -1}
                  data-mw-date-day=""
                  data-in-month={cell.inMonth ? "true" : "false"}
                  data-today={cell.isToday ? "true" : "false"}
                  data-selected={cell.isStart || cell.isEnd ? "true" : "false"}
                  data-in-range={cell.isInRange ? "true" : "false"}
                  data-range-start={cell.isStart && !cell.isEnd ? "true" : "false"}
                  data-range-end={cell.isEnd && !cell.isStart ? "true" : "false"}
                  aria-selected={cell.isStart || cell.isEnd}
                  aria-current={cell.isToday ? "date" : undefined}
                  aria-disabled={cell.isDisabled || undefined}
                  aria-label={dayAria}
                  disabled={cell.isDisabled}
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    onDayClick(cell.date, cell.isDisabled);
                  }}
                  onMouseEnter={() => onDayHover(cell.date)}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
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

/* The control's positioning context; see DatePicker. */
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
  zIndex: tokenNumber("var(--z-overlay)"),
  display: "flex",
  maxWidth: "calc(100vw - 2 * var(--space-lg))",
  // min-width AND flex-direction live in the stylesheet (not inline) so the
  // <768px media query can flip them. The old comment here knew the hazard for
  // min-width; the audit (F3) found flex-direction, the preset rail's
  // direction/border/max-width, and the secondary month's display all still
  // inline, which left the ENTIRE mobile layout dead.
};

const presetColumnStyle: CSSProperties = {
  display: "flex",
  paddingBlock: "var(--space-sm)",
  minWidth: "10rem", // preset rail floor
};

const calendarColumnStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "var(--space-md)",
  flex: 1,
  minWidth: 0,
};

const popoverHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--space-sm)",
  gap: "var(--space-sm)",
};

const monthLabelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--text-positive-primary)",
  textAlign: "center",
  flex: 1,
};

const twoMonthGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "var(--space-md)",
};

/* display lives in the sheet so the secondary month's mobile display:none can
   win (audit F3). */
const monthBlockStyle: CSSProperties = {
  flexDirection: "column",
  gap: "var(--space-xs)",
};

const monthSubLabelStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-tertiary)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  textAlign: "center",
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
// under DATE_FIELD_BASE_HREF). This block is DateRangePicker-specific: the
// preset rail, the fill-the-track range day cells with their range states, and
// the two-month popover sizing.
const datePickerCss = `
[data-mw-date-range-preset] {
  /* DECLARED, NOT INHERITED (the leading-pins census, 2 Sep 2026): measured at prose
     1.5 with the panel open, on a <button> that sits in a column of identical siblings.
     It only renders once the panel opens, which is why the first census pass could not
     reach it and reported it as "not found" rather than clean. */
  line-height: var(--leading-tight);
  text-align: left;
  background: transparent;
  border: 0;
  font-family: var(--font-code);
  font-size: var(--type-sm);
  color: var(--text-positive-secondary);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  border-left: 2px solid transparent;
  transition:
    background var(--motion-transition),
    color var(--motion-transition),
    border-color var(--motion-transition);
}
[data-mw-date-range-preset]:hover {
  color: var(--text-positive-primary);
  background: var(--background-positive-secondary);
}
[data-mw-date-range-preset][data-active="true"] {
  color: var(--accent-ink);
  background: var(--accent-soft);
  border-left-color: var(--accent-base);
}
[data-mw-date-range-preset]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: -2px;
}

[data-mw-date-day] {
  display: flex;
  align-items: center;
  justify-content: center;
  /* Root-cause fix for the overlap bug: the day button must fill its grid
     track (repeat(7, 1fr)) instead of asserting a fixed 2.25rem width. A fixed
     width wider than the computed track made adjacent buttons overrun their
     cells and the numbers overlapped once two months shared the popover width.
     Filling the track with min-width:0 guarantees no overflow at any width;
     the fixed height keeps the hit area square (~36px) down to mobile. */
  width: 100%;
  min-width: 0;
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
[data-mw-date-day][data-in-range="true"] {
  background: var(--accent-soft);
  color: var(--text-positive-primary);
  border-radius: 0;
}
[data-mw-date-day][data-selected="true"] {
  background: var(--accent-base);
  color: var(--text-on-accent);
  border-color: var(--accent-base);
}
[data-mw-date-day][data-range-start="true"] {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
[data-mw-date-day][data-range-end="true"] {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
[data-mw-date-day]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
[data-mw-date-day]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}

/* Desktop popover width. 40rem gives each two-month grid enough room for
   ~36px day columns once the preset rail and padding are subtracted. Set here
   rather than inline so the mobile media query below can reset it to auto. */
[data-mw-date-range-popover] {
  min-width: 40rem;
  flex-direction: row;
  /* Viewport fit (B5): --mw-date-range-overshoot (how far the unshifted right
     edge sits past the viewport edge, negative when it fits) and
     --mw-date-range-anchor (the unshifted left edge) are measured px the
     component sets once the popover exists. The slide is the overshoot past
     the gutter, floored at 0 and capped so the left edge never crosses the
     gutter. The fallbacks resolve to no slide, which is also how the
     measurement itself reads the box unshifted. A margin, not a transform, so
     the text stays on whole pixels. */
  --mw-date-range-fit: max(
    0px,
    min(
      calc(var(--mw-date-range-overshoot, -9999px) + var(--space-lg)),
      calc(var(--mw-date-range-anchor, 0px) - var(--space-lg))
    )
  );
  margin-left: calc(-1 * var(--mw-date-range-fit));
}
[data-mw-date-range-presets] {
  flex-direction: column;
  border-right: 1px solid var(--border-positive-secondary);
  max-width: 12rem;
}
[data-mw-date-range-month] {
  display: flex;
}

@media (max-width: 767px) { /* --mw-bp-tablet */
  [data-mw-date-range-popover] {
    flex-direction: column;
    min-width: auto;
    /* Single-month mobile popover cap; the documented 40rem above is the
       two-month desktop form. */
    width: min(20rem, calc(100vw - 2 * var(--space-lg)));
  }
  [data-mw-date-range-presets] {
    flex-direction: row;
    flex-wrap: wrap;
    border-right: 0;
    border-bottom: 1px solid var(--border-positive-secondary);
    max-width: none;
  }
  [data-mw-date-range-month="secondary"] {
    display: none;
  }
}
`;

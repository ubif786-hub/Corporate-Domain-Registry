/* ============================================================
   internal/dateFieldStyles.ts — the trigger + month-nav CSS shared by
   DatePicker and DateRangePicker. Both register it under the SAME
   precedence href ("magentaweb-date-field-base"), so React 19 dedupes
   it to a single mounted <style> tag rather than two copies of the
   same selectors. Each picker then adds its own block: DatePicker the
   single-month day grid, DateRangePicker the presets + range day
   states + two-month popover sizing.

   The day-cell rules are intentionally NOT here: the two pickers size
   day cells differently (DatePicker fixed-width, DateRangePicker
   fill-the-track), so each owns its own [data-mw-date-day] rules.
   ============================================================ */

export const DATE_FIELD_BASE_HREF = "magentaweb-date-field-base";

export const dateFieldBaseCss = `
[data-mw-date-trigger] {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  font-family: var(--font-body);
  font-size: var(--type-md);
  /* CONTROL HEIGHT PARITY (AUD-2, 1 Sep 2026): one rule covers both pickers; the
     same missed-member fix as Search and TimePicker. Write-up in Input.tsx. */
  line-height: var(--leading-tight);
  color: var(--text-positive-primary);
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
  border-radius: var(--component-radius);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  outline: none;
  transition:
    border-color var(--motion-transition),
    background var(--motion-transition),
    box-shadow var(--motion-transition);
}
[data-mw-date-trigger][data-has-value="false"] {
  color: var(--text-positive-tertiary);
}
[data-mw-date-trigger]:hover:not(:disabled) {
  border-color: var(--text-positive-tertiary);
}
[data-mw-date-trigger]:focus {
  border-color: var(--accent-base);
  background: var(--background-positive-primary);
  box-shadow: var(--shadow-focus);
}
[data-mw-date-trigger][data-error="true"] {
  border-color: var(--border-error);
}
[data-mw-date-trigger][data-error="true"]:focus {
  box-shadow: var(--shadow-focus-error);
}
[data-mw-date-trigger]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

[data-mw-date-nav] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-size-md);
  height: var(--control-size-md);
  background: transparent;
  border: 0;
  color: var(--text-positive-secondary);
  cursor: pointer;
  border-radius: var(--component-radius);
  transition: background var(--motion-transition), color var(--motion-transition);
}
[data-mw-date-nav]:hover {
  background: var(--background-positive-secondary);
  color: var(--text-positive-primary);
}
[data-mw-date-nav]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

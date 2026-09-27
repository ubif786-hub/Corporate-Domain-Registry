import { CSSProperties } from "react";

// Shared dress for LineItemRow's two halves (the server read-only row and the
// client editable row), factored here so neither imports the other (the
// server entry imports the client variant; a style import back the other way
// would be circular). Both halves render the same grid so mixed read-only and
// editable rows align in one items region.

// description | qty | rate | amount, plus the remove column in editable. The
// column rems are structural geometry (a grid template cannot read the space
// scale as fractions), matching the reference's proportions.
export const lineItemGridCss = `
[data-mw-line-item-row] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 4.5rem 6rem 6.5rem;
  align-items: center;
  column-gap: var(--space-sm);
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--border-positive-primary);
}
[data-mw-line-item-row][data-editable="true"] {
  grid-template-columns: minmax(0, 1fr) 4.5rem 6rem 6.5rem 2rem;
}
/* Narrow form: the fixed numeric tracks (304px plus gaps) cannot fit a phone
   viewport, so below the tablet breakpoint the row stacks. The description
   (the first child in both halves) takes the full first row; qty, rate,
   amount, and the remove control when editable form a compact row beneath
   it. Shrinkable tracks keep the row inside any container, InvoicePaper's
   padded sheet included. */
@media (max-width: 767px) { /* --mw-bp-tablet */
  [data-mw-line-item-row] {
    grid-template-columns: minmax(0, 1fr) minmax(0, max-content) minmax(0, max-content);
    row-gap: var(--space-2xs);
  }
  [data-mw-line-item-row][data-editable="true"] {
    grid-template-columns: minmax(0, 4.5rem) minmax(0, 1fr) minmax(0, max-content) 2rem;
  }
  [data-mw-line-item-row] > :first-child {
    grid-column: 1 / -1;
  }
}
[data-mw-line-item-qty-input] {
  /* DECLARED, NOT INHERITED (the leading-pins census, 2 Sep 2026). CG-1's probe left this
     one out on purpose, with a comment saying its fix-or-sanction call belonged to B2
     rather than to that probe. It is now MEASURED at prose 1.5 against every other field
     shell's 1.2, so the call is no longer a judgement about scope: it is the same defect
     as Input and Select, on a field that happens to render alone in a grid row. */
  line-height: var(--leading-tight);
  width: 100%;
  padding: var(--space-2xs) var(--space-xs);
  text-align: right;
  font-family: var(--font-body);
  font-size: var(--type-sm);
  font-variant-numeric: tabular-nums;
  color: var(--text-positive-primary);
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
  border-radius: var(--component-radius);
  outline: none;
  transition: border-color var(--motion-transition), box-shadow var(--motion-transition);
}
[data-mw-line-item-qty-input]:hover:not(:focus) {
  border-color: var(--text-positive-tertiary);
}
[data-mw-line-item-qty-input]:focus {
  border-color: var(--accent-base);
  box-shadow: var(--shadow-focus);
}
[data-mw-line-item-remove] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3xs);
  border: none;
  background: transparent;
  color: var(--text-positive-tertiary);
  border-radius: var(--component-radius);
  cursor: pointer;
  transition: color var(--motion-transition), background var(--motion-transition);
}
[data-mw-line-item-remove]:hover {
  color: var(--status-danger-text);
  background: color-mix(in srgb, var(--status-danger-text) 10%, transparent);
}
[data-mw-line-item-remove]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

export const descriptionCellStyle: CSSProperties = {
  minWidth: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-primary)",
  overflowWrap: "anywhere",
};

// Numeric cells: right-aligned tabular figures in the quiet ink.
export const numericCellStyle: CSSProperties = {
  textAlign: "right",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-positive-secondary)",
  whiteSpace: "nowrap",
};

// The amount cell carries the row's figure weight (PriceLabel inherits it).
export const amountCellStyle: CSSProperties = {
  ...numericCellStyle,
  color: "var(--text-positive-primary)",
};

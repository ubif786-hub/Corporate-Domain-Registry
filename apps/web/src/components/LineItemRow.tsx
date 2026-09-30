import { ReactNode } from "react";
import { PriceLabel } from "./PriceLabel";
import { LineItemRowEditable } from "./LineItemRowEditable";
import {
  amountCellStyle,
  descriptionCellStyle,
  lineItemGridCss,
  numericCellStyle,
} from "@/components/internal/lineItemRowStyles";

/* ============================================================
   LineItemRow — the invoice / order line (Sprint 3A, from the
   ArtistHQ handoff: description | qty | rate | amount on one
   grid row, the amount always qty x rate). Money renders through
   PriceLabel (rate and amount), so the currency affix mutes and
   locales place it correctly.

   SPLIT STRUCTURE (stated per the sprint brief): this entry file
   carries no "use client" directive, so the default read-only row
   is server-safe (an InvoicePaper full of static lines ships no
   JS). `editable` delegates to LineItemRowEditable, the "use
   client" half, which adds the qty number field (Input-family
   surface tokens), live amount recompute, and the Carbon Close
   remove control. Both halves render the same grid (shared in
   internal/lineItemRowStyles), so mixed rows align.

   Handler props only make sense from a client parent (functions
   do not cross the server/client boundary); a server tree uses
   the read-only form.
   ============================================================ */

export interface LineItemRowProps {
  description: string | ReactNode;
  /** Names the editable row's controls ("Remove {rowLabel}", "Quantity, {rowLabel}") when
   *  `description` is a composed node rather than a string; a string description names them by
   *  itself. Without either, the controls fall back to "Remove line item" and "Quantity", which
   *  read identically on every row of an invoice. */
  rowLabel?: string;
  qty: number;
  rate: number;
  /** Editable qty becomes controlled when this is set (the parent owns qty). */
  onQtyChange?: (qty: number) => void;
  /** Renders the remove control (editable rows). */
  onRemove?: () => void;
  /** Swap the static cells for the editable row (client island). */
  editable?: boolean;
  /** ISO 4217 code for rate and amount. PriceLabel's default (USD). */
  currency?: string;
  /** BCP 47 locale for money formatting. PriceLabel's default (en-US). */
  locale?: string;
}

export function LineItemRow(props: LineItemRowProps) {
  if (props.editable) return <LineItemRowEditable {...props} />;

  const { description, qty, rate, currency, locale } = props;
  const amount = Math.round(qty * rate * 100) / 100;

  return (
    <div data-mw-line-item-row="" data-editable="false">
      <style href="magentaweb-line-item-row" precedence="default">{lineItemGridCss}</style>
      <div style={descriptionCellStyle}>{description}</div>
      <div style={numericCellStyle}>{qty}</div>
      <div style={numericCellStyle}>
        <PriceLabel amount={rate} currency={currency} locale={locale} />
      </div>
      <div data-mw-line-item-amount="" style={amountCellStyle}>
        <PriceLabel amount={amount} currency={currency} locale={locale} />
      </div>
    </div>
  );
}

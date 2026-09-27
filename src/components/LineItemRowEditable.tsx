"use client";

import { ChangeEvent, useState } from "react";
import { Close } from "@carbon/icons-react";
import { PriceLabel } from "./PriceLabel";
import {
  amountCellStyle,
  descriptionCellStyle,
  lineItemGridCss,
  numericCellStyle,
} from "@/components/internal/lineItemRowStyles";
import type { LineItemRowProps } from "./LineItemRow";

/* ============================================================
   LineItemRowEditable — the client half of LineItemRow (see
   LineItemRow.tsx for the split rationale). The qty cell becomes
   a number field on the Input family's surface tokens; the
   amount recomputes as qty x rate on every change; onRemove adds
   the Carbon Close remove column.

   Controlled or uncontrolled qty (the house field convention):
   with onQtyChange the parent owns qty and the row renders the
   prop; without it the row keeps its own count seeded from qty.
   ============================================================ */

export function LineItemRowEditable({
  description,
  rowLabel,
  qty,
  rate,
  onQtyChange,
  onRemove,
  currency,
  locale,
}: LineItemRowProps) {
  const controlled = onQtyChange !== undefined;
  const [innerQty, setInnerQty] = useState(qty);
  const currentQty = controlled ? qty : innerQty;
  // Recomputed every render: the editable row's whole point.
  const amount = Math.round(currentQty * rate * 100) / 100;
  // The row's name for its two controls (27 Aug 2026): a string description IS the name, a
  // composed node needs rowLabel. TypeScript collapses `string | ReactNode` to ReactNode, so the
  // runtime typeof is the discriminator. Without either the names degrade to the old constants,
  // which read identically on every row (the FileUpload / MultiSelect "Remove {name}" idiom).
  const rowName = rowLabel ?? (typeof description === "string" ? description : null);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = Math.max(0, Number(e.target.value) || 0);
    if (!controlled) setInnerQty(next);
    onQtyChange?.(next);
  };

  return (
    <div data-mw-line-item-row="" data-editable="true">
      <style href="magentaweb-line-item-row" precedence="default">{lineItemGridCss}</style>
      <div style={descriptionCellStyle}>{description}</div>
      <div style={numericCellStyle}>
        <input
          type="number"
          min={0}
          value={currentQty}
          onChange={onChange}
          aria-label={rowName ? `Quantity, ${rowName}` : "Quantity"}
          data-mw-line-item-qty-input=""
        />
      </div>
      <div style={numericCellStyle}>
        <PriceLabel amount={rate} currency={currency} locale={locale} />
      </div>
      <div data-mw-line-item-amount="" style={amountCellStyle}>
        <PriceLabel amount={amount} currency={currency} locale={locale} />
      </div>
      {onRemove ? (
        <button
          type="button"
          data-mw-line-item-remove=""
          aria-label={rowName ? `Remove ${rowName}` : "Remove line item"}
          onClick={onRemove}
        >
          <Close size={16} />
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}

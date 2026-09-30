import { CSSProperties } from "react";
import { tokenNumber } from "@/components/internal/styles";

/* ============================================================
   PriceLabel — the inline price figure (v3.9.0, from the ArtistHQ
   handoff: "$640" on cards, rows, and detail heads everywhere a
   price appears). The inline-anywhere little sibling of Stat: a
   display-face figure whose currency affix is muted to
   --text-positive-tertiary, the Stat/Glance affix convention
   (equal size, DOM order, only the muted ink subordinates the
   unit), so a screen reader hears "$ 640" in order.

   Formatting is Intl.NumberFormat with formatToParts: the
   currency parts (symbol/code and their adjacent literal) take
   the muted ink wherever the locale places them (prefix in
   en-US, suffix in de-DE), the numeric parts keep the figure
   ink. Whole amounts render bare ($640, the reference), fractional
   amounts keep their two decimals ($19.50). Fixed defaults
   (USD, en-US) keep server and client output identical; pass
   locale explicitly to localize.

   NOT a new font tier: the figure inherits the surrounding font
   size (drop it in a heading, a table cell, a card meta row);
   only face, weight, and the affix ink are its own.
   ============================================================ */

export interface PriceLabelProps {
  amount: number;
  /** ISO 4217 currency code. */
  currency?: string;
  /** BCP 47 locale for digit grouping and affix placement. */
  locale?: string;
}

export function PriceLabel({ amount, currency = "USD", locale = "en-US" }: PriceLabelProps) {
  const wholeAmount = Number.isInteger(amount);
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    // Whole prices render bare (the reference's $640); fractional keep cents.
    minimumFractionDigits: wholeAmount ? 0 : undefined,
    maximumFractionDigits: wholeAmount ? 0 : undefined,
  }).formatToParts(amount);

  return (
    <span style={figureStyle}>
      {parts.map((part, i) => (
        <span key={i} style={part.type === "currency" ? affixStyle : undefined}>
          {part.value}
        </span>
      ))}
    </span>
  );
}

// The display face at the surrounding size: an inline figure, not a Glance.
const figureStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  letterSpacing: "var(--tracking-snug)",
  fontVariantNumeric: "tabular-nums",
  color: "inherit",
  whiteSpace: "nowrap",
};
// The muted currency affix: the Stat/Glance convention, equal size, tertiary ink.
const affixStyle: CSSProperties = {
  color: "var(--text-positive-tertiary)",
};

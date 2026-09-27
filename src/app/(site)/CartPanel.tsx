"use client";

import { CSSProperties } from "react";
import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import { tokenNumber } from "@/components/internal/styles";
import { inRegionCurrency } from "@/data/regions";
import { money, SERVICE_LABELS } from "@/data/site";
import { useCart } from "./CartProvider";
import { useRegion } from "./RegionProvider";

/* The cart rail: a bordered card showing what is in the basket and a way to go and pay for it.
 *
 * IT CAME BACK ON 18 SEP 2026, and it was removed on 9 Sep, so the reversal is worth stating.
 * The client's feedback sheet said of the search page: "No cart is needed on that page, it may
 * pop up if you want but iwog is showing clean interface for people to pick the domain." The rail
 * came out and the page got its full width back. Nine days later the same client sent a shot by
 * shot walkthrough of the reference site's checkout and asked for it copied exactly, and the
 * reference carries this rail on the search page and on the checkout: "When I add to cart, it
 * should show on the right side in the cart panel. And then you can click view cart."
 *
 * The later instruction is the more specific one and it is about the same page, so it wins. What
 * the first instruction was really objecting to survives in the proportions: the rail is a third
 * of the row rather than half, and the results and the extension cards keep two thirds.
 *
 * IT RENDERS NOTHING UNTIL THE STORED CART HAS BEEN READ. cart.ready gates it for the same reason
 * the header chip is gated: a rail that paints "(0)" and then "(2)" a frame later reads as a bug,
 * and on a page whose whole job is to show that adding to the cart worked, it reads as the bug.
 */

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  padding: "var(--space-lg)",
  border: "var(--rule-weight) solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-primary)",
};
const headStyle: CSSProperties = {
  paddingBottom: "var(--space-xs)",
  borderBottom: "var(--rule-weight) solid var(--border-positive-secondary)",
};
const listStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-sm)",
  margin: 0,
  padding: 0,
  listStyle: "none",
};
const lineStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-3xs)" };
const lineDomainStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--text-positive-primary)",
  overflowWrap: "anywhere",
};
const lineWhatStyle: CSSProperties = {
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};
const emptyStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--type-sm)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-tertiary)",
};

/** "Your Cart (2): $640.00 USD", the reference's own header, cents always shown. */
export function cartHeadline(count: number, totalUsd: number, currency: string): string {
  return `Your Cart (${count}): ${money(inRegionCurrency(totalUsd, currency), currency)} ${currency}`;
}

export function CartPanel() {
  const cart = useCart();
  const { region } = useRegion();
  if (!cart.ready) return null;

  return (
    <div style={cardStyle} data-ds-cart-rail="">
      <div style={headStyle}>
        <Heading level={2} size={6}>
          {cartHeadline(cart.items.length, cart.total, region.currency)}
        </Heading>
      </div>

      {cart.items.length === 0 ? (
        <p style={emptyStyle}>Nothing in your cart yet. Search a domain above and add it here.</p>
      ) : (
        <ul style={listStyle}>
          {cart.items.map((item) => (
            <li key={item.id} style={lineStyle}>
              <span style={lineDomainStyle}>{item.domain}</span>
              {/* "5 Year Domain Renewal / Transfer", the reference's wording: the term is singular
                  as an adjective ("5 Year"), which is not the plural the duration select uses
                  ("5 Years - $265.00"). Both are correct English in their own slot. */}
              <span style={lineWhatStyle}>
                {item.term} Year {SERVICE_LABELS[item.service]}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Button variant="primary" href="/cart">View Cart</Button>
    </div>
  );
}

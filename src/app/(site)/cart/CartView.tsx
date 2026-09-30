"use client";

import { CSSProperties } from "react";
import { ChevronRight, Close, ShoppingCart } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Select } from "@/components/Select";
import { Table } from "@/components/Table";
import { tokenNumber } from "@/components/internal/styles";
import { useCart, type CartItem } from "../CartProvider";
import { useRegion } from "../RegionProvider";
import { inRegionCurrency } from "@/data/regions";
import { money, priceForTerm, SERVICE_LABELS, TERMS, type Term } from "@/data/site";

/* The cart, built to the reference's anatomy (bltz.com, the client's screenshots of 18 Sep 2026):
   the count beside the title, a four column table of Products / Type / Duration / Price with a
   remove cross on each row, Empty Cart at the foot left, the total at the foot right, and
   Checkout under it.
 *
 * IT IS A REAL TABLE, not a list of CSS grids. The shape before 18 Sep laid each row out with
 * grid-template-columns and no header, so the columns had no names: a screen reader heard a
 * domain, a combobox and a number with nothing saying which was which.
 *
 * THE DURATION SELECT IS LIVE HERE, as it is on the reference: changing it reprices the line in
 * place. cart.add() replaces a line with the same id rather than appending, and replaces it AT
 * ITS INDEX, so a repriced line does not jump to the bottom of a basket of five.
 *
 * ON A PHONE THE TABLE BECOMES A LIST OF CARDS (Taqi's list, point 8, Sep 2026). At 390px the five
 * columns did not fit: the domain broke one letter per line and the price and the remove cross
 * fell off the right edge. Both shapes are rendered and a hoisted media query shows one, so
 * nothing about the cart's state depends on the viewport.
 *
 * PROMO CODES ARE ENTERED ON STRIPE'S PAYMENT PAGE (allow_promotion_codes in api/checkout.php),
 * so the cart's own promo field, which could never apply anything, is gone. */

const domainStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-md)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--text-positive-primary)",
  overflowWrap: "anywhere",
};
const typeStyle: CSSProperties = {
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--text-positive-primary)",
};
const countStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--type-md)",
  color: "var(--text-positive-tertiary)",
};
const footStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "var(--space-md)",
};
const footEndStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "var(--space-sm)",
};
const totalStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "var(--space-sm)",
  fontFamily: "var(--font-display)",
  fontSize: "var(--type-lg)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-positive-primary)",
};
const noteStyle: CSSProperties = { margin: 0, fontSize: "var(--type-sm)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-tertiary)" };

/* Phone cards: the domain and the remove cross on the top line, the service under it, then the
   duration select and the price. */
const cardListStyle: CSSProperties = { flexDirection: "column", gap: "var(--space-sm)", margin: 0, padding: 0, listStyle: "none" };
const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
  padding: "var(--space-md)",
  border: "var(--rule-weight) solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-primary)",
};
const cardTopStyle: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-sm)" };
const cardBottomStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-sm)" };
const cartCss = `
[data-ds-cart-cards] { display: none; }
@media (max-width: 639.98px) { /* mobile, below the Row collapse tier */
  [data-ds-cart-table] { display: none; }
  [data-ds-cart-cards] { display: flex; }
}
`;

/* The remove cross, in the danger ink.
 *
 * RED HERE IS NOT A BRAND DECISION AND DOES NOT BREACH ONE. The owner's 18 Sep call reserved the
 * brand red for the mark and made graphite the working colour; --status-danger-text is the
 * system's semantic ink for a destructive action, which is a different axis and is exactly what
 * removing a line is. It is the one red on the page and it means "this deletes something". */
const removeStyle: CSSProperties = { color: "var(--status-danger-text)" };

export function CartView() {
  const cart = useCart();
  // Prices are held in USD and shown in the visitor's currency: CAD for Canada at the same
  // figures (the client's rule), USD for everyone else.
  const { region } = useRegion();
  if (!cart.ready) return null;

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart />}
        title="Your cart is empty"
        description="Search a domain and add it here to register it."
        actions={<Button variant="primary" href="/search">Search a domain</Button>}
      />
    );
  }

  const count = cart.items.length;
  const price = (usd: number) => money(inRegionCurrency(usd, region.currency), region.currency);

  const termSelect = (item: CartItem, idPrefix: string) => (
    <Select
      id={`${idPrefix}-${item.id.replace(/[^a-z0-9-]/gi, "-")}`}
      // The column names it, so the control does not repeat the word in a visible label; it
      // keeps an accessible one so the combobox is not anonymous.
      aria-label={`Duration for ${item.domain}`}
      size="sm"
      value={String(item.term)}
      options={TERMS.map((t) => ({
        value: String(t),
        label: `${t} ${t === 1 ? "Year" : "Years"} - ${price(priceForTerm(t))}`,
      }))}
      onChange={(e) => {
        const term = Number(e.target.value) as Term;
        cart.add({ domain: item.domain, service: item.service, term, amount: priceForTerm(term) });
      }}
    />
  );

  const removeButton = (item: CartItem) => (
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      // 20, not the 16 default. At 16 in a 35px box the cross measured as a pale speck; the
      // reference's is the row's loudest mark, because it is the one irreversible control on the
      // page and has to be found on purpose.
      icon={<Close size={20} />}
      style={removeStyle}
      aria-label={`Remove ${item.domain} from your cart`}
      onClick={() => cart.remove(item.id)}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--flow-group)" }}>
      <style href="domain-services-cart" precedence="default">{cartCss}</style>
      {/* "2 items in cart", the reference's line. It is rendered HERE rather than as the page's
          lede because the count is client state and the page shell is a server component; a lede
          that said "2 items" in the HTML would be wrong for everyone but the last visitor to
          render it. */}
      <p style={countStyle}>{count} {count === 1 ? "item" : "items"} in cart</p>

      <div data-ds-cart-table="">
        <Table<CartItem>
          caption="Your cart"
          rowKey={(item) => item.id}
          rows={cart.items}
          columns={[
            {
              key: "domain",
              header: "Products",
              render: (item) => <span style={domainStyle}>{item.domain}</span>,
            },
            {
              key: "service",
              header: "Type",
              render: (item) => <span style={typeStyle}>{SERVICE_LABELS[item.service]}</span>,
            },
            {
              key: "term",
              header: "Duration",
              width: "13rem",
              render: (item) => termSelect(item, "term"),
            },
            {
              key: "amount",
              header: "Price",
              align: "right",
              width: "9rem",
              render: (item) => <span style={{ ...totalStyle, justifyContent: "flex-end" }}>{price(item.amount)}</span>,
            },
            {
              key: "id",
              header: "",
              align: "right",
              width: "4rem",
              render: (item) => removeButton(item),
            },
          ]}
        />
      </div>

      <ul style={cardListStyle} data-ds-cart-cards="" aria-label="Your cart">
        {cart.items.map((item) => (
          <li key={item.id} style={cardStyle}>
            <div style={cardTopStyle}>
              <span style={domainStyle}>{item.domain}</span>
              {removeButton(item)}
            </div>
            <span style={typeStyle}>{SERVICE_LABELS[item.service]}</span>
            <div style={cardBottomStyle}>
              {termSelect(item, "term-card")}
              <span style={totalStyle}>{price(item.amount)}</span>
            </div>
          </li>
        ))}
      </ul>

      <div style={footStyle}>
        <Button variant="secondary" size="sm" onClick={cart.clear}>Empty Cart</Button>
        <div style={footEndStyle}>
          {/* "Total(2): $640.00 USD", the reference's own foot line, cents always shown and the
              ISO code stated: the symbol alone cannot separate USD from CAD. */}
          <div style={totalStyle}>
            <span>Total({count}):</span>
            <span>{price(cart.total)} {region.currency}</span>
          </div>
          <Button variant="primary" href="/checkout" icon={<ChevronRight />} iconPosition="right">
            Checkout
          </Button>
        </div>
      </div>

      <p style={noteStyle}>Have a promo code? You can enter it on the secure payment page.</p>
    </div>
  );
}

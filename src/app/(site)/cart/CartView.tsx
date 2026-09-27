"use client";

import { CSSProperties, useState } from "react";
import { ChevronRight, Close, ShoppingCart } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { CalloutCard } from "@/components/CalloutCard";
import { EmptyState } from "@/components/EmptyState";
import { Select } from "@/components/Select";
import { Table } from "@/components/Table";
import { TextField } from "@/components/TextField";
import { tokenNumber } from "@/components/internal/styles";
import { useCart, type CartItem } from "../CartProvider";
import { useRegion } from "../RegionProvider";
import { inRegionCurrency, isAtParity, FX_RATE, FX_RATE_SET } from "@/data/regions";
import { money, priceForTerm, SERVICE_LABELS, TERMS, type Term } from "@/data/site";

/* The cart, front end only, built to the reference's anatomy (bltz.com, the client's screenshots
   of 18 Sep 2026): the count beside the title, a four column table of Products / Type / Duration
   / Price with a remove cross on each row, Empty Cart at the foot left, the total at the foot
   right, and Checkout under it.
 *
 * IT IS A REAL TABLE, not a list of CSS grids. The shape before 18 Sep laid each row out with
 * grid-template-columns and no header, so the columns had no names: a screen reader heard a
 * domain, a combobox and a number with nothing saying which was which. The mother's Table owns
 * the markup, so the fork is not hand-rolling one (CLAUDE.md, use the mother's component before
 * writing anything).
 *
 * THE DURATION SELECT IS LIVE HERE, as it is on the reference: changing it reprices the line in
 * place. cart.add() replaces a line with the same id rather than appending, and replaces it AT
 * ITS INDEX, so a repriced line does not jump to the bottom of a basket of five.
 *
 * CHECKOUT EXISTS NOW and takes no card. /checkout was a permanent redirect back to here until
 * 18 Sep, on the reasoning that payment and fulfilment are coupled and a checkout that cannot
 * register a domain is a lie. The client asked for the page anyway, with the Stripe panel stubbed
 * ("once Stripe is connected, it'll show here"), and that is a different thing from a fake: the
 * page says plainly that nothing is charged. */

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
const promoStyle: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "var(--space-sm)" };
const promoToggleStyle: CSSProperties = {
  appearance: "none", background: "none", border: "none", padding: 0, margin: 0,
  font: "inherit", fontSize: "var(--type-sm)", color: "var(--text-positive-link)",
  textDecoration: "underline", cursor: "pointer",
};
const noteStyle: CSSProperties = { margin: 0, fontSize: "var(--type-sm)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-tertiary)" };

/* The remove cross, in the danger ink.
 *
 * RED HERE IS NOT A BRAND DECISION AND DOES NOT BREACH ONE. The owner's 18 Sep call reserved the
 * brand red for the mark and made graphite the working colour; --status-danger-text is the
 * system's semantic ink for a destructive action, which is a different axis and is exactly what
 * removing a line is. It is the one red on the page and it means "this deletes something". */
const removeStyle: CSSProperties = { color: "var(--status-danger-text)" };

export function CartView() {
  const cart = useCart();
  // Prices are held in USD and converted at render, so one figure is stored and the visitor's
  // currency is a presentation choice rather than a second source of truth.
  const { region } = useRegion();
  // The promo field is hidden behind a toggle, as the reference has it: an empty input on every
  // cart invites the question "is there a code I am missing", which costs more than it collects.
  const [promoOpen, setPromoOpen] = useState(false);
  if (!cart.ready) return null;

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart />}
        title="Your cart is empty"
        description="Search a domain and add it here to register, transfer or renew it."
        actions={<Button variant="primary" href="/search">Search a domain</Button>}
      />
    );
  }

  const count = cart.items.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--flow-group)" }}>
      {/* "2 items in cart", the reference's line. It is rendered HERE rather than as the page's
          lede because the count is client state and the page shell is a server component; a lede
          that said "2 items" in the HTML would be wrong for everyone but the last visitor to
          render it. */}
      <p style={countStyle}>{count} {count === 1 ? "item" : "items"} in cart</p>

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
            render: (item) => (
              <Select
                id={`term-${item.id.replace(/[^a-z0-9-]/gi, "-")}`}
                // The column names it, so the control does not repeat the word in a visible
                // label; it keeps an accessible one so the combobox is not anonymous.
                aria-label={`Duration for ${item.domain}`}
                size="sm"
                value={String(item.term)}
                options={TERMS.map((t) => ({
                  value: String(t),
                  label: `${t} ${t === 1 ? "Year" : "Years"} - ${money(inRegionCurrency(priceForTerm(t), region.currency), region.currency)}`,
                }))}
                onChange={(e) => {
                  const term = Number(e.target.value) as Term;
                  cart.add({ domain: item.domain, service: item.service, term, amount: priceForTerm(term) });
                }}
              />
            ),
          },
          {
            key: "amount",
            header: "Price",
            align: "right",
            width: "9rem",
            render: (item) => (
              <span style={totalStyle}>{money(inRegionCurrency(item.amount, region.currency), region.currency)}</span>
            ),
          },
          {
            key: "id",
            header: "",
            align: "right",
            width: "4rem",
            render: (item) => (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                // 20, not the 16 default. At 16 in a 35px box the cross measured as a pale
                // speck; the reference's is the row's loudest mark, because it is the one
                // irreversible control on the page and has to be found on purpose.
                icon={<Close size={20} />}
                style={removeStyle}
                aria-label={`Remove ${item.domain} from your cart`}
                onClick={() => cart.remove(item.id)}
              />
            ),
          },
        ]}
      />

      <div style={promoStyle}>
        {promoOpen ? (
          <>
            <TextField
              id="cart-promo"
              name="promo"
              label="Promo code"
              size="sm"
              helper="Codes apply when payment is connected."
            />
            <Button variant="secondary" size="sm" disabled>Apply</Button>
          </>
        ) : (
          <button type="button" style={promoToggleStyle} onClick={() => setPromoOpen(true)}>
            Have a promo code?
          </button>
        )}
      </div>

      <div style={footStyle}>
        <Button variant="secondary" size="sm" onClick={cart.clear}>Empty Cart</Button>
        <div style={footEndStyle}>
          {/* "Total(2): $640.00 USD", the reference's own foot line, cents always shown and the
              ISO code stated: the symbol alone cannot separate USD from CAD. */}
          <div style={totalStyle}>
            <span>Total({count}):</span>
            <span>{money(inRegionCurrency(cart.total, region.currency), region.currency)} {region.currency}</span>
          </div>
          <Button variant="primary" href="/checkout" icon={<ChevronRight />} iconPosition="right">
            Checkout
          </Button>
        </div>
      </div>

      <p style={noteStyle}>
        Prices follow the ladder the client asked us to match, pending their own price list.
        {region.currency !== "USD" ? (
          isAtParity(region.currency) ? (
            <> Shown in {region.currency} at parity with USD for testing, not a converted figure.</>
          ) : (
            <> Shown in {region.currency}, converted from USD at {FX_RATE[region.currency]} as at {FX_RATE_SET}.</>
          )
        ) : null}
      </p>

      <CalloutCard
        tone="info"
        title="Payment arrives with the next release"
        body="Card payment through Stripe and the live registry connection are the next build. Nothing is charged or registered from this preview."
      />
    </div>
  );
}

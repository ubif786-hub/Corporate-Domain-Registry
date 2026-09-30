"use client";

import { CSSProperties, useId, useState } from "react";
import { ChevronDown, ChevronUp, Locked, ShoppingCart } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Heading } from "@/components/Heading";
import { Row } from "@/components/Row";
import { Column } from "@/components/Column";
import { tokenNumber } from "@/components/internal/styles";
import { CartPanel } from "../CartPanel";
import { useCart } from "../CartProvider";
import { useRegion } from "../RegionProvider";
import { inRegionCurrency } from "@/data/regions";
import { money, SERVICE_LABELS, SITE } from "@/data/site";
import { SHOP_OPEN } from "@/data/shop";
import { CheckoutForm } from "./CheckoutForm";

/* Checkout, the reference's anatomy (bltz.com, the client's screenshots of 18 Sep 2026): who you
 * are paying and how much, an expandable line by line breakdown under it, then the payment step,
 * with the cart rail repeated on the right.
 *
 * BY DEFAULT THE PAYMENT STEP IS A PLACEHOLDER, the client's own instruction of 18 Sep ("just put
 * the placeholder box that says once Stripe is connected, it'll show here"), and nothing on the
 * page collects a card or charges anything. Payment is backend work outside this agreement and is
 * the client's decision to commission (PROJECT.md decision 13).
 *
 * WITH THE SHOP ON (NEXT_PUBLIC_PAYMENTS=1) IT IS STRIPE CHECKOUT, HOSTED: the registrant form (OpenSRS
 * will not register a domain without one) posts the cart to the API (POST /api/checkout/), which checks every
 * domain again, prices it and sends the visitor to Stripe's own page. The card is held, not
 * charged, until the domains register. Figures are in the visitor's currency, the one the card is
 * charged in: CAD in Canada at the same figures as USD (the client's rule), USD everywhere else.
 *
 * THIS ROUTE WAS A PERMANENT REDIRECT TO /cart UNTIL 18 SEP, and the reasoning is worth keeping:
 * payment and fulfilment are coupled, and taking a card for a domain the system cannot register is
 * worse than having no checkout. A 308 is cached by browsers, so the redirect came out of
 * next.config.ts in the same edit that created this page.
 */

const CAN_PAY = SHOP_OPEN;

const stackStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--flow-group)" };

// The "Pay <company>" block: a quiet line naming who is being paid over the figure itself.
const payeeStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--type-md)",
  color: "var(--text-positive-secondary)",
};
const amountStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "var(--type-3xl)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  letterSpacing: "var(--tracking-snug)",
  fontVariantNumeric: "tabular-nums",
  color: "var(--text-positive-primary)",
  lineHeight: "var(--leading-tight)",
};

/* The breakdown disclosure. Hand-rolled rather than the mother's Accordion because the trigger is
   not a heading here: it is a control under a figure, and Accordion wraps every trigger in one,
   which would put an empty rung in the page outline between the h1 and the payment heading. */
const discloseStyle: CSSProperties = {
  appearance: "none", background: "none", border: "none", padding: 0, margin: 0,
  display: "inline-flex", alignItems: "center", gap: "var(--space-2xs)",
  font: "inherit", fontSize: "var(--type-sm)", color: "var(--text-positive-link)",
  cursor: "pointer",
};
const breakdownStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
  marginTop: "var(--space-sm)",
  paddingTop: "var(--space-sm)",
  borderTop: "var(--rule-weight) solid var(--border-positive-secondary)",
};
const lineStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "var(--space-md)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-secondary)",
};
const lineTotalStyle: CSSProperties = {
  ...lineStyle,
  paddingTop: "var(--space-xs)",
  borderTop: "var(--rule-weight) solid var(--border-positive-secondary)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--text-positive-primary)",
};
const figureStyle: CSSProperties = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

const payBoxStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
  padding: "var(--space-xl)",
  // Dashed, not solid: every other bordered box on this site is a real surface, and this one is a
  // reserved space. At --border-positive-primary (ink at 8%) the dash was invisible, measured, so
  // it takes a real ink at the strong weight.
  border: "var(--rule-weight-strong) dashed var(--text-positive-tertiary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-secondary)",
  textAlign: "center",
  alignItems: "center",
};
const payIconStyle: CSSProperties = { color: "var(--text-positive-tertiary)" };
const payBodyStyle: CSSProperties = {
  margin: 0,
  maxWidth: "var(--measure-prose)",
  fontSize: "var(--type-md)",
  lineHeight: "var(--leading-normal)",
  color: "var(--text-positive-secondary)",
};
const noteStyle: CSSProperties = { margin: 0, fontSize: "var(--type-sm)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-tertiary)" };

export function CheckoutView() {
  const cart = useCart();
  const { region } = useRegion();
  const [open, setOpen] = useState(false);
  const breakdownId = useId();

  if (!cart.ready) return null;

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart />}
        title="There is nothing to pay for"
        description="Your cart is empty. Search a domain and add it before checking out."
        actions={<Button variant="primary" href="/search">Search a domain</Button>}
      />
    );
  }

  // What the card is charged in: CAD in Canada, USD everywhere else (the API's checkout decides the
  // same way from the same IP database).
  const currency = region.currency;
  const shown = (usd: number) => money(inRegionCurrency(usd, currency), currency);
  const total = shown(cart.total);

  return (
    <Row cols={{ mobile: 1, tablet: 1, desktop: 3 }} gap="lg" alignItems="start">
      <Column span={{ mobile: 1, tablet: 1, desktop: 2 }}>
        <div style={stackStyle}>
          <div>
            <p style={payeeStyle}>Pay {SITE.name}</p>
            <p style={{ margin: "var(--space-2xs) 0 0" }}>
              <span style={amountStyle}>{total}</span>{" "}
              <span style={payeeStyle}>{currency}</span>
            </p>

            <p style={{ margin: "var(--space-sm) 0 0" }}>
              <button
                type="button"
                style={discloseStyle}
                aria-expanded={open}
                aria-controls={breakdownId}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? "Hide" : "Show"} the breakdown
                {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              </button>
            </p>

            {/* Always in the DOM, hidden when closed: a breakdown that only exists while open is
                invisible to find-in-page, which is the first thing somebody does when a total
                surprises them. */}
            {/* display is set only while open: an inline display beats the hidden attribute, and
                until 23 Sep 2026 the list was always shown under a "Show the breakdown" button. */}
            <div id={breakdownId} style={open ? breakdownStyle : undefined} hidden={!open}>
              {cart.items.map((item) => (
                <div key={item.id} style={lineStyle}>
                  <span>
                    {SERVICE_LABELS[item.service]} {item.term} {item.term === 1 ? "Year" : "Years"} for {item.domain}
                  </span>
                  <span style={figureStyle}>{shown(item.amount)}</span>
                </div>
              ))}
              <div style={lineTotalStyle}>
                <span>Total</span>
                <span style={figureStyle}>{total} {currency}</span>
              </div>
            </div>
          </div>

          {CAN_PAY ? (
            <CheckoutForm items={cart.items} total={shown(cart.total)} currency={currency} onRemove={cart.remove} />
          ) : (
            <>
              <div style={payBoxStyle}>
                <span style={payIconStyle}><Locked size={32} aria-hidden="true" /></span>
                <Heading level={2} size={6}>Card payment appears here once Stripe is connected</Heading>
                <p style={payBodyStyle}>
                  Stripe renders this part itself: email, card number, expiry, CVC, the cardholder name,
                  the billing address, the Pay button and its own Powered by Stripe footer. Until the
                  account is connected the box holds its place, and nothing on this page collects a card
                  or charges anything.
                </p>
                <Button variant="primary" disabled>Pay {total} {currency}</Button>
              </div>

              <p style={noteStyle}>Nothing is charged and no domain is registered from this preview.</p>
            </>
          )}

          <p style={noteStyle}>
            <Button variant="ghost" size="sm" href="/cart">Back to your cart</Button>
          </p>
        </div>
      </Column>
      <Column span={1}>
        <CartPanel />
      </Column>
    </Row>
  );
}

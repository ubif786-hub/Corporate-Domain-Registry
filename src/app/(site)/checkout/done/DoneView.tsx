"use client";

import { CSSProperties, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { CONTACT } from "@/data/site";
import { useCart } from "../../CartProvider";

/* Where Stripe sends the customer back after paying. THIS PAGE PROVES NOTHING: anyone can type the
 * address, so it never says "paid" on its own authority. What is true is decided by the webhook
 * (api/stripe-webhook.php), which is what emails CDR. The page thanks the customer, gives them the
 * order number to quote, empties their cart, and says what happens next. */

const stackStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--flow-group)", maxWidth: "var(--measure-prose)" };
const bodyStyle: CSSProperties = { margin: 0, fontSize: "var(--type-md)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-secondary)" };
const idStyle: CSSProperties = { fontVariantNumeric: "tabular-nums", color: "var(--text-positive-primary)" };
const linkStyle: CSSProperties = { color: "var(--text-positive-link)" };

const ORDER_ID = /^\d{8}-[a-f0-9]{10}$/;

export function DoneView() {
  const cart = useCart();
  const [order, setOrder] = useState<string | null>(null);
  const { ready, items, clear } = cart;

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("order");
    setOrder(id && ORDER_ID.test(id) ? id : null);
  }, []);

  // Only a real order number empties the cart, so a stray visit to this address loses nothing.
  useEffect(() => {
    if (ready && order && items.length) clear();
  }, [ready, order, items.length, clear]);

  return (
    <div style={stackStyle}>
      {order ? (
        <p style={bodyStyle}>
          Your order number is <strong style={idStyle}>{order}</strong>. Stripe emails your receipt, and we
          email you when each domain is registered.
        </p>
      ) : (
        <p style={bodyStyle}>If you have just paid, Stripe emails your receipt, and we email you when each domain is registered.</p>
      )}
      <p style={bodyStyle}>
        The registrant will also receive one email asking to confirm the contact details. Please answer it: a
        domain whose details are not confirmed can be suspended.
      </p>
      <p style={bodyStyle}>
        Questions about this order go to <a href={`mailto:${CONTACT.email}`} style={linkStyle}>{CONTACT.email}</a>
        {order ? ", quoting the order number" : ""}.
      </p>
      <div>
        <Button variant="secondary" href="/search">Search another domain</Button>
      </div>
    </div>
  );
}

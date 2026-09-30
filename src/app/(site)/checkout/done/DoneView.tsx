"use client";

import { CSSProperties, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { CONTACT, money } from "@/data/site";
import { useCart } from "../../CartProvider";

/* Where Stripe sends the customer back after paying.
 *
 * THIS PAGE DECIDES NOTHING. It reads the order from api/order-status.php, using the order number
 * and the token Stripe carried back in the address, and shows what the server knows: payment
 * confirmed, each domain registering, registered or not, and what was charged. Polling it also
 * nudges the order along (the server registers while the page waits), so a customer who stays
 * sees the result; one who leaves gets the same result by email.
 *
 * The cart is emptied only once the server confirms the payment, so a checkout that expired or
 * failed keeps the cart for another try. */

const stackStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--flow-group)", maxWidth: "var(--measure-prose)" };
const bodyStyle: CSSProperties = { margin: 0, fontSize: "var(--type-md)", lineHeight: "var(--leading-normal)", color: "var(--text-positive-secondary)" };
const idStyle: CSSProperties = { fontVariantNumeric: "tabular-nums", color: "var(--text-positive-primary)" };
const linkStyle: CSSProperties = { color: "var(--text-positive-link)" };
const listStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-sm)", margin: 0, padding: 0, listStyle: "none" };
const lineStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-xs)",
  padding: "var(--space-sm) var(--space-md)",
  border: "var(--rule-weight) solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-primary)",
};
const domainStyle: CSSProperties = { fontFamily: "var(--font-code)", overflowWrap: "anywhere", color: "var(--text-positive-primary)" };

const ORDER_ID = /^\d{8}-[a-f0-9]{10}$/;
const TOKEN = /^[a-f0-9]{32}$/;
const POLL_MS = 3000;
const GIVE_UP_MS = 180000;

type LineState = "new" | "registering" | "registered" | "pending" | "failed" | "unknown";
interface Status {
  order: string;
  status: string;
  currency: string;
  lines: { domain: string; term: number; state: LineState }[];
  charged: number | null;
  email: string;
}

const WAITING = ["pending_payment"];
const WORKING = ["authorized", "fulfilling", "pending", "settle_error"];
const PAID = [...WORKING, "registered", "partially_registered", "failed", "needs_review"];

export function DoneView() {
  const { ready, items, clear } = useCart();
  const [ids, setIds] = useState<{ order: string; token: string } | null | undefined>(undefined);
  const [status, setStatus] = useState<Status | null>(null);
  const [slow, setSlow] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const order = p.get("order") ?? "";
    const token = p.get("t") ?? "";
    // The address is only readable in the browser, after hydration; one extra render is the cost.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIds(ORDER_ID.test(order) && TOKEN.test(token) ? { order, token } : null);
  }, []);

  useEffect(() => {
    if (!ids) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const poll = async () => {
      let next: Status | null = null;
      try {
        const res = await fetch(`/api/order-status/?order=${ids.order}&t=${ids.token}`, { cache: "no-store" });
        if (res.status === 404) { if (live) setLost(true); return; }
        if (res.ok) next = await res.json();
      } catch {
        /* a dropped request: the next poll tries again */
      }
      if (!live) return;
      if (next) setStatus(next);
      const s = next?.status ?? "pending_payment";
      if (![...WAITING, ...WORKING].includes(s)) return;
      if (Date.now() - started > GIVE_UP_MS) { setSlow(true); return; }
      timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => { live = false; if (timer) clearTimeout(timer); };
  }, [ids]);

  // Only a confirmed payment empties the cart.
  useEffect(() => {
    if (ready && status && PAID.includes(status.status) && items.length) clear();
  }, [ready, status, items.length, clear]);

  const contact = <a href={`mailto:${CONTACT.email}`} style={linkStyle}>{CONTACT.email}</a>;

  if (ids === undefined) return null;
  if (ids === null || lost) {
    return (
      <div style={stackStyle}>
        <p style={bodyStyle}>If you have just paid, we email you as soon as your domains are registered, and Stripe emails your receipt.</p>
        <p style={bodyStyle}>Questions go to {contact}.</p>
        <div><Button variant="secondary" href="/search">Search another domain</Button></div>
      </div>
    );
  }

  const s = status?.status ?? "pending_payment";
  const charged = status?.charged != null ? `${money(status.charged, status.currency)} ${status.currency}` : null;
  const registered = status?.lines.filter((l) => l.state === "registered") ?? [];

  let headline: React.ReactNode;
  if (WAITING.includes(s)) headline = slow ? <>We have not had your payment confirmation yet. If you paid, we will email you at your address as soon as it arrives.</> : <>Confirming your payment with Stripe…</>;
  else if (WORKING.includes(s)) headline = slow ? <>The registry is taking longer than usual. You can close this page: we will email {status?.email} when it is done.</> : <>Payment confirmed. Registering your domains, this usually takes under a minute…</>;
  else if (s === "registered") headline = <>All done. {registered.length === 1 ? "Your domain is" : "Your domains are"} registered{charged ? <>, and {charged} was charged to your card</> : null}.</>;
  else if (s === "partially_registered") headline = <>Some of your domains are registered. You were charged {charged ?? "only"} for those; nothing for the ones that could not be registered.</>;
  else if (s === "failed") headline = <>We are sorry: your domains could not be registered. Your card was not charged, and the hold on it has been released.</>;
  else if (s === "expired") headline = <>This checkout expired before payment, so nothing was charged. Your cart is still here if you want to try again.</>;
  else if (s === "payment_failed") headline = <>The payment did not go through, so nothing was charged. Your cart is still here if you want to try again.</>;
  else headline = <>We are checking your order by hand and will email you shortly. Nothing more is needed from you.</>;

  return (
    <div style={stackStyle}>
      <p style={bodyStyle} role="status" aria-live="polite">{headline}</p>

      {status && PAID.includes(s) ? (
        <ul style={listStyle} aria-label="Your domains">
          {status.lines.map((l) => (
            <li key={l.domain} style={lineStyle}>
              <span style={domainStyle}>{l.domain}</span>
              <LineBadge state={l.state} />
            </li>
          ))}
        </ul>
      ) : null}

      <p style={bodyStyle}>
        Your order number is <strong style={idStyle}>{ids.order}</strong>. Questions about it go to {contact}, quoting the number.
      </p>

      {registered.length ? (
        <p style={bodyStyle}>
          Our registry partner, Tucows (OpenSRS), may email the registrant to confirm the contact details. Please answer
          it within 15 days: a domain whose details are not confirmed can be suspended.
        </p>
      ) : null}

      <div>
        {s === "expired" || s === "payment_failed" ? (
          <Button variant="primary" href="/cart">Back to your cart</Button>
        ) : (
          <Button variant="secondary" href="/search">Search another domain</Button>
        )}
      </div>
    </div>
  );
}

function LineBadge({ state }: { state: LineState }) {
  if (state === "registered") return <Badge tone="success" emphasis="solid" icon textCase="title">Registered</Badge>;
  if (state === "failed") return <Badge tone="error" icon textCase="sentence">Not registered, not charged</Badge>;
  if (state === "pending") return <Badge tone="warning" textCase="sentence">Waiting for the registry</Badge>;
  return <Badge tone="neutral" textCase="title">Registering</Badge>;
}

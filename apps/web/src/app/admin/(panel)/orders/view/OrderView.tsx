"use client";

import { useState } from "react";
import { CheckmarkOutline, Email, Launch, Phone, Renew, WarningAlt } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { CA_LEGAL_TYPES } from "@cdr/shared";
import { api, ApiError, useApi } from "../../../lib/api";
import { country, day, money, stamp, when, years } from "../../../lib/format";
import type { Order, OrderDetail } from "../../../lib/types";
import { FAIL_REASON, statusWording } from "../../../lib/words";
import { Empty, ErrorNotice, LineBadge, PageHead, Panel, Skel, SkelRows, StatusBadge, TestTag, useQueryState } from "../../../ui/bits";

const LOG_LINE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) UTC {2}([\s\S]*)$/;
const NEEDS_ACTION = ["needs_review", "settle_error", "amount_mismatch"];

function History({ log }: { log: string[] }) {
  if (!log.length) return <Empty title="No history yet" />;
  const entries = log.map((line) => {
    const m = LOG_LINE.exec(line);
    return m ? { at: `${m[1]}T${m[2]}Z`, text: m[3] } : { at: "", text: line };
  }).reverse();
  return (
    <ol className="adm-history" aria-label="History, newest first">
      {entries.map((e, i) => (
        <li key={i}>
          <time dateTime={e.at || undefined} title={e.at ? when(e.at) : undefined}>{e.at ? stamp(e.at) : ""}</time>
          <span>{e.text}</span>
        </li>
      ))}
    </ol>
  );
}

function Money({ o }: { o: Order }) {
  const s = o.stripe;
  const released = s.amount_authorized !== undefined && s.amount_captured !== undefined && s.settled_at
    ? s.amount_authorized - s.amount_captured : null;
  return (
    <div className="adm-panel-body">
      <dl className="adm-dl">
        <dt>Order total</dt><dd className="tnum">{money(o.subtotal_cents, o.currency)}</dd>
        {s.amount_discount ? (<><dt>Promotion</dt><dd className="tnum">&minus;{money(s.amount_discount, o.currency)}</dd></>) : null}
        {s.amount_tax ? (<><dt>GST/HST</dt><dd className="tnum">{money(s.amount_tax, o.currency)}{s.amount_captured !== undefined && s.amount_authorized && s.amount_captured < s.amount_authorized ? `, ${money(Math.round((s.amount_captured * s.amount_tax) / s.amount_authorized), o.currency)} of it charged` : ""}</dd></>) : null}
        <dt>Card hold</dt><dd className="tnum">{s.amount_authorized !== undefined ? `${money(s.amount_authorized, o.currency)}${s.authorized_at ? `, ${when(s.authorized_at)}` : ""}` : "None"}</dd>
        <dt>Charged</dt><dd className="tnum strong">{s.amount_captured !== undefined ? money(s.amount_captured, o.currency) : "Nothing yet"}</dd>
        {released !== null && released > 0 ? (<><dt>Released to the customer</dt><dd className="tnum">{money(released, o.currency)}</dd></>) : null}
        {s.amount_refunded ? (<><dt>Refunded</dt><dd className="tnum">&minus;{money(s.amount_refunded, o.currency)}</dd></>) : null}
        {s.settled_at ? (<><dt>Settled</dt><dd>{when(s.settled_at)}</dd></>) : null}
        {s.settle_error ? (<><dt>Stripe said</dt><dd>{s.settle_error}</dd></>) : null}
      </dl>
    </div>
  );
}

function Customer({ o }: { o: Order }) {
  const r = o.registrant;
  return (
    <div className="adm-panel-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      <div>
        <div className="strong">{`${r.first_name} ${r.last_name}`}</div>
        {r.org_name ? <div>{r.org_name}</div> : null}
        {r.ca_legal_type ? <div className="adm-cell-sub">.ca: {CA_LEGAL_TYPES.find((t) => t.code === r.ca_legal_type)?.label ?? r.ca_legal_type} ({r.ca_legal_type})</div> : null}
      </div>
      <address style={{ fontStyle: "normal", color: "var(--text-positive-secondary)", fontSize: "var(--type-sm)" }}>
        {r.address1}{r.address2 ? <><br />{r.address2}</> : null}<br />
        {r.city}{r.state ? `, ${r.state}` : ""} {r.postal_code}<br />
        {country(r.country)}
      </address>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xs)", fontSize: "var(--type-sm)" }}>
        <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Your order ${o.id}`)}`} style={{ display: "inline-flex", gap: "var(--space-xs)", alignItems: "center", overflowWrap: "anywhere" }}>
          <Email size={16} aria-hidden="true" /> {r.email}
        </a>
        <a href={`tel:${r.phone.replace(/[^+\d]/g, "")}`} style={{ display: "inline-flex", gap: "var(--space-xs)", alignItems: "center" }}>
          <Phone size={16} aria-hidden="true" /> {r.phone}
        </a>
      </div>
    </div>
  );
}

function Details({ o }: { o: Order }) {
  return (
    <div className="adm-panel-body">
      <dl className="adm-dl">
        <dt>Order number</dt><dd className="mono">{o.id}</dd>
        <dt>Ordered</dt><dd>{when(o.created_at)}</dd>
        <dt>Last change</dt><dd>{when(o.updated_at)}</dd>
        <dt>Currency</dt><dd>{o.currency.toUpperCase()}</dd>
        <dt>Tucows</dt><dd>{o.opensrs_env === "live" ? "Live account" : "Test system (Horizon)"}</dd>
        <dt>Payments</dt><dd>{o.test_mode ? "Test mode" : "Live"}</dd>
        <dt>Ordered from</dt><dd><span className="mono">{o.registrant_ip || "Unknown"}</span>{o.visitor_country ? `, ${country(o.visitor_country)}` : ""}</dd>
        <dt>Terms accepted</dt><dd>{o.agreement?.accepted_at ? when(o.agreement.accepted_at) : "Unknown"}</dd>
        {o.stripe.payment_intent ? (<><dt>Stripe payment</dt><dd className="mono">{o.stripe.payment_intent}</dd></>) : null}
      </dl>
    </div>
  );
}

/** A transfer's progress under its badge: whose code we wait for, and until when. */
function TransferNotes({ o, l, codeDays }: { o: Order; l: Order["lines"][number]; codeDays?: number }) {
  const t = l.transfer ?? {};
  const paid = o.stripe.authorized_at ? Date.parse(o.stripe.authorized_at) : NaN;
  const refundOn = codeDays && !Number.isNaN(paid) ? new Date(paid + codeDays * 86_400_000).toISOString() : null;
  return (
    <>
      {l.state === "awaiting_code" && t.asked_at ? <span className="adm-cell-sub">Code asked for {day(t.asked_at)}{t.reminded ? `, ${t.reminded} ${t.reminded === 1 ? "reminder" : "reminders"} sent` : ""}</span> : null}
      {l.state === "awaiting_code" && t.last_error ? <span className="adm-cell-sub">Last code: {t.last_error}</span> : null}
      {l.state === "awaiting_code" && refundOn ? <span className="adm-cell-sub">Refunded on {day(refundOn)} if no working code</span> : null}
      {t.refunded_cents ? <span className="adm-cell-sub">Refunded {money(t.refunded_cents, o.currency)}</span> : null}
    </>
  );
}

function Domains({ o, codeDays }: { o: Order; codeDays?: number }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <caption className="sr-only">Domains in this order</caption>
        <thead>
          <tr>
            <th scope="col">Domain</th>
            <th scope="col">Years</th>
            <th scope="col" className="num">Price</th>
            <th scope="col">Result</th>
            <th scope="col">Tucows order</th>
          </tr>
        </thead>
        <tbody>
          {o.lines.map((l) => (
            <tr key={l.domain}>
              <td className="dom">
                <span className="mono">{l.domain}</span>
                {l.service === "renew" ? <span className="adm-cell-sub">Renewal</span> : null}
                {l.service === "transfer" ? <span className="adm-cell-sub">Transfer from {l.transfer?.from_registrar ?? "another company"}</span> : null}
              </td>
              <td className="nowrap">{years(l.term)}</td>
              <td className="num">{money(l.amount_cents, o.currency)}</td>
              <td style={{ minWidth: "14rem" }}>
                <LineBadge state={l.state} service={l.service} />
                {l.reason ? <span className="adm-cell-sub">{FAIL_REASON[l.reason] ?? l.reason}</span> : null}
                {l.registered_at ? <span className="adm-cell-sub">{when(l.registered_at)}</span> : null}
                {l.state === "registered" && l.expires_at ? <span className="adm-cell-sub">Expires {day(l.expires_at)}</span> : null}
                {l.opensrs?.text && l.state !== "registered" ? <span className="adm-cell-sub">Tucows: {l.opensrs.code} {l.opensrs.text}</span> : null}
                {l.service === "transfer" ? <TransferNotes o={o} l={l} codeDays={codeDays} /> : null}
              </td>
              <td className="mono nowrap">{l.opensrs?.order_id ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrderView() {
  const [f, , ready] = useQueryState(["id"]);
  const id = f.id;
  const valid = /^\d{8}-[a-f0-9]{10}$/.test(id);
  const { data, error, loading, reload, replace } = useApi<OrderDetail>(ready && valid ? `/orders/${id}` : null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "warning" | "danger"; text: string } | null>(null);

  async function runNext() {
    setBusy(true);
    setResult(null);
    try {
      const r = await api<OrderDetail & { outcome: string | null }>(`/orders/${id}/continue`, { method: "POST" });
      replace({ order: r.order, can_continue: r.can_continue, code_days: r.code_days });
      if (r.outcome === "busy") setResult({ tone: "warning", text: "Another step is already running for this order. Wait a minute, then reload." });
      else setResult({ tone: "success", text: `Done. The order is now: ${statusWording(r.order.status).label}.` });
    } catch (e) {
      setResult({ tone: "danger", text: e instanceof ApiError ? e.message : "That did not work. Try again." });
    } finally {
      setBusy(false);
    }
  }

  if (ready && !valid) {
    return (
      <>
        <PageHead title="Order not found" back={{ href: "/admin/orders/", label: "All orders" }} />
        <Panel><Empty title="That is not an order number">Order numbers look like 20261002-3fa94c1b2e. Open the order from the list instead.</Empty></Panel>
      </>
    );
  }

  const o = data?.order;
  const w = o ? statusWording(o.status) : null;
  const stripeUrl = o?.stripe.payment_intent ? `https://dashboard.stripe.com/${o.test_mode ? "test/" : ""}payments/${o.stripe.payment_intent}` : null;

  return (
    <>
      <PageHead
        back={{ href: "/admin/orders/", label: "All orders" }}
        title={o ? <>Order <span className="mono" style={{ fontSize: "0.7em" }}>{o.id}</span></> : error?.status === 404 ? "Order not found" : <Skel width="18rem" size="lg" />}
        intro={w?.explain}
        actions={o ? (
          <>
            {data?.can_continue ? (
              <Button variant="primary" size="sm" icon={<Renew size={16} />} onClick={runNext} disabled={busy} aria-busy={busy}>
                {busy ? "Working…" : "Run next step now"}
              </Button>
            ) : null}
            {stripeUrl ? (
              <a className="adm-chip" href={stripeUrl} target="_blank" rel="noreferrer"><Launch size={16} aria-hidden="true" /> Open in Stripe</a>
            ) : null}
          </>
        ) : null}
      />

      {o ? (
        <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap", alignItems: "center", marginTop: "calc(-1 * var(--space-sm))" }}>
          <StatusBadge status={o.status} />
          {o.test_mode ? <TestTag /> : null}
          <span className="quiet">Ordered {when(o.created_at)}</span>
        </div>
      ) : null}

      {result ? (
        <div className="adm-notice" data-tone={result.tone} role="status">
          {result.tone === "success" ? <CheckmarkOutline size={16} aria-hidden="true" /> : <WarningAlt size={16} aria-hidden="true" />}
          <p>{result.text}</p>
        </div>
      ) : null}
      {o && NEEDS_ACTION.includes(o.status) ? (
        <div className="adm-notice" data-tone="danger">
          <WarningAlt size={16} aria-hidden="true" />
          <p>This order needs a person. {w?.explain}</p>
        </div>
      ) : null}

      {error?.status === 404 ? (
        <Panel><Empty title="No order with that number">It may have been typed wrong. Open the order from the list instead.</Empty></Panel>
      ) : <ErrorNotice error={error} onRetry={reload} />}

      {loading && !o ? (
        <div className="adm-split">
          <Panel title="Domains"><SkelRows rows={2} /></Panel>
          <Panel title="Customer"><SkelRows rows={3} /></Panel>
        </div>
      ) : null}

      {o ? (
        <div className="adm-split">
          <div className="adm-stack">
            <Panel title={o.lines.length === 1 ? "Domain" : `Domains (${o.lines.length})`} id="domains"><Domains o={o} codeDays={data?.code_days} /></Panel>
            <Panel title="Money" id="money"><Money o={o} /></Panel>
            <Panel title="History" id="history"><History log={o.log ?? []} /></Panel>
          </div>
          <div className="adm-stack">
            <Panel title="Customer" id="customer"><Customer o={o} /></Panel>
            <Panel title="Details" id="details"><Details o={o} /></Panel>
          </div>
        </div>
      ) : null}
    </>
  );
}

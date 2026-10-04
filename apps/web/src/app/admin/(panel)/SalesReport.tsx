"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "../lib/api";
import { country, day, money, plural, when } from "../lib/format";
import type { SalesReport } from "../lib/types";
import { Empty, ErrorNotice, LineBadge, Panel, SkelRows } from "../ui/bits";

/* The sales report on the dashboard: the same figures as the report email (GET /api/admin/report),
   for a period the owner picks. Buyers newest first; the domains coming up for renewal are the
   people to send the renewal page to. */

const PERIODS: { days: number; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
];

function Figures({ r }: { r: SalesReport }) {
  return (
    <div className="adm-figures" style={{ borderTop: "var(--rule-weight) solid var(--border-positive-secondary)" }}>
      <div className="adm-figure">
        <span className="adm-figure-label">Orders paid</span>
        <span className="adm-figure-value">{r.period.orders.toLocaleString("en-US")}</span>
        <span className="adm-figure-note">{r.period.failed ? `${plural(r.period.failed, "domain")} not completed, not charged` : "Every domain went through"}</span>
      </div>
      <div className="adm-figure">
        <span className="adm-figure-label">New domains</span>
        <span className="adm-figure-value">{r.period.registered.toLocaleString("en-US")}</span>
        <span className="adm-figure-note">{r.all.registered.toLocaleString("en-US")} since the shop opened</span>
      </div>
      <div className="adm-figure">
        <span className="adm-figure-label">Renewed</span>
        <span className="adm-figure-value">{r.period.renewed.toLocaleString("en-US")}</span>
        <span className="adm-figure-note">{r.all.renewed.toLocaleString("en-US")} since the shop opened</span>
      </div>
      <div className="adm-figure">
        <span className="adm-figure-label">Money taken</span>
        <span className="adm-figure-value">{money(r.period.usd, "usd").replace(" USD", "")}<span className="quiet"> USD</span></span>
        <span className="adm-figure-note">{r.period.cad ? `Plus ${money(r.period.cad, "cad")}` : "No sales in CAD"}</span>
      </div>
    </div>
  );
}

function Buyers({ r }: { r: SalesReport }) {
  const rows = [...r.buyers].reverse();
  if (!rows.length) return <Empty title="No sales in this period">Paid orders appear here once a customer completes the payment page.</Empty>;
  return (
    <>
      <div className="adm-table-wrap" data-cards="">
        <table className="adm-table">
          <caption className="sr-only">Buyers in this period, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Customer</th>
              <th scope="col">Country</th>
              <th scope="col">Domains</th>
              <th scope="col">Order</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.order_id}>
                <td className="nowrap" title={when(b.created_at)}>{day(b.created_at)}</td>
                <td>
                  <span className="strong">{b.name || "No name"}</span>
                  {b.org ? <span className="adm-cell-sub">{b.org}</span> : null}
                  <span className="adm-cell-sub">{b.email}</span>
                </td>
                <td className="nowrap">{country(b.country)}</td>
                <td>
                  <div className="adm-domains">
                    {b.lines.map((l) => (
                      <span key={l.domain} className="adm-domain">
                        <span className="mono">{l.domain}</span>
                        <LineBadge state={l.state} service={l.service} />
                      </span>
                    ))}
                  </div>
                </td>
                <td className="nowrap"><Link href={`/admin/orders/view/?id=${b.order_id}`} className="row-link mono">{b.order_id}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="adm-cards">
        {rows.map((b) => (
          <Link key={b.order_id} href={`/admin/orders/view/?id=${b.order_id}`} className="adm-card-row">
            <div className="adm-card-top">
              <span className="strong">{b.name || "No name"}</span>
              <span className="quiet">{day(b.created_at)}</span>
            </div>
            <div className="adm-domains">
              {b.lines.map((l) => (
                <span key={l.domain} className="adm-domain">
                  <span className="mono">{l.domain}</span>
                  <LineBadge state={l.state} service={l.service} />
                </span>
              ))}
            </div>
            <div className="adm-card-meta"><span>{b.email}</span><span>{country(b.country)}</span></div>
          </Link>
        ))}
      </div>
    </>
  );
}

function Expiring({ r }: { r: SalesReport }) {
  if (!r.expiring.length) return <Empty title="Nothing expires soon">Domains sold or renewed here show up when they have {r.renewal_window_days} days or less left.</Empty>;
  return (
    <ul className="adm-list">
      {r.expiring.map((e) => (
        <li key={e.domain}>
          <Link href={`/admin/orders/view/?id=${e.order_id}`} className="adm-list-link">
            <span style={{ minWidth: 0 }}>
              <span className="mono strong" style={{ display: "block", overflowWrap: "anywhere" }}>{e.domain}</span>
              <span className="quiet">{e.name}, {e.email}</span>
            </span>
            <span style={{ whiteSpace: "nowrap" }}>Expires {day(e.expires_at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SalesReportPanel() {
  const [days, setDays] = useState(7);
  const { data, error, loading, reload } = useApi<SalesReport>(`/report?days=${days}`);
  const r = data && data.days === days ? data : null;

  return (
    <Panel
      title="Sales report"
      id="report"
      action={
        <div className="adm-segments" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.days} type="button" className="adm-segment" aria-pressed={days === p.days} onClick={() => setDays(p.days)}>
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      <ErrorNotice error={error} onRetry={reload} />
      {r ? (
        <>
          <p className="adm-panel-body tight quiet" style={{ margin: 0 }}>
            {day(r.from)} to {day(r.to)}. The owner also gets this report by email.
          </p>
          <Figures r={r} />
          <div className="adm-subhead"><h3>Buyers</h3></div>
          <Buyers r={r} />
          <div className="adm-subhead">
            <h3>Coming up for renewal, next {r.renewal_window_days} days</h3>
            <a href="/renew/" target="_blank" rel="noreferrer" className="quiet">The renewal page to send them</a>
          </div>
          <Expiring r={r} />
        </>
      ) : loading ? <SkelRows rows={4} label="Loading the sales report" /> : null}
    </Panel>
  );
}

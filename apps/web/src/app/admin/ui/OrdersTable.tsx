"use client";

// Orders as a table on wide screens and as a list on phones. Used by the dashboard and the
// orders page. Each order opens its own page.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ago, money, when } from "../lib/format";
import type { OrderSummary } from "../lib/types";
import { LineBadge, StatusBadge, TestTag } from "./bits";

const href = (id: string) => `/admin/orders/view/?id=${id}`;

function Total({ o }: { o: OrderSummary }) {
  const charged = o.captured_cents;
  return (
    <>
      <span className="tnum">{money(o.subtotal_cents, o.currency)}</span>
      {charged !== null && charged !== o.subtotal_cents ? (
        <span className="adm-cell-sub tnum">charged {money(charged, o.currency)}</span>
      ) : null}
    </>
  );
}

export function OrdersTable({ orders, caption, showTest = true }: { orders: OrderSummary[]; caption: string; showTest?: boolean }) {
  const router = useRouter();
  return (
    <>
      <div className="adm-table-wrap" data-cards="">
        <table className="adm-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Customer</th>
              <th scope="col">Domains</th>
              <th scope="col" className="num">Total</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} data-link="" onClick={(e) => {
                if ((e.target as HTMLElement).closest("a, button")) return;
                router.push(href(o.id));
              }} style={{ cursor: "pointer" }}>
                <td className="nowrap">
                  <Link href={href(o.id)} className="row-link mono">{o.id}</Link>
                  <span className="adm-cell-sub" title={when(o.created_at)}>{ago(o.created_at)}</span>
                </td>
                <td>
                  <span>{o.name || o.email}</span>
                  {o.org ? <span className="adm-cell-sub">{o.org}</span> : null}
                  <span className="adm-cell-sub">{o.email}</span>
                </td>
                <td>
                  <div className="adm-domains">
                    {o.lines.map((l) => (
                      <div key={l.domain} className="adm-domain">
                        <span className="mono">{l.domain}</span>
                        {o.lines.length > 1 || l.state !== "registered" ? <LineBadge state={l.state} /> : null}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="num"><Total o={o} /></td>
                <td>
                  <div style={{ display: "flex", gap: "var(--space-2xs)", flexWrap: "wrap", alignItems: "center" }}>
                    <StatusBadge status={o.status} />
                    {showTest && o.test_mode ? <TestTag /> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="adm-cards">
        {orders.map((o) => (
          <Link key={o.id} href={href(o.id)} className="adm-card-row">
            <div className="adm-card-top">
              <div style={{ minWidth: 0 }}>
                <div className="strong">{o.name || o.email}</div>
                <div className="mono quiet">{o.id}</div>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div className="adm-domains">
              {o.lines.map((l) => <span key={l.domain} className="mono" style={{ overflowWrap: "anywhere" }}>{l.domain}</span>)}
            </div>
            <div className="adm-card-meta">
              <span className="tnum">{money(o.subtotal_cents, o.currency)}</span>
              <span>{ago(o.created_at)}</span>
              {showTest && o.test_mode ? <TestTag /> : null}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

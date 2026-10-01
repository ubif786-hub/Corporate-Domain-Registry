"use client";

import Link from "next/link";
import { useApi } from "../../lib/api";
import { ago, country, day, money, plural, when } from "../../lib/format";
import type { CustomerList, MoneyByCurrency } from "../../lib/types";
import { Empty, ErrorNotice, PageHead, Pager, Panel, qs, SearchBox, SkelRows, useQueryState } from "../../ui/bits";

const KEYS = ["q", "page"] as const;

function Spent({ spent }: { spent: MoneyByCurrency }) {
  const parts = [spent.usd ? money(spent.usd, "usd") : "", spent.cad ? money(spent.cad, "cad") : ""].filter(Boolean);
  return <>{parts.length ? parts.map((p) => <span key={p} style={{ display: "block" }}>{p}</span>) : <span className="muted">Nothing charged</span>}</>;
}

export function CustomersView() {
  const [f, set, ready] = useQueryState(KEYS);
  const page = Math.max(1, Number(f.page) || 1);
  const { data, error, loading, reload } = useApi<CustomerList>(ready ? "/customers" + qs({ q: f.q, page: page > 1 ? page : undefined }) : null);

  return (
    <>
      <PageHead title="Customers" intro="One row per email address, with everything they have ordered. Details are from their latest order." />
      <ErrorNotice error={error} onRetry={reload} />
      <Panel>
        <div className="adm-toolbar" role="search">
          <SearchBox label="Search customers" placeholder="Name, email, organisation or phone" value={f.q} onChange={(q) => set({ q, page: null })} />
        </div>

        {loading && !data ? <SkelRows rows={8} label="Loading customers" /> : null}
        {data && !data.rows.length ? (
          f.q
            ? <Empty title="No customers match">Try part of the name or the email address.</Empty>
            : <Empty title="No customers yet">Everyone who completes a paid order appears here.</Empty>
        ) : null}

        {data?.rows.length ? (
          <div aria-busy={loading} style={{ opacity: loading ? 0.6 : 1 }}>
            <div className="adm-table-wrap" data-cards="">
              <table className="adm-table">
                <caption className="sr-only">Customers</caption>
                <thead>
                  <tr>
                    <th scope="col">Customer</th>
                    <th scope="col">Contact</th>
                    <th scope="col" className="num">Orders</th>
                    <th scope="col" className="num">Domains</th>
                    <th scope="col" className="num">Charged</th>
                    <th scope="col">Latest order</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((c) => (
                    <tr key={c.email}>
                      <td>
                        <span className="strong">{c.name || c.email}</span>
                        {c.org ? <span className="adm-cell-sub">{c.org}</span> : null}
                        <span className="adm-cell-sub">{country(c.country)}</span>
                      </td>
                      <td>
                        <a href={`mailto:${c.email}`} style={{ overflowWrap: "anywhere" }}>{c.email}</a>
                        <span className="adm-cell-sub">{c.phone}</span>
                      </td>
                      <td className="num">{c.orders}</td>
                      <td className="num">{c.domains}</td>
                      <td className="num"><Spent spent={c.spent} /></td>
                      <td className="nowrap">
                        <Link href={`/admin/orders/view/?id=${c.last_order_id}`} className="row-link" title={when(c.last_order)}>{ago(c.last_order)}</Link>
                        <span className="adm-cell-sub">First {day(c.first_order)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="adm-cards">
              {data.rows.map((c) => (
                <Link key={c.email} href={`/admin/orders/view/?id=${c.last_order_id}`} className="adm-card-row">
                  <div className="adm-card-top">
                    <div style={{ minWidth: 0 }}>
                      <div className="strong">{c.name || c.email}</div>
                      <div className="quiet" style={{ overflowWrap: "anywhere" }}>{c.email}</div>
                    </div>
                  </div>
                  <div className="adm-card-meta">
                    <span>{plural(c.orders, "order")}</span>
                    <span>{plural(c.domains, "domain")}</span>
                    <span>Latest {ago(c.last_order)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {data ? <Pager page={data.page} pages={data.pages} total={data.total} noun={["customer", "customers"]} onPage={(p) => set({ page: p > 1 ? String(p) : null })} /> : null}
      </Panel>
    </>
  );
}

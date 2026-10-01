"use client";

import { Download } from "@carbon/icons-react";
import { useApi } from "../../lib/api";
import type { OrderList } from "../../lib/types";
import { statusWording, UNPAID_STATUSES } from "../../lib/words";
import { Empty, ErrorNotice, PageHead, Pager, Panel, qs, SearchBox, SkelRows, useQueryState } from "../../ui/bits";
import { OrdersTable } from "../../ui/OrdersTable";

const KEYS = ["q", "status", "all", "page"] as const;

export function OrdersView() {
  const [f, set, ready] = useQueryState(KEYS);
  const page = Math.max(1, Number(f.page) || 1);
  const path = ready ? "/orders" + qs({ q: f.q, status: f.status, all: f.all === "1" ? "1" : undefined, page: page > 1 ? page : undefined }) : null;
  const { data, error, loading, reload } = useApi<OrderList>(path);
  const filtered = Boolean(f.q || f.status);

  const statuses = (data?.statuses ?? []).filter((s) => f.all === "1" || f.status === s || !UNPAID_STATUSES.includes(s));

  return (
    <>
      <PageHead
        title="Orders"
        intro="Every paid order, newest first. Search by order number, name, email, organisation or domain."
        actions={
          <a className="adm-chip" href="/api/admin/export.csv" download>
            <Download size={16} aria-hidden="true" /> Download all (CSV)
          </a>
        }
      />
      <ErrorNotice error={error} onRetry={reload} />
      <Panel>
        <div className="adm-toolbar" role="search">
          <SearchBox label="Search orders" placeholder="Name, email, domain or order number" value={f.q} onChange={(q) => set({ q, page: null })} />
          <div>
            <label className="adm-filter-label" htmlFor="adm-status">Status</label>
            <select id="adm-status" className="adm-select" value={f.status} onChange={(e) => set({ status: e.target.value, page: null })}>
              <option value="">Any status</option>
              {statuses.map((s) => <option key={s} value={s}>{statusWording(s).label}</option>)}
            </select>
          </div>
          <label className="adm-check">
            <input type="checkbox" checked={f.all === "1"} onChange={(e) => set({ all: e.target.checked ? "1" : null, page: null })} />
            Include unpaid checkouts
          </label>
        </div>

        {loading && !data ? <SkelRows rows={8} label="Loading orders" /> : null}
        {data && !data.orders.length ? (
          filtered
            ? <Empty title="No orders match">Try fewer words, or clear the status filter.</Empty>
            : <Empty title="No orders yet">Paid orders appear here as soon as a customer completes the payment page. Tick &ldquo;Include unpaid checkouts&rdquo; to see visitors who opened the payment page and left.</Empty>
        ) : null}
        {data?.orders.length ? (
          <div aria-busy={loading} style={{ opacity: loading ? 0.6 : 1 }}>
            <OrdersTable orders={data.orders} caption="Orders" />
          </div>
        ) : null}
        {data ? <Pager page={data.page} pages={data.pages} total={data.total} noun={["order", "orders"]} onPage={(p) => set({ page: p > 1 ? String(p) : null })} /> : null}
      </Panel>
    </>
  );
}

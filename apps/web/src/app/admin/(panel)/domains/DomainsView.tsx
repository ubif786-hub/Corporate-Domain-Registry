"use client";

import Link from "next/link";
import { useApi } from "../../lib/api";
import { day, money, when, years } from "../../lib/format";
import type { DomainList } from "../../lib/types";
import { FAIL_REASON, lineWording } from "../../lib/words";
import { Empty, ErrorNotice, LineBadge, PageHead, Pager, Panel, qs, SearchBox, SkelRows, TestTag, useQueryState } from "../../ui/bits";

const KEYS = ["q", "state", "page"] as const;
const STATES = ["registered", "pending", "failed", "unknown", "registering", "new"];

export function DomainsView() {
  const [f, set, ready] = useQueryState(KEYS);
  const page = Math.max(1, Number(f.page) || 1);
  const { data, error, loading, reload } = useApi<DomainList>(ready ? "/domains" + qs({ q: f.q, state: f.state, page: page > 1 ? page : undefined }) : null);
  const counts = data?.counts ?? {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const shown = STATES.filter((s) => counts[s] || f.state === s);

  return (
    <>
      <PageHead title="Domains" intro="Every domain in a paid order, and what happened to it at Tucows." />
      <ErrorNotice error={error} onRetry={reload} />
      <Panel>
        <div className="adm-toolbar" role="search">
          <SearchBox label="Search domains" placeholder="Domain, customer, order or Tucows number" value={f.q} onChange={(q) => set({ q, page: null })} />
          <div>
            <span className="adm-filter-label" id="adm-state-label">Result</span>
            <div className="adm-segments" role="group" aria-labelledby="adm-state-label">
              <button type="button" className="adm-segment" aria-pressed={!f.state} onClick={() => set({ state: null, page: null })}>
                All <span className="mono">{all}</span>
              </button>
              {shown.map((s) => (
                <button key={s} type="button" className="adm-segment" aria-pressed={f.state === s} onClick={() => set({ state: s, page: null })}>
                  {lineWording(s).label} <span className="mono">{counts[s] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && !data ? <SkelRows rows={8} label="Loading domains" /> : null}
        {data && !data.rows.length ? (
          f.q || f.state
            ? <Empty title="No domains match">Try fewer words, or show all results.</Empty>
            : <Empty title="No domains yet">Each domain from a paid order appears here with its registration result.</Empty>
        ) : null}

        {data?.rows.length ? (
          <div aria-busy={loading} style={{ opacity: loading ? 0.6 : 1 }}>
            <div className="adm-table-wrap" data-cards="">
              <table className="adm-table">
                <caption className="sr-only">Domains</caption>
                <thead>
                  <tr>
                    <th scope="col">Domain</th>
                    <th scope="col">Result</th>
                    <th scope="col">Years</th>
                    <th scope="col" className="num">Price</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={`${r.order_id}-${r.domain}`}>
                      <td className="dom">
                        <span className="mono strong">{r.domain}</span>
                        {r.service === "renew" ? <span className="adm-cell-sub">Renewal</span> : null}
                        {r.tucows_order ? <span className="adm-cell-sub">Tucows <span className="mono">{r.tucows_order}</span></span> : null}
                      </td>
                      <td>
                        <LineBadge state={r.state} service={r.service} />
                        {r.reason ? <span className="adm-cell-sub">{FAIL_REASON[r.reason] ?? r.reason}</span> : null}
                        {r.registered_at ? <span className="adm-cell-sub" title={when(r.registered_at)}>{day(r.registered_at)}</span> : null}
                        {r.state === "registered" && r.expires_at ? <span className="adm-cell-sub">Expires {day(r.expires_at)}</span> : null}
                      </td>
                      <td className="nowrap">{years(r.term)}</td>
                      <td className="num">{money(r.amount_cents, r.currency)}</td>
                      <td>
                        {r.name}
                        <span className="adm-cell-sub">{r.email}</span>
                      </td>
                      <td className="nowrap">
                        <Link href={`/admin/orders/view/?id=${r.order_id}`} className="row-link mono">{r.order_id}</Link>
                        <span className="adm-cell-sub">{day(r.ordered_at)} {r.test_mode ? <TestTag /> : null}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="adm-cards">
              {data.rows.map((r) => (
                <Link key={`${r.order_id}-${r.domain}`} href={`/admin/orders/view/?id=${r.order_id}`} className="adm-card-row">
                  <div className="adm-card-top">
                    <span className="mono strong" style={{ overflowWrap: "anywhere", minWidth: 0 }}>{r.domain}</span>
                    <LineBadge state={r.state} service={r.service} />
                  </div>
                  <div className="adm-card-meta">
                    <span>{r.name}</span>
                    <span>{years(r.term)}</span>
                    <span className="tnum">{money(r.amount_cents, r.currency)}</span>
                    <span>{day(r.registered_at ?? r.ordered_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {data ? <Pager page={data.page} pages={data.pages} total={data.total} noun={["domain", "domains"]} onPage={(p) => set({ page: p > 1 ? String(p) : null })} /> : null}
      </Panel>
    </>
  );
}

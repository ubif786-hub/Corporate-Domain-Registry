"use client";

import Link from "next/link";
import { ArrowRight, Download, Information } from "@carbon/icons-react";
import { useApi } from "../lib/api";
import { ago, money, plural, shortDay, when } from "../lib/format";
import { useSession } from "../lib/session";
import type { Balance, Overview } from "../lib/types";
import { Empty, ErrorNotice, PageHead, Panel, Skel, SkelRows, StatusBadge } from "../ui/bits";
import { OrdersTable } from "../ui/OrdersTable";
import { SalesReportPanel } from "./SalesReport";

function compare(now: number, before: number): string {
  if (before === 0) return now === 0 ? "None the 30 days before either" : "None the 30 days before";
  const diff = now - before;
  if (diff === 0) return "Same as the 30 days before";
  return `${diff > 0 ? "+" : ""}${diff} on the 30 days before`;
}

function Figures({ o }: { o: Overview }) {
  const usd = o.revenue.last30.usd;
  const cad = o.revenue.last30.cad;
  return (
    <section className="adm-panel adm-figures" aria-label="The last 30 days">
      <div className="adm-figure">
        <span className="adm-figure-label">Orders, 30 days</span>
        <span className="adm-figure-value">{o.orders.last30.toLocaleString("en-US")}</span>
        <span className="adm-figure-note">{o.orders.today ? `${o.orders.today} today. ` : ""}{compare(o.orders.last30, o.orders.prev30)}</span>
      </div>
      <div className="adm-figure">
        <span className="adm-figure-label">Charged, 30 days</span>
        <span className="adm-figure-value">{money(usd, "usd").replace(" USD", "")}<span className="quiet"> USD</span></span>
        <span className="adm-figure-note">{cad ? `Plus ${money(cad, "cad")}` : "No sales in CAD"}</span>
      </div>
      <div className="adm-figure">
        <span className="adm-figure-label">Registered, 30 days</span>
        <span className="adm-figure-value">{o.domains.last30.toLocaleString("en-US")}</span>
        <span className="adm-figure-note">
          {o.domains.failed30 ? `${plural(o.domains.failed30, "domain")} could not be registered` : `${o.domains.all.toLocaleString("en-US")} since the shop opened`}
        </span>
      </div>
      <div className="adm-figure">
        <span className="adm-figure-label">In progress</span>
        <span className="adm-figure-value">{o.waiting.toLocaleString("en-US")}</span>
        <span className="adm-figure-note">Card on hold, registering, or waiting on the registry</span>
      </div>
    </section>
  );
}

function DayChart({ daily }: { daily: Overview["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.orders));
  const W = 600;
  const H = 160;
  const slot = W / daily.length;
  const total = daily.reduce((n, d) => n + d.orders, 0);
  const busiest = daily.reduce((b, d) => (d.orders > b.orders ? d : b), daily[0]);
  return (
    <div className="adm-panel-body">
      <svg className="adm-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={total ? `${plural(total, "order")} in the last 30 days. The busiest day was ${shortDay(busiest.day)} with ${busiest.orders}.` : "No orders in the last 30 days."}>
        <line className="grid" x1="0" x2={W} y1="0.5" y2="0.5" />
        <line className="grid" x1="0" x2={W} y1={H / 2} y2={H / 2} />
        <line className="grid" x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} />
        {daily.map((d, i) => {
          const h = d.orders ? Math.max(3, (d.orders / max) * (H - 8)) : 2;
          return (
            <rect key={d.day} className={d.orders ? "bar" : "bar-zero"} x={i * slot + slot * 0.18} width={slot * 0.64} y={H - h} height={h}>
              <title>{`${shortDay(d.day)}: ${plural(d.orders, "order")}, ${plural(d.domains, "domain")} registered`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="adm-chart-legend">
        <span>{shortDay(daily[0].day)}</span>
        <span>{total ? `Most in a day: ${max}` : "No orders yet"}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function Attention({ o }: { o: Overview }) {
  if (!o.attention.length) {
    return <Empty title="Nothing needs you">Orders that fail, stall or need a decision show up here.</Empty>;
  }
  return (
    <ul className="adm-list">
      {o.attention.map((a) => (
        <li key={a.id}>
          <Link href={`/admin/orders/view/?id=${a.id}`} className="adm-list-link">
            <span style={{ minWidth: 0 }}>
              <span className="strong" style={{ display: "block" }}>{a.name || "No name"}</span>
              <span className="quiet"><span title={when(a.created_at)}>{a.reason === "stuck" ? `Stalled, ordered ${ago(a.created_at)}` : `Ordered ${ago(a.created_at)}`}</span></span>
            </span>
            <StatusBadge status={a.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function DashboardView() {
  const { me } = useSession();
  const { data, error, loading, reload } = useApi<Overview>("/overview");
  const balance = useApi<Balance>("/balance").data;
  const low = balance?.balance_usd != null && balance.balance_usd < balance.alert_below_usd;
  const first = me?.user.name.split(" ")[0];

  return (
    <>
      <PageHead
        title="Dashboard"
        intro={first ? `Welcome back, ${first}. The shop over the last 30 days, in your time zone.` : "The shop over the last 30 days, in your time zone."}
        actions={
          <a className="adm-chip" href="/api/admin/export.csv" download>
            <Download size={16} aria-hidden="true" /> Download orders (CSV)
          </a>
        }
      />

      {data?.test_mode ? (
        <div className="adm-notice" data-tone="warning">
          <Information size={16} aria-hidden="true" />
          <p>Payments are in test mode. Only test cards work and no money moves, so these figures count test orders.</p>
        </div>
      ) : null}

      {balance ? (
        <div className="adm-notice" data-tone={low || balance.balance_usd === null ? "warning" : undefined}>
          <Information size={16} aria-hidden="true" />
          <p>
            {balance.balance_usd === null
              ? "The Tucows balance could not be read just now."
              : `Tucows balance${balance.env === "test" ? " (test system)" : ""}: ${money(Math.round(balance.balance_usd * 100), "usd")}.`}
            {low ? ` Below ${money(balance.alert_below_usd * 100, "usd")}: add funds in the Tucows panel, or new orders go on hold.` : ""}
          </p>
        </div>
      ) : null}

      <ErrorNotice error={error} onRetry={reload} />

      {data ? <Figures o={data} /> : (
        <section className="adm-panel adm-figures" aria-busy="true" aria-label="Loading the figures">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="adm-figure"><Skel width="60%" /><Skel width="45%" size="lg" /><Skel width="80%" /></div>
          ))}
        </section>
      )}

      <div className="adm-split">
        <Panel title="Orders per day" id="chart">
          {data ? <DayChart daily={data.daily} /> : <SkelRows rows={4} label="Loading the chart" />}
        </Panel>
        <Panel title={data?.attention.length ? `Needs attention (${data.attention.length})` : "Needs attention"} id="attention">
          {data ? <Attention o={data} /> : <SkelRows rows={3} label="Loading" />}
        </Panel>
      </div>

      <SalesReportPanel />

      <Panel title="Latest orders" id="latest" action={<Link href="/admin/orders/" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2xs)" }}>All orders <ArrowRight size={16} aria-hidden="true" /></Link>}>
        {loading && !data ? <SkelRows rows={5} label="Loading orders" /> : null}
        {data && !data.recent.length ? (
          <Empty title="No orders yet">Paid orders appear here as soon as a customer completes the payment page.</Empty>
        ) : null}
        {data?.recent.length ? <OrdersTable orders={data.recent} caption="The latest orders" showTest={false} /> : null}
      </Panel>
    </>
  );
}

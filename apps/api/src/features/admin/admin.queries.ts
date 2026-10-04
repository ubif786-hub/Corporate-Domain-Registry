// What the admin screens show, read straight from the order tables.
//
// "Paid" below means every order except the checkouts nobody paid for (UNPAID). Money is what
// Stripe actually captured (stripe.amount_captured), in each order's own currency: USD and CAD are
// never added together.

import { sql, type SQL } from "drizzle-orm";
import type { OrderStatus } from "@cdr/shared";
import { db } from "../../core/db";
import type { Order } from "../orders/order.types";

export const UNPAID: readonly OrderStatus[] = ["pending_payment", "expired", "stripe_error"];
/** A person has to look at these. */
export const NEEDS_ACTION: readonly OrderStatus[] = ["needs_review", "settle_error", "amount_mismatch"];
/** Paid and still moving; listed when they have been moving for too long. */
const IN_FLIGHT: readonly OrderStatus[] = ["authorized", "fulfilling", "pending"];
const STUCK_MINUTES = 30;

const list = (values: readonly string[]) => sql.join(values.map((v) => sql`${v}`), sql`, `);

/** The row the lists show for an order: who, what, how much, what happened. */
export interface OrderSummary {
  id: string;
  status: OrderStatus;
  test_mode: boolean;
  created_at: string;
  currency: string;
  subtotal_cents: number;
  captured_cents: number | null;
  name: string;
  org: string;
  email: string;
  country: string;
  lines: { domain: string; state: string; term: number; service: string }[];
}

export function summarise(o: Order): OrderSummary {
  const r = o.registrant;
  return {
    id: o.id,
    status: o.status,
    test_mode: o.test_mode,
    created_at: o.created_at,
    currency: o.currency,
    subtotal_cents: o.subtotal_cents,
    captured_cents: o.stripe.amount_captured ?? null,
    name: `${r.first_name} ${r.last_name}`.trim(),
    org: r.org_name ?? "",
    email: r.email,
    country: r.country,
    lines: o.lines.map((l) => ({ domain: l.domain, state: l.state, term: l.term, service: l.service })),
  };
}

export interface MoneyByCurrency { usd: number; cad: number }

export interface Overview {
  /** The figures count orders in this payment mode only (test orders while Stripe is in test). */
  test_mode: boolean;
  orders: { today: number; last30: number; prev30: number };
  revenue: { last30: MoneyByCurrency; prev30: MoneyByCurrency; all: MoneyByCurrency };
  domains: { last30: number; all: number; failed30: number };
  /** One entry per UTC day, oldest first, the last 30 days including today. */
  daily: { day: string; orders: number; domains: number }[];
  attention: { id: string; status: OrderStatus; created_at: string; name: string; reason: "action" | "stuck" }[];
  waiting: number;
}

export async function overview(testMode: boolean): Promise<Overview> {
  const d = await db();
  const paid = sql`o.test_mode = ${testMode} and o.status not in (${list(UNPAID)})`;
  const captured = sql`coalesce((o.stripe->>'amount_captured')::bigint, 0)`;

  const [totals] = (await d.execute(sql`
    select
      count(*) filter (where o.created_at >= date_trunc('day', now()))::int as today,
      count(*) filter (where o.created_at >= now() - interval '30 days')::int as last30,
      count(*) filter (where o.created_at >= now() - interval '60 days' and o.created_at < now() - interval '30 days')::int as prev30,
      coalesce(sum(${captured}) filter (where o.currency = 'usd' and o.created_at >= now() - interval '30 days'), 0)::bigint as usd30,
      coalesce(sum(${captured}) filter (where o.currency = 'cad' and o.created_at >= now() - interval '30 days'), 0)::bigint as cad30,
      coalesce(sum(${captured}) filter (where o.currency = 'usd' and o.created_at >= now() - interval '60 days' and o.created_at < now() - interval '30 days'), 0)::bigint as usdprev,
      coalesce(sum(${captured}) filter (where o.currency = 'cad' and o.created_at >= now() - interval '60 days' and o.created_at < now() - interval '30 days'), 0)::bigint as cadprev,
      coalesce(sum(${captured}) filter (where o.currency = 'usd'), 0)::bigint as usdall,
      coalesce(sum(${captured}) filter (where o.currency = 'cad'), 0)::bigint as cadall
    from orders o where ${paid}`)).rows as Record<string, string | number>[];

  const [lines] = (await d.execute(sql`
    select
      count(*) filter (where l.state = 'registered' and l.registered_at >= now() - interval '30 days')::int as reg30,
      count(*) filter (where l.state = 'registered')::int as regall,
      count(*) filter (where l.state = 'failed' and o.created_at >= now() - interval '30 days')::int as failed30
    from order_lines l join orders o on o.id = l.order_id where ${paid}`)).rows as Record<string, number>[];

  const daily = (await d.execute(sql`
    with days as (
      select generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') as day
    )
    select to_char(days.day, 'YYYY-MM-DD') as day,
      (select count(*) from orders o where ${paid} and o.created_at >= days.day and o.created_at < days.day + interval '1 day')::int as orders,
      (select count(*) from order_lines l join orders o on o.id = l.order_id
        where ${paid} and l.state = 'registered' and l.registered_at >= days.day and l.registered_at < days.day + interval '1 day')::int as domains
    from days order by days.day`)).rows as { day: string; orders: number; domains: number }[];

  const attention = (await d.execute(sql`
    select o.id, o.status, o.created_at,
      trim(concat_ws(' ', o.registrant->>'first_name', o.registrant->>'last_name')) as name,
      case when o.status in (${list(NEEDS_ACTION)}) then 'action' else 'stuck' end as reason
    from orders o
    where o.test_mode = ${testMode}
      and (o.status in (${list(NEEDS_ACTION)})
        or (o.status in (${list(IN_FLIGHT)}) and o.updated_at < now() - make_interval(mins => ${STUCK_MINUTES})))
    order by o.created_at desc limit 20`)).rows as { id: string; status: OrderStatus; created_at: Date | string; name: string; reason: "action" | "stuck" }[];

  const [waiting] = (await d.execute(sql`
    select count(*)::int as n from orders o where o.test_mode = ${testMode} and o.status in (${list(IN_FLIGHT)})`)).rows as { n: number }[];

  const n = (v: unknown) => Number(v ?? 0);
  return {
    test_mode: testMode,
    orders: { today: n(totals?.today), last30: n(totals?.last30), prev30: n(totals?.prev30) },
    revenue: {
      last30: { usd: n(totals?.usd30), cad: n(totals?.cad30) },
      prev30: { usd: n(totals?.usdprev), cad: n(totals?.cadprev) },
      all: { usd: n(totals?.usdall), cad: n(totals?.cadall) },
    },
    domains: { last30: n(lines?.reg30), all: n(lines?.regall), failed30: n(lines?.failed30) },
    daily: daily.map((r) => ({ day: r.day, orders: n(r.orders), domains: n(r.domains) })),
    attention: attention.map((r) => ({ ...r, created_at: iso(r.created_at) })),
    waiting: n(waiting?.n),
  };
}

/** How many orders need a person, for the sidebar's count. */
export async function attentionCount(testMode: boolean): Promise<number> {
  const d = await db();
  const [r] = (await d.execute(sql`
    select count(*)::int as n from orders o
    where o.test_mode = ${testMode}
      and (o.status in (${list(NEEDS_ACTION)})
        or (o.status in (${list(IN_FLIGHT)}) and o.updated_at < now() - make_interval(mins => ${STUCK_MINUTES})))`)).rows as { n: number }[];
  return Number(r?.n ?? 0);
}

const iso = (v: unknown) => (v instanceof Date ? v : new Date(String(v))).toISOString();
const like = (text: string) => "%" + text.replace(/[\\%_]/g, "\\$&") + "%";

/* ---------- every domain ever ordered ---------- */

export interface DomainRow {
  domain: string;
  service: string;
  state: string;
  reason: string | null;
  term: number;
  amount_cents: number;
  currency: string;
  registered_at: string | null;
  expires_at: string | null;
  tucows_order: string | null;
  order_id: string;
  order_status: OrderStatus;
  ordered_at: string;
  test_mode: boolean;
  name: string;
  email: string;
}

export async function domains(f: { text: string; state: string; limit: number; offset: number }): Promise<{ rows: DomainRow[]; total: number; counts: Record<string, number> }> {
  const d = await db();
  const where: SQL[] = [sql`o.status not in (${list(UNPAID)})`];
  if (f.state) where.push(sql`l.state = ${f.state}`);
  if (f.text) {
    const t = like(f.text);
    where.push(sql`(l.domain ilike ${t} or o.email ilike ${t} or o.id ilike ${t}
      or concat_ws(' ', o.registrant->>'first_name', o.registrant->>'last_name') ilike ${t}
      or coalesce(l.opensrs_order_id, '') ilike ${t})`);
  }
  const cond = sql.join(where, sql` and `);
  const [{ total }] = (await d.execute(sql`select count(*)::int as total from order_lines l join orders o on o.id = l.order_id where ${cond}`)).rows as { total: number }[];
  const rows = (await d.execute(sql`
    select l.domain, l.service, l.state, l.reason, l.term, l.amount_cents, o.currency, l.registered_at, l.expires_at, l.opensrs_order_id as tucows_order,
      o.id as order_id, o.status as order_status, o.created_at as ordered_at, o.test_mode, o.email,
      trim(concat_ws(' ', o.registrant->>'first_name', o.registrant->>'last_name')) as name
    from order_lines l join orders o on o.id = l.order_id
    where ${cond}
    order by o.created_at desc, l.position
    limit ${f.limit} offset ${f.offset}`)).rows as (Omit<DomainRow, "registered_at" | "expires_at" | "ordered_at"> & { registered_at: Date | string | null; expires_at: Date | string | null; ordered_at: Date | string })[];
  const counts = (await d.execute(sql`
    select l.state, count(*)::int as n from order_lines l join orders o on o.id = l.order_id
    where o.status not in (${list(UNPAID)}) group by l.state`)).rows as { state: string; n: number }[];
  return {
    rows: rows.map((r) => ({
      ...r,
      term: Number(r.term),
      amount_cents: Number(r.amount_cents),
      registered_at: r.registered_at ? iso(r.registered_at) : null,
      expires_at: r.expires_at ? iso(r.expires_at) : null,
      ordered_at: iso(r.ordered_at),
    })),
    total: Number(total),
    counts: Object.fromEntries(counts.map((c) => [c.state, Number(c.n)])),
  };
}

/* ---------- customers, one per email ---------- */

export interface CustomerRow {
  email: string;
  name: string;
  org: string;
  country: string;
  phone: string;
  orders: number;
  domains: number;
  spent: MoneyByCurrency;
  first_order: string;
  last_order: string;
  last_order_id: string;
}

export async function customers(f: { text: string; limit: number; offset: number }): Promise<{ rows: CustomerRow[]; total: number }> {
  const d = await db();
  const where: SQL[] = [sql`o.status not in (${list(UNPAID)})`];
  if (f.text) {
    const t = like(f.text);
    where.push(sql`(o.email ilike ${t} or concat_ws(' ', o.registrant->>'first_name', o.registrant->>'last_name') ilike ${t}
      or coalesce(o.registrant->>'org_name', '') ilike ${t} or coalesce(o.registrant->>'phone', '') ilike ${t})`);
  }
  const cond = sql.join(where, sql` and `);
  const [{ total }] = (await d.execute(sql`select count(distinct lower(o.email))::int as total from orders o where ${cond}`)).rows as { total: number }[];
  const rows = (await d.execute(sql`
    with paid as (select o.* from orders o where ${cond}),
    latest as (
      select distinct on (lower(email)) lower(email) as key, email, id, created_at, registrant
      from paid order by lower(email), created_at desc
    )
    select latest.email,
      trim(concat_ws(' ', latest.registrant->>'first_name', latest.registrant->>'last_name')) as name,
      coalesce(latest.registrant->>'org_name', '') as org,
      coalesce(latest.registrant->>'country', '') as country,
      coalesce(latest.registrant->>'phone', '') as phone,
      latest.id as last_order_id,
      latest.created_at as last_order,
      (select min(p.created_at) from paid p where lower(p.email) = latest.key) as first_order,
      (select count(*) from paid p where lower(p.email) = latest.key)::int as orders,
      (select count(*) from order_lines l join paid p on p.id = l.order_id where lower(p.email) = latest.key and l.state = 'registered')::int as domains,
      (select coalesce(sum((p.stripe->>'amount_captured')::bigint), 0) from paid p where lower(p.email) = latest.key and p.currency = 'usd')::bigint as usd,
      (select coalesce(sum((p.stripe->>'amount_captured')::bigint), 0) from paid p where lower(p.email) = latest.key and p.currency = 'cad')::bigint as cad
    from latest
    order by latest.created_at desc
    limit ${f.limit} offset ${f.offset}`)).rows as Record<string, unknown>[];
  return {
    rows: rows.map((r) => ({
      email: String(r.email),
      name: String(r.name ?? ""),
      org: String(r.org ?? ""),
      country: String(r.country ?? ""),
      phone: String(r.phone ?? ""),
      orders: Number(r.orders),
      domains: Number(r.domains),
      spent: { usd: Number(r.usd), cad: Number(r.cad) },
      first_order: iso(r.first_order),
      last_order: iso(r.last_order),
      last_order_id: String(r.last_order_id),
    })),
    total: Number(total),
  };
}

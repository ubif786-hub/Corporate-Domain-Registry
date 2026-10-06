// Orders: PostgreSQL (order.schema.ts), read and written as one Order object (order.types.ts).
//
// EVERY CHANGE IS ONE TRANSACTION (updateOrder): the order's row is locked (SELECT ... FOR UPDATE),
// the change is applied to a copy, and the order, its lines and any new history lines are written
// before the lock is released. Two requests changing the same order therefore queue up instead of
// overwriting each other, even from two processes. A change function must stay quick and must not
// call Tucows or Stripe: it runs while the row is locked.
//
// ONE DRIVER PER ORDER (withDriveLock) is a PostgreSQL advisory lock held for the whole drive; it
// is released at the end, or by the database itself if the process dies.

import { createHash, createHmac, randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, notInArray, sql, type SQL } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { OrderStatus } from "@cdr/shared";
import { config } from "../../core/config";
import { database, db } from "../../core/db";
import { dayStamp, isoNow, logStamp } from "../../core/time";
import * as schema from "./order.schema";
import { orderLines, orderLog, orders, transferCodes } from "./order.schema";
import type { Order, OrderLine } from "./order.types";

/** The database handle or an open transaction: both can run the queries below. */
type Q = PgDatabase<NodePgQueryResultHKT, typeof schema>;

const ORDER_ID = /^\d{8}-[a-f0-9]{10}$/;

export function isValidOrderId(id: unknown): id is string {
  return typeof id === "string" && ORDER_ID.test(id);
}

export function newOrderId(): string {
  return dayStamp() + "-" + randomBytes(5).toString("hex");
}

function orderSecret(): string {
  const c = config();
  return c.orderSecret !== ""
    ? c.orderSecret
    : createHash("sha256").update(`cdr-order|${c.stripeSecretKey}|${c.stripeWebhookSecret}`).digest("hex");
}

/** The token that lets the customer's browser read its own order's progress, and nobody else's. */
export function orderToken(id: string): string {
  return createHmac("sha256", orderSecret()).update(id).digest("hex").slice(0, 32);
}

/** The token in a transfer's personal code link: one per line, so it opens that domain only. */
export function transferToken(id: string, position: number): string {
  return createHmac("sha256", orderSecret()).update(`transfer|${id}|${position}`).digest("hex").slice(0, 32);
}

/* ---------- rows <-> Order ---------- */

const toDate = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

function orderRow(o: Order): typeof orders.$inferInsert {
  const now = new Date();
  return {
    id: o.id,
    status: o.status,
    testMode: o.test_mode,
    opensrsEnv: o.opensrs_env,
    currency: o.currency,
    subtotalCents: o.subtotal_cents,
    email: o.registrant?.email ?? "",
    registrant: o.registrant,
    registrantIp: o.registrant_ip ?? "",
    visitorCountry: o.visitor_country ?? null,
    agreement: o.agreement,
    stripe: o.stripe ?? {},
    stripeSessionId: o.stripe?.session_id ?? null,
    stripePaymentIntent: o.stripe?.payment_intent ?? null,
    stripeEvents: o.events ?? [],
    notifiedFinal: toDate(o.notified_final),
    settledEarly: o.settled_early === true,
    createdAt: toDate(o.created_at) ?? now,
    updatedAt: toDate(o.updated_at) ?? now,
  };
}

function lineRows(o: Order): (typeof orderLines.$inferInsert)[] {
  return o.lines.map((l, position) => ({
    orderId: o.id,
    position,
    domain: l.domain,
    service: l.service,
    label: l.label,
    term: l.term,
    amountCents: l.amount_cents,
    state: l.state,
    attempts: l.attempts ?? 0,
    attemptedAt: toDate(l.attempted_at),
    registeredAt: toDate(l.registered_at),
    expiresAt: toDate(l.expires_at),
    reason: l.reason ?? null,
    opensrs: l.opensrs ?? null,
    opensrsOrderId: l.opensrs?.order_id ?? null,
    transfer: l.transfer ?? null,
  }));
}

/** History lines are "2026-10-01 12:00:00 UTC  text" (note()); stored as the time and the text. */
const LOG_LINE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) UTC {2}([\s\S]*)$/;

function logRows(orderId: string, entries: string[]): (typeof orderLog.$inferInsert)[] {
  return entries.map((entry) => {
    const m = LOG_LINE.exec(entry);
    return m
      ? { orderId, at: new Date(`${m[1]}T${m[2]}Z`), message: m[3] }
      : { orderId, at: new Date(), message: entry };
  });
}

function lineFromRow(r: typeof orderLines.$inferSelect): OrderLine {
  const l: OrderLine = {
    domain: r.domain,
    service: r.service,
    label: r.label,
    term: r.term,
    amount_cents: r.amountCents,
    state: r.state,
    attempts: r.attempts,
  };
  if (r.attemptedAt) l.attempted_at = isoNow(r.attemptedAt);
  if (r.registeredAt) l.registered_at = isoNow(r.registeredAt);
  if (r.expiresAt) l.expires_at = isoNow(r.expiresAt);
  if (r.reason) l.reason = r.reason;
  if (r.opensrs) l.opensrs = r.opensrs;
  if (r.transfer) l.transfer = r.transfer;
  return l;
}

function assemble(r: typeof orders.$inferSelect, lines: (typeof orderLines.$inferSelect)[], log: (typeof orderLog.$inferSelect)[]): Order {
  const o: Order = {
    id: r.id,
    status: r.status,
    test_mode: r.testMode,
    opensrs_env: r.opensrsEnv,
    created_at: isoNow(r.createdAt),
    updated_at: isoNow(r.updatedAt),
    currency: r.currency,
    subtotal_cents: r.subtotalCents,
    lines: lines.map(lineFromRow),
    registrant: r.registrant,
    registrant_ip: r.registrantIp,
    visitor_country: r.visitorCountry,
    agreement: r.agreement,
    stripe: r.stripe ?? {},
    events: r.stripeEvents ?? [],
    log: log.map((e) => `${logStamp(e.at)} UTC  ${e.message}`),
  };
  if (r.notifiedFinal) o.notified_final = isoNow(r.notifiedFinal);
  if (r.settledEarly) o.settled_early = true;
  return o;
}

/** The orders with these ids, in the same order as ids. withLog false leaves the history out
 *  (lists and the CSV); such an Order is for reading only, never for writing back. */
async function load(q: Q, ids: string[], opts: { lock?: boolean; withLog?: boolean } = {}): Promise<Order[]> {
  if (!ids.length) return [];
  const base = q.select().from(orders).where(inArray(orders.id, ids));
  const rows = opts.lock ? await base.for("update") : await base;
  if (!rows.length) return [];
  const lines = await q.select().from(orderLines).where(inArray(orderLines.orderId, ids)).orderBy(asc(orderLines.orderId), asc(orderLines.position));
  const log = opts.withLog === false ? [] : await q.select().from(orderLog).where(inArray(orderLog.orderId, ids)).orderBy(asc(orderLog.id));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    return r ? [assemble(r, lines.filter((l) => l.orderId === id), log.filter((e) => e.orderId === id))] : [];
  });
}

async function writeLines(q: Q, o: Order): Promise<void> {
  await q.delete(orderLines).where(eq(orderLines.orderId, o.id));
  const rows = lineRows(o);
  if (rows.length) await q.insert(orderLines).values(rows);
}

async function appendLog(q: Q, orderId: string, entries: string[]): Promise<void> {
  if (entries.length) await q.insert(orderLog).values(logRows(orderId, entries));
}

/* ---------- reading and writing ---------- */

/** Saves a new order (checkout). */
export async function insertOrder(order: Order): Promise<void> {
  if (!isValidOrderId(order.id)) throw new Error("invalid order id");
  const d = await db();
  await d.transaction(async (tx) => {
    await tx.insert(orders).values(orderRow(order));
    await writeLines(tx, order);
    await appendLog(tx, order.id, order.log ?? []);
  });
}

/** One order as it stands, or null. */
export async function readOrder(id: string): Promise<Order | null> {
  if (!isValidOrderId(id)) return null;
  const d = await db();
  const found = await d.transaction((tx) => load(tx, [id]), { isolationLevel: "repeatable read", accessMode: "read only" });
  return found[0] ?? null;
}

/** Reads, changes and writes one order in one transaction. change returns the new order (it may
 *  edit and return the one it was given), or null to leave it alone. Returns the order as it now
 *  stands. History lines are only ever added (note()), never edited. */
export async function updateOrder(id: string, change: (o: Order) => Order | null): Promise<Order | null> {
  if (!isValidOrderId(id)) return null;
  const d = await db();
  return d.transaction(async (tx) => {
    const [current] = await load(tx, [id], { lock: true });
    if (!current) return null;
    const next = change(structuredClone(current));
    if (next === null) return current;
    next.updated_at = isoNow();
    await tx.update(orders).set(orderRow(next)).where(eq(orders.id, id));
    await writeLines(tx, next);
    await appendLog(tx, id, next.log.slice(current.log.length));
    return next;
  });
}

/** Appends a line to the order's own history, shown on the admin page. */
export function note(order: Order, text: string): void {
  if (!Array.isArray(order.log)) order.log = [];
  order.log.push(`${logStamp()} UTC  ${text}`);
}

/* ---------- transfer codes, kept apart from the order ---------- */

export async function saveTransferCode(orderId: string, position: number, code: string): Promise<void> {
  const d = await db();
  await d.insert(transferCodes).values({ orderId, position, code })
    .onConflictDoUpdate({ target: [transferCodes.orderId, transferCodes.position], set: { code, createdAt: new Date() } });
}

export async function transferCode(orderId: string, position: number): Promise<string | null> {
  const d = await db();
  const [row] = await d.select({ code: transferCodes.code }).from(transferCodes)
    .where(and(eq(transferCodes.orderId, orderId), eq(transferCodes.position, position)));
  return row?.code ?? null;
}

export async function dropTransferCode(orderId: string, position: number): Promise<void> {
  const d = await db();
  await d.delete(transferCodes).where(and(eq(transferCodes.orderId, orderId), eq(transferCodes.position, position)));
}

/** Ids of the orders in these states, newest first (the sweep). */
export async function orderIdsWithStatus(statuses: readonly OrderStatus[]): Promise<string[]> {
  if (!statuses.length) return [];
  const d = await db();
  const rows = await d.select({ id: orders.id }).from(orders).where(inArray(orders.status, [...statuses])).orderBy(desc(orders.id));
  return rows.map((r) => r.id);
}

export interface OrderListQuery {
  /** Matches the order id, the registrant's name, organisation or email, or any domain. */
  text?: string;
  status?: string;
  /** Left out unless status asks for one of them. */
  hide?: readonly OrderStatus[];
  limit: number;
  offset: number;
}

/** A page of orders for the admin list, newest first, without their history. */
export async function listOrders(f: OrderListQuery): Promise<{ orders: Order[]; total: number; statuses: string[] }> {
  const d = await db();
  const where: SQL[] = [];
  if (f.status) where.push(sql`${orders.status} = ${f.status}`);
  else if (f.hide?.length) where.push(notInArray(orders.status, [...f.hide]));
  const text = (f.text ?? "").trim();
  if (text) {
    const like = "%" + text.replace(/[\\%_]/g, "\\$&") + "%";
    where.push(sql`(${orders.id} ilike ${like}
      or ${orders.email} ilike ${like}
      or concat_ws(' ', ${orders.registrant}->>'first_name', ${orders.registrant}->>'last_name') ilike ${like}
      or coalesce(${orders.registrant}->>'org_name', '') ilike ${like}
      or exists (select 1 from ${orderLines} where ${orderLines.orderId} = ${orders.id} and ${orderLines.domain} ilike ${like}))`);
  }
  const cond = where.length ? and(...where) : undefined;
  const [{ total }] = await d.select({ total: sql<number>`count(*)::int` }).from(orders).where(cond);
  const page = await d.select({ id: orders.id }).from(orders).where(cond)
    .orderBy(desc(orders.createdAt), desc(orders.id)).limit(f.limit).offset(f.offset);
  const statuses = await d.selectDistinct({ status: orders.status }).from(orders).orderBy(asc(orders.status));
  return {
    orders: await load(d, page.map((r) => r.id), { withLog: false }),
    total,
    statuses: statuses.map((r) => r.status),
  };
}

/** Every order except those in skip, newest first, without their history (the CSV). */
export async function ordersForExport(skip: readonly OrderStatus[]): Promise<Order[]> {
  const d = await db();
  const rows = await d.select({ id: orders.id }).from(orders)
    .where(skip.length ? notInArray(orders.status, [...skip]) : undefined)
    .orderBy(desc(orders.createdAt), desc(orders.id));
  return load(d, rows.map((r) => r.id), { withLog: false });
}

/* ---------- one driver per order ---------- */

const driving = new Set<string>();

/** Runs work unless another caller (in this process or another) is already driving this order;
 *  then answers "busy" at once. */
export async function withDriveLock<T>(id: string, work: () => Promise<T>): Promise<T | "busy"> {
  if (driving.has(id)) return "busy";
  driving.add(id);
  try {
    const { pool } = await database();
    const client = await pool.connect();
    const key = "cdr-drive:" + id;
    let broken = false;
    try {
      const got = await client.query<{ ok: boolean }>("select pg_try_advisory_lock(hashtextextended($1, 0)) as ok", [key]);
      if (!got.rows[0]?.ok) return "busy";
      try {
        return await work();
      } finally {
        // If the unlock fails, the connection is thrown away instead of going back to the pool,
        // which ends its session and so releases the lock.
        await client.query("select pg_advisory_unlock(hashtextextended($1, 0))", [key]).catch(() => { broken = true; });
      }
    } finally {
      client.release(broken);
    }
  } finally {
    driving.delete(id);
  }
}

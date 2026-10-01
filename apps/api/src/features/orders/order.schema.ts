// The orders in PostgreSQL. Three tables:
//
//   orders       one row per order: status, money, the registrant, Stripe's ids and replies
//   order_lines  one row per domain in the order, in cart order (position 0, 1, ...)
//   order_log    the order's history, one row per line shown on the admin page
//
// The application still works with one Order object (order.types.ts); order.store.ts turns rows
// into that object and back. Change a table here, then run `npm run db:generate -w @cdr/api` to
// write the migration (apps/api/drizzle/), and commit both. The API applies new migrations itself
// when it starts.

import { sql } from "drizzle-orm";
import { bigserial, boolean, check, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { CheckoutRegistrant, Currency, LineState, OrderStatus } from "@cdr/shared";
import type { FailReason, Order, OrderLine, OrderStripe } from "./order.types";

/* The allowed values, checked by the database as well as by TypeScript. The type lines below fail
   to compile if a status is added to @cdr/shared without being added here (and to a migration). */
export const ORDER_STATUSES = [
  "pending_payment", "authorized", "fulfilling", "pending", "registered", "partially_registered", "failed",
  "expired", "payment_failed", "amount_mismatch", "settle_error", "needs_review", "stripe_error",
] as const satisfies readonly OrderStatus[];
export const LINE_STATES = ["new", "registering", "registered", "pending", "failed", "unknown"] as const satisfies readonly LineState[];
const CURRENCIES = ["usd", "cad"] as const satisfies readonly Currency[];
const FAIL_REASONS = ["taken", "tucows_on_hold", "rejected", "error"] as const satisfies readonly FailReason[];
type Complete<All, Listed> = [Exclude<All, Listed>] extends [never] ? true : never;
const _statuses: Complete<OrderStatus, (typeof ORDER_STATUSES)[number]> = true;
const _states: Complete<LineState, (typeof LINE_STATES)[number]> = true;
const _reasons: Complete<FailReason, (typeof FAIL_REASONS)[number]> = true;
void _statuses; void _states; void _reasons;

const oneOf = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  status: text("status").$type<OrderStatus>().notNull(),
  testMode: boolean("test_mode").notNull(),
  opensrsEnv: text("opensrs_env").$type<"test" | "live">().notNull(),
  currency: text("currency").$type<Currency>().notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  /** The registrant's email, copied out of `registrant` for searching. */
  email: text("email").notNull(),
  registrant: jsonb("registrant").$type<CheckoutRegistrant>().notNull(),
  registrantIp: text("registrant_ip").notNull().default(""),
  visitorCountry: text("visitor_country"),
  agreement: jsonb("agreement").$type<Order["agreement"]>().notNull(),
  stripe: jsonb("stripe").$type<OrderStripe>().notNull().default({}),
  /** Copied out of `stripe` for lookups. */
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntent: text("stripe_payment_intent"),
  /** Stripe event ids already applied, so a redelivered webhook is a no-op. */
  stripeEvents: text("stripe_events").array().notNull().default(sql`'{}'::text[]`),
  notifiedFinal: ts("notified_final"),
  settledEarly: boolean("settled_early").notNull().default(false),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
}, (t) => [
  check("orders_id_format", sql`${t.id} ~ '^[0-9]{8}-[a-f0-9]{10}$'`),
  check("orders_status_valid", sql`${t.status} in (${oneOf(ORDER_STATUSES)})`),
  check("orders_currency_valid", sql`${t.currency} in (${oneOf(CURRENCIES)})`),
  check("orders_opensrs_env_valid", sql`${t.opensrsEnv} in ('test', 'live')`),
  check("orders_subtotal_not_negative", sql`${t.subtotalCents} >= 0`),
  index("orders_status_idx").on(t.status),
  index("orders_created_idx").on(t.createdAt),
  index("orders_email_idx").on(sql`lower(${t.email})`),
  uniqueIndex("orders_stripe_session_idx").on(t.stripeSessionId),
  index("orders_payment_intent_idx").on(t.stripePaymentIntent),
]);

export const orderLines = pgTable("order_lines", {
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  position: smallint("position").notNull(),
  domain: text("domain").notNull(),
  service: text("service").$type<"register">().notNull(),
  label: text("label").notNull(),
  term: smallint("term").notNull(),
  amountCents: integer("amount_cents").notNull(),
  state: text("state").$type<LineState>().notNull(),
  attempts: smallint("attempts").notNull().default(0),
  attemptedAt: ts("attempted_at"),
  registeredAt: ts("registered_at"),
  reason: text("reason").$type<FailReason>(),
  /** Tucows' reply: order id, domain id, response code and text, the generated profile name. */
  opensrs: jsonb("opensrs").$type<NonNullable<OrderLine["opensrs"]>>(),
  /** Copied out of `opensrs` for lookups. */
  opensrsOrderId: text("opensrs_order_id"),
}, (t) => [
  primaryKey({ columns: [t.orderId, t.position] }),
  check("order_lines_state_valid", sql`${t.state} in (${oneOf(LINE_STATES)})`),
  check("order_lines_reason_valid", sql`${t.reason} is null or ${t.reason} in (${oneOf(FAIL_REASONS)})`),
  check("order_lines_term_valid", sql`${t.term} between 1 and 10`),
  check("order_lines_amount_not_negative", sql`${t.amountCents} >= 0`),
  index("order_lines_domain_idx").on(sql`lower(${t.domain})`),
  index("order_lines_opensrs_order_idx").on(t.opensrsOrderId),
]);

export const orderLog = pgTable("order_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  at: ts("at").notNull().defaultNow(),
  message: text("message").notNull(),
}, (t) => [index("order_log_order_idx").on(t.orderId, t.id)]);

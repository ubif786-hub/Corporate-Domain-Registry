// Orders: one JSON file each in ORDERS_DIR, outside the web root, readable only by the API's user.
//
// EVERY CHANGE IS ONE SYNCHRONOUS READ-CHANGE-WRITE (updateOrder). Node runs one piece of
// JavaScript at a time, so two requests touching the same order cannot interleave inside it, and
// the write is atomic (a temporary file renamed over the old one). This holds because ONE API
// process serves the site; do not run two.

import { createHash, createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "../../core/config";
import { HttpError } from "../../core/http";
import { dayStamp, isoNow, logStamp } from "../../core/time";
import type { Order } from "./order.types";

export function ordersDir(): string {
  const dir = config().ordersDir;
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    } catch {
      throw new HttpError(500, "storage", "The order store could not be created.");
    }
  }
  return dir;
}

const ORDER_ID = /^\d{8}-[a-f0-9]{10}$/;

export function isValidOrderId(id: unknown): id is string {
  return typeof id === "string" && ORDER_ID.test(id);
}

export function newOrderId(): string {
  return dayStamp() + "-" + randomBytes(5).toString("hex");
}

function orderPath(id: string): string | null {
  return isValidOrderId(id) ? join(ordersDir(), id + ".json") : null;
}

/** The token that lets the customer's browser read its own order's progress, and nobody else's. */
export function orderToken(id: string): string {
  const c = config();
  const secret = c.orderSecret !== ""
    ? c.orderSecret
    : createHash("sha256").update(`cdr-order|${c.stripeSecretKey}|${c.stripeWebhookSecret}`).digest("hex");
  return createHmac("sha256", secret).update(id).digest("hex").slice(0, 32);
}

export function writeOrder(order: Order): void {
  const path = orderPath(order.id);
  if (!path) throw new Error("invalid order id");
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(order, null, 4), { mode: 0o600 });
  renameSync(tmp, path);
}

export function readOrder(id: string): Order | null {
  const path = orderPath(id);
  if (!path || !existsSync(path)) return null;
  try {
    const o = JSON.parse(readFileSync(path, "utf8"));
    return o && typeof o === "object" ? (o as Order) : null;
  } catch {
    return null;
  }
}

/** Reads, changes and writes one order in one go. change returns the new order (it may edit and
 *  return the one it was given), or null to leave it alone. Returns the order as it now stands. */
export function updateOrder(id: string, change: (o: Order) => Order | null): Order | null {
  const order = readOrder(id);
  if (!order) return null;
  const next = change(structuredClone(order));
  if (next === null) return order;
  next.updated_at = isoNow();
  writeOrder(next);
  return next;
}

/** Appends a line to the order's own history, shown on the admin page. */
export function note(order: Order, text: string): void {
  if (!Array.isArray(order.log)) order.log = [];
  order.log.push(`${logStamp()} UTC  ${text}`);
}

/** Every order id, newest first. */
export function orderIds(): string[] {
  return readdirSync(ordersDir())
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .filter(isValidOrderId)
    .sort()
    .reverse();
}

/* ---------- one driver per order ---------- */

const driving = new Set<string>();

/** Runs work unless another caller is already driving this order; then answers "busy" at once. */
export async function withDriveLock<T>(id: string, work: () => Promise<T>): Promise<T | "busy"> {
  if (driving.has(id)) return "busy";
  driving.add(id);
  try {
    return await work();
  } finally {
    driving.delete(id);
  }
}

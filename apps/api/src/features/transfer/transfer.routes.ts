// The personal link in a transfer email: /transfer-code/?order=<id>&line=<n>&t=<token>.
//
//   GET  /api/transfer-code/?order=&line=&t=           what the code page shows
//   POST /api/transfer-code/  {order, line, t, code}   the customer's code
//
// The token is per line (order.store.ts transferToken), so a link opens one domain of one order.
// The code is kept in its own table, never in the order, and the transfer is sent right after the
// reply (one driver per order, so a double submit sends it once).

import { timingSafeEqual } from "node:crypto";
import express, { Router, type Request } from "express";
import type { TransferCodeResponse } from "@cdr/shared";
import { config, requireConfig } from "../../core/config";
import { afterReply, allow, HttpError, sendJson } from "../../core/http";
import { rateLimited } from "../../core/rate-limit";
import { isoNow, toUnix } from "../../core/time";
import { visitorIp } from "../../core/visitor";
import { DRIVABLE, fulfil } from "../orders/fulfilment.service";
import { isValidOrderId, note, readOrder, saveTransferCode, transferToken, updateOrder } from "../orders/order.store";
import type { Order, OrderLine } from "../orders/order.types";

const sameToken = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** The order and its transfer line the link points at, or a 404 that says nothing more. */
async function linked(q: Record<string, unknown>): Promise<{ order: Order; i: number; line: OrderLine }> {
  const id = typeof q.order === "string" ? q.order : "";
  const i = Number(q.line);
  const token = typeof q.t === "string" ? q.t : "";
  const missing = new HttpError(404, "not_found", "This link is not valid. Use the link in your email.");
  if (!isValidOrderId(id) || !Number.isInteger(i) || i < 0 || !sameToken(transferToken(id, i), token)) throw missing;
  const order = await readOrder(id);
  const line = order?.lines[i];
  if (!order || !line || line.service !== "transfer") throw missing;
  return { order, i, line };
}

function view(order: Order, line: OrderLine): TransferCodeResponse {
  const out: TransferCodeResponse = {
    domain: line.domain,
    status: line.state === "awaiting_code" ? "awaiting_code" : line.state === "registered" ? "transferred" : line.state === "failed" ? "closed" : "received",
  };
  if (line.state === "awaiting_code" && line.transfer?.last_error) out.last_error = line.transfer.last_error;
  const paid = toUnix(order.stripe.authorized_at ?? "");
  if (line.state === "awaiting_code" && paid !== null) out.refund_after = isoNow(new Date((paid + config().transferCodeDays * 86_400) * 1000));
  return out;
}

export const transferRouter = Router();

transferRouter.all("/api/transfer-code", allow("GET", "POST"), express.json({ limit: "4kb", type: () => true }), async (req: Request, res) => {
  requireConfig(["stripeSecretKey", "opensrsUsername", "opensrsApiKey"]);
  if (rateLimited("transfer-code", visitorIp(req), 30, 600)) throw new HttpError(429, "too_many", "Too many attempts. Wait a few minutes and try again.");
  if (req.method === "GET") {
    const { order, line } = await linked(req.query);
    return sendJson(res, 200, view(order, line));
  }

  const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
  const { order, i, line } = await linked(body);
  // Registry codes are printable ASCII without spaces (EPP authInfo), up to 32 characters at most
  // registries; a little more is allowed.
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^[\x21-\x7E]{4,64}$/.test(code)) throw new HttpError(422, "invalid", "Enter the transfer code exactly as your current company gave it.", { fields: { code: "Check the code." } });
  if (!DRIVABLE.includes(order.status)) throw new HttpError(409, "not_paid", "We have not received the payment for this order yet.");
  if (line.state !== "awaiting_code") {
    const why = line.state === "registered" ? "This domain has already moved to us." : line.state === "failed" ? "This transfer is closed." : "We already have a code for this domain and are using it.";
    throw new HttpError(409, "not_waiting", why);
  }

  await saveTransferCode(order.id, i, code);
  const updated = await updateOrder(order.id, (o) => {
    if (o.lines[i]?.state !== "awaiting_code") return null;
    o.lines[i].state = "new";
    note(o, `${o.lines[i].domain}: the customer sent a transfer code.`);
    return o;
  });
  const now = updated?.lines[i];
  if (!updated || !now) throw new HttpError(404, "not_found", "This link is not valid. Use the link in your email.");
  sendJson(res, 200, view(updated, now));
  afterReply("transfer " + order.id, () => fulfil(order.id, 20));
});

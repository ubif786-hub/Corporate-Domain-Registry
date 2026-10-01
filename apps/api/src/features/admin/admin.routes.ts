// /api/admin/ — CDR's own record of every order, and a CSV of it.
//
// Signed in with ADMIN_TOKEN from the settings file (typed once into the form; the browser then
// holds a cookie derived from it, never the token itself). Nothing here is linked from the site
// and the page asks search engines to stay away.
//
//   /api/admin/                     the orders, newest first, 100 a page (filter by text or status)
//   /api/admin/?order=<id>          one order in full, with its history
//   /api/admin/?order=<id>&format=json   the same order as JSON
//   /api/admin/?format=csv          one row per domain, for a spreadsheet
//   /api/admin/?balance=1           adds the Tucows balance to the header line

import { createHmac, timingSafeEqual } from "node:crypto";
import express, { Router, type Request, type Response } from "express";
import { config, isTestMode } from "../../core/config";
import { allow } from "../../core/http";
import { rateLimited } from "../../core/rate-limit";
import { visitorIp } from "../../core/visitor";
import { balance } from "../../integrations/opensrs/client";
import { DRIVABLE, fulfil } from "../orders/fulfilment.service";
import type { OrderStatus } from "@cdr/shared";
import { isValidOrderId, listOrders, ordersForExport, readOrder } from "../orders/order.store";
import { ordersCsv } from "./admin.csv";
import { headerLine, listPage, orderPage, page, signInPage } from "./admin.views";

const COOKIE = "cdr_admin";
const SELF = "/api/admin/";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const str = (v: unknown) => (typeof v === "string" ? v : "");

function readCookie(req: Request, name: string): string {
  for (const part of (req.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}

function secure(res: Response): void {
  res.set({
    "X-Robots-Tag": "noindex, nofollow",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "Cache-Control": "no-store",
  });
}

/** Checkouts that were never paid: hidden from the list unless asked for, never in the CSV. */
const UNPAID: readonly OrderStatus[] = ["pending_payment", "expired", "stripe_error"];
const PAGE_SIZE = 100;

export const adminRouter = Router();

adminRouter.all("/api/admin", allow("GET", "POST"), express.urlencoded({ extended: false, limit: "16kb" }), async (req, res) => {
  secure(res);
  const c = config();
  if (c.adminToken.length < 16) {
    res.status(503).type("text/plain").send("Set ADMIN_TOKEN (at least 16 characters) in the API settings file to use this page.");
    return;
  }
  const session = createHmac("sha256", c.adminToken).update("cdr-admin-session").digest("hex");
  const csrf = createHmac("sha256", session).update("cdr-admin-csrf").digest("hex").slice(0, 32);
  const cookieOptions = { path: "/api/admin", secure: req.secure, httpOnly: true, sameSite: "strict" as const };
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (req.query.logout !== undefined) {
    res.clearCookie(COOKIE, cookieOptions);
    return res.redirect(303, SELF);
  }

  const signedIn = same(readCookie(req, COOKIE), session);

  if (!signedIn) {
    let problem = "";
    if (req.method === "POST" && typeof body.token === "string") {
      if (rateLimited("admin", visitorIp(req), 10, 900)) problem = "Too many attempts. Wait 15 minutes.";
      else if (same(body.token, c.adminToken)) {
        res.cookie(COOKIE, session, { ...cookieOptions, maxAge: 12 * 3600 * 1000 });
        return res.redirect(303, SELF);
      } else problem = "That is not the admin token.";
    }
    res.type("html").send(signInPage(problem));
    return;
  }

  /* ---------- actions ---------- */
  if (req.method === "POST") {
    if (!same(str(body.csrf), csrf)) {
      res.status(400).type("text/plain").send("Stale form. Go back and reload.");
      return;
    }
    const id = str(body.order);
    if (isValidOrderId(id) && body.action === "drive") await fulfil(id, 25);
    return res.redirect(303, SELF + "?order=" + encodeURIComponent(id));
  }

  /* ---------- CSV ---------- */
  if (req.query.format === "csv") {
    const day = new Date().toISOString().slice(0, 10);
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="cdr-orders-${day}.csv"`);
    res.send(ordersCsv(await ordersForExport(UNPAID)));
    return;
  }

  const head = headerLine({
    live: c.opensrsEnv === "live",
    stripeLive: !isTestMode(c),
    balance: req.query.balance !== undefined ? await balance() : undefined,
  });

  /* ---------- one order ---------- */
  if (req.query.order !== undefined) {
    const id = str(req.query.order);
    const o = isValidOrderId(id) ? await readOrder(id) : null;
    if (req.query.format === "json") {
      if (!o) { res.status(404).json({ error: "not_found" }); return; }
      res.json(o);
      return;
    }
    if (!o) {
      res.status(404).type("html").send(page("Not found", `${head}<p>No such order. <a href="${SELF}">All orders</a></p>`));
      return;
    }
    res.type("html").send(orderPage(o, head, SELF, csrf, DRIVABLE.includes(o.status)));
    return;
  }

  /* ---------- every order ---------- */
  const q = str(req.query.q).trim();
  const want = str(req.query.status);
  const hideAbandoned = req.query.all === undefined;
  const pageNo = Math.max(1, Math.floor(Number(str(req.query.page)) || 1));
  const found = await listOrders({
    text: q,
    status: want,
    hide: hideAbandoned ? UNPAID : [],
    limit: PAGE_SIZE,
    offset: (pageNo - 1) * PAGE_SIZE,
  });
  res.type("html").send(listPage({
    orders: found.orders, total: found.total, pageNo, pages: Math.max(1, Math.ceil(found.total / PAGE_SIZE)),
    head, self: SELF, q, want, hideAbandoned, statuses: found.statuses,
  }));
});

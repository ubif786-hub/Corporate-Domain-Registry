// /api/admin/ — CDR's own record of every order, and a CSV of it.
//
// Signed in with ADMIN_TOKEN from the settings file (typed once into the form; the browser then
// holds a cookie derived from it, never the token itself). Nothing here is linked from the site
// and the page asks search engines to stay away.
//
//   /api/admin/                     every order, newest first (filter by text or status)
//   /api/admin/?order=<id>          one order in full, with its history
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
import { isValidOrderId, orderIds, readOrder } from "../orders/order.store";
import type { Order } from "../orders/order.types";
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

function allOrders(): Order[] {
  return orderIds().map(readOrder).filter((o): o is Order => o !== null);
}

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
    res.send(ordersCsv(allOrders()));
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
    const o = isValidOrderId(id) ? readOrder(id) : null;
    if (!o) {
      res.status(404).type("html").send(page("Not found", `${head}<p>No such order. <a href="${SELF}">All orders</a></p>`));
      return;
    }
    res.type("html").send(orderPage(o, head, SELF, csrf, DRIVABLE.includes(o.status)));
    return;
  }

  /* ---------- every order ---------- */
  const q = str(req.query.q).trim().toLowerCase();
  const want = str(req.query.status);
  const hideAbandoned = req.query.all === undefined;
  const statuses = new Set<string>();
  const shown: Order[] = [];
  for (const o of allOrders()) {
    statuses.add(o.status);
    if (hideAbandoned && want === "" && ["pending_payment", "expired", "stripe_error"].includes(o.status)) continue;
    if (want !== "" && o.status !== want) continue;
    const r = o.registrant;
    const text = [o.id, r.first_name, r.last_name, r.org_name, r.email, ...o.lines.map((l) => l.domain)].join(" ").toLowerCase();
    if (q !== "" && !text.includes(q)) continue;
    shown.push(o);
  }
  res.type("html").send(listPage({ orders: shown, head, self: SELF, q: str(req.query.q).trim(), want, hideAbandoned, statuses: [...statuses] }));
});

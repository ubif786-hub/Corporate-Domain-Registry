// /api/admin/*: the JSON behind the admin panel (apps/web, /admin/).
//
// Everyone signs in as themselves (admin.session.ts): email and password, a server-side session,
// sign-in rate-limited per address and per email. People are added by an owner on the Team page
// or with the command line (cli.ts); either way they get a setup link and choose their own
// password. Every answer is no-store and noindex; every write needs the X-CDR-Admin header.
//
//   GET    /api/admin/me                      who is signed in, and the shop's modes
//   POST   /api/admin/session                 sign in { email, password }
//   DELETE /api/admin/session                 sign out
//   GET    /api/admin/setup?token=            whose setup link this is
//   POST   /api/admin/setup                   { token, password }: set the password, signed in
//   GET    /api/admin/overview                the dashboard
//   GET    /api/admin/orders                  ?q= &status= &all=1 &page=
//   GET    /api/admin/orders/:id              one order in full, with its history
//   POST   /api/admin/orders/:id/continue     run the order's next step now
//   GET    /api/admin/export.csv              one row per domain, every paid order
//   GET    /api/admin/domains                 ?q= &state= &page=
//   GET    /api/admin/customers               ?q= &page=
//   GET    /api/admin/balance                 the Tucows balance
//   GET    /api/admin/team                    the people (owners also get the activity log)
//   POST   /api/admin/team                    owner: add { name, email, role }, answers a setup link
//   POST   /api/admin/team/:id/link           owner: a new setup link (first sign-in or reset)
//   POST   /api/admin/team/:id/role           owner: { role }
//   POST   /api/admin/team/:id/disable        owner
//   POST   /api/admin/team/:id/enable         owner
//   PATCH  /api/admin/account                 { name }
//   POST   /api/admin/account/password        { current, password }
//   GET    /api/admin/account/sessions
//   POST   /api/admin/account/sessions/end-others

import express, { Router, type Request } from "express";
import { config, isTestMode } from "../../core/config";
import { HttpError } from "../../core/http";
import { countFailure, overLimit, rateLimited } from "../../core/rate-limit";
import { visitorIp } from "../../core/visitor";
import { balance } from "../../integrations/opensrs/client";
import { DRIVABLE, fulfil } from "../orders/fulfilment.service";
import { isValidOrderId, listOrders, ordersForExport, readOrder } from "../orders/order.store";
import {
  addUser, audit, changePassword, completeSetup, countOwners, findUser, findUserByEmail, isEmail, listUsers, markWeak,
  newSetupLink, normaliseEmail, publicUser, recentAudit, renameUser, setDisabled, setRole, userForSetup,
} from "./admin.accounts";
import { ordersCsv } from "./admin.csv";
import { burnDecoy, passwordProblem, verifyPassword } from "./admin.password";
import { attentionCount, customers, domains, overview, summarise, UNPAID } from "./admin.queries";
import { ADMIN_ROLES, type AdminRole } from "./admin.schema";
import {
  adminHeaders, currentAdmin, endOtherSessions, endSession, requireAdmin, requireOwner, sameSiteWrites, sessionsOf, startSession,
} from "./admin.session";

const PAGE_SIZE = 50;
const ORDERS_PAGE_SIZE = 25;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const pageOf = (req: Request) => Math.max(1, Math.min(10_000, Math.floor(Number(str(req.query.page)) || 1)));
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;
const ip = (req: Request) => visitorIp(req);
const me = (req: Request) => req.admin!;

function modes() {
  const c = config();
  return {
    tucows: c.opensrsEnv,
    stripe: isTestMode(c) ? "test" as const : "live" as const,
    mail: c.mailTransport,
  };
}

function cleanName(v: unknown): string {
  const s = str(v).replace(/\s+/g, " ").trim();
  if (s.length < 2 || s.length > 80) throw new HttpError(400, "invalid", "Enter a name between 2 and 80 characters.", { field: "name" });
  return s;
}

function userId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "not_found", "No such person.");
  return id;
}

export const adminRouter = Router();

// The old address of the HTML admin page, still in earlier order emails: the panel is at /admin/.
adminRouter.get("/api/admin", (req, res) => {
  const id = str(req.query.order);
  res.redirect(308, isValidOrderId(id) ? "/admin/orders/view/?id=" + id : "/admin/");
});

const api = Router();
adminRouter.use("/api/admin", adminHeaders, express.json({ limit: "16kb" }), sameSiteWrites, api);

/* ---------- signing in and out ---------- */

api.get("/me", async (req, res) => {
  const ctx = await currentAdmin(req);
  if (!ctx) throw new HttpError(401, "signed_out", "Sign in to continue.");
  const m = modes();
  res.json({ user: publicUser(ctx.user), modes: m, attention: await attentionCount(m.stripe === "test") });
});

api.post("/session", async (req, res) => {
  const b = body(req);
  const email = normaliseEmail(b.email);
  const password = str(b.password);
  // Ten tries per address, and six wrong passwords per email from anywhere, per 15 minutes.
  if (rateLimited("admin-ip", ip(req), 10, 900) || overLimit("admin-email", email || "-", 6, 900)) {
    await audit("sign_in_limited", null, ip(req), { email });
    throw new HttpError(429, "limited", "Too many attempts. Wait 15 minutes, then try again.");
  }
  if (!isEmail(email) || !password) throw new HttpError(400, "invalid", "Enter your email and password.");
  const user = await findUserByEmail(email);
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : (await burnDecoy(password), false);
  if (!user || !ok || user.disabledAt) {
    countFailure("admin-email", email, 900);
    await audit("sign_in_failed", user?.id ?? null, ip(req), { email });
    // The same answer whether the email is unknown, the password wrong or the account disabled.
    throw new HttpError(401, "wrong", "That email and password do not match.");
  }
  const weak = passwordProblem(password, user.email) !== null;
  if (weak !== user.weakPassword) await markWeak(user.id, weak);
  await startSession(req, res, user);
  await audit("sign_in", user.id, ip(req));
  res.json({ user: publicUser({ ...user, weakPassword: weak }) });
});

api.delete("/session", async (req, res) => {
  const ctx = await currentAdmin(req);
  await endSession(req, res);
  if (ctx) await audit("sign_out", ctx.user.id, ip(req));
  res.json({ ok: true });
});

api.get("/setup", async (req, res) => {
  const user = await userForSetup(str(req.query.token));
  if (!user) throw new HttpError(404, "expired", "This link has expired or was already used. Ask an owner for a new one.");
  res.json({ name: user.name, email: user.email, first_time: !user.passwordHash });
});

api.post("/setup", async (req, res) => {
  if (rateLimited("admin-setup", ip(req), 10, 900)) throw new HttpError(429, "limited", "Too many attempts. Wait 15 minutes, then try again.");
  const b = body(req);
  const user = await userForSetup(str(b.token));
  if (!user) throw new HttpError(404, "expired", "This link has expired or was already used. Ask an owner for a new one.");
  const password = str(b.password);
  const problem = passwordProblem(password, user.email);
  if (problem) throw new HttpError(400, "weak", problem, { field: "password" });
  await completeSetup(user.id, password);
  await audit("setup_completed", user.id, ip(req));
  const fresh = (await findUser(user.id))!;
  await startSession(req, res, fresh);
  await audit("sign_in", user.id, ip(req), { via: "setup" });
  res.json({ user: publicUser(fresh) });
});

/* ---------- everything below needs a signed-in person ---------- */

api.use(requireAdmin);

api.get("/overview", async (_req, res) => {
  const m = modes();
  const o = await overview(m.stripe === "test");
  const recent = await listOrders({ hide: UNPAID, limit: 8, offset: 0 });
  res.json({ ...o, modes: m, recent: recent.orders.filter((x) => x.test_mode === o.test_mode).map(summarise) });
});

api.get("/orders", async (req, res) => {
  const q = str(req.query.q).trim().slice(0, 100);
  const status = str(req.query.status);
  const all = req.query.all === "1";
  const page = pageOf(req);
  const found = await listOrders({ text: q, status, hide: all ? [] : UNPAID, limit: ORDERS_PAGE_SIZE, offset: (page - 1) * ORDERS_PAGE_SIZE });
  res.json({
    orders: found.orders.map(summarise),
    total: found.total,
    page,
    pages: Math.max(1, Math.ceil(found.total / ORDERS_PAGE_SIZE)),
    statuses: found.statuses,
  });
});

api.get("/orders/:id", async (req, res) => {
  const id = str(req.params.id);
  const order = isValidOrderId(id) ? await readOrder(id) : null;
  if (!order) throw new HttpError(404, "not_found", "No order with that number.");
  res.json({ order, can_continue: DRIVABLE.includes(order.status) });
});

api.post("/orders/:id/continue", async (req, res) => {
  const id = str(req.params.id);
  if (!isValidOrderId(id) || !(await readOrder(id))) throw new HttpError(404, "not_found", "No order with that number.");
  const outcome = await fulfil(id, 25);
  await audit("order_driven", me(req).user.id, ip(req), { order: id, outcome });
  const order = await readOrder(id);
  res.json({ outcome, order, can_continue: order ? DRIVABLE.includes(order.status) : false });
});

api.get("/export.csv", async (req, res) => {
  const day = new Date().toISOString().slice(0, 10);
  const rows = await ordersForExport(UNPAID);
  await audit("csv_exported", me(req).user.id, ip(req), { orders: rows.length });
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="cdr-orders-${day}.csv"`);
  res.send(ordersCsv(rows));
});

api.get("/domains", async (req, res) => {
  const page = pageOf(req);
  const found = await domains({ text: str(req.query.q).trim().slice(0, 100), state: str(req.query.state), limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  res.json({ ...found, page, pages: Math.max(1, Math.ceil(found.total / PAGE_SIZE)) });
});

api.get("/customers", async (req, res) => {
  const page = pageOf(req);
  const found = await customers({ text: str(req.query.q).trim().slice(0, 100), limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  res.json({ ...found, page, pages: Math.max(1, Math.ceil(found.total / PAGE_SIZE)) });
});

api.get("/balance", async (_req, res) => {
  const b = await balance();
  res.json({ balance_usd: b, env: config().opensrsEnv });
});

/* ---------- the team ---------- */

api.get("/team", async (req, res) => {
  const owner = me(req).user.role === "owner";
  const users = (await listUsers()).map(publicUser);
  res.json({ users, activity: owner ? await recentAudit(60) : null });
});

api.post("/team", requireOwner, async (req, res) => {
  const b = body(req);
  const name = cleanName(b.name);
  const email = normaliseEmail(b.email);
  if (!isEmail(email)) throw new HttpError(400, "invalid", "Enter a valid email address.", { field: "email" });
  const role = (ADMIN_ROLES as readonly string[]).includes(str(b.role)) ? str(b.role) as AdminRole : "staff";
  try {
    const { user, link, expires } = await addUser({ email, name, role, createdBy: me(req).user.id });
    await audit("user_added", me(req).user.id, ip(req), { user: user.id, email, role });
    res.status(201).json({ user: publicUser(user), link, expires: expires.toISOString() });
  } catch (e) {
    if ((e as Error).message === "exists") throw new HttpError(409, "exists", "Someone with that email is already on the team.", { field: "email" });
    throw e;
  }
});

api.post("/team/:id/link", requireOwner, async (req, res) => {
  const id = userId(req);
  const user = await findUser(id);
  if (!user || user.disabledAt) throw new HttpError(404, "not_found", "No active person with that id.");
  const made = await newSetupLink(id);
  await audit("setup_link", me(req).user.id, ip(req), { user: id });
  res.json({ link: made!.link, expires: made!.expires.toISOString() });
});

api.post("/team/:id/role", requireOwner, async (req, res) => {
  const id = userId(req);
  const role = str(body(req).role);
  if (!(ADMIN_ROLES as readonly string[]).includes(role)) throw new HttpError(400, "invalid", "Choose owner or staff.");
  const user = await findUser(id);
  if (!user) throw new HttpError(404, "not_found", "No such person.");
  if (user.role === "owner" && role !== "owner" && !user.disabledAt && (await countOwners()) <= 1) {
    throw new HttpError(409, "last_owner", "The team needs at least one owner.");
  }
  await setRole(id, role as AdminRole);
  await audit("role_changed", me(req).user.id, ip(req), { user: id, role });
  res.json({ user: publicUser((await findUser(id))!) });
});

api.post("/team/:id/disable", requireOwner, async (req, res) => {
  const id = userId(req);
  if (id === me(req).user.id) throw new HttpError(409, "self", "You cannot turn off your own access.");
  const user = await findUser(id);
  if (!user) throw new HttpError(404, "not_found", "No such person.");
  if (user.role === "owner" && !user.disabledAt && (await countOwners()) <= 1) throw new HttpError(409, "last_owner", "The team needs at least one owner.");
  await setDisabled(id, true);
  await audit("user_disabled", me(req).user.id, ip(req), { user: id });
  res.json({ user: publicUser((await findUser(id))!) });
});

api.post("/team/:id/enable", requireOwner, async (req, res) => {
  const id = userId(req);
  if (!(await findUser(id))) throw new HttpError(404, "not_found", "No such person.");
  await setDisabled(id, false);
  await audit("user_enabled", me(req).user.id, ip(req), { user: id });
  res.json({ user: publicUser((await findUser(id))!) });
});

/* ---------- your own account ---------- */

api.patch("/account", async (req, res) => {
  const name = cleanName(body(req).name);
  await renameUser(me(req).user.id, name);
  res.json({ user: publicUser((await findUser(me(req).user.id))!) });
});

api.post("/account/password", async (req, res) => {
  const { user, sessionId } = me(req);
  if (rateLimited("admin-password", String(user.id), 6, 900)) throw new HttpError(429, "limited", "Too many attempts. Wait 15 minutes, then try again.");
  const b = body(req);
  if (!user.passwordHash || !(await verifyPassword(str(b.current), user.passwordHash))) {
    throw new HttpError(400, "wrong", "Your current password is not right.", { field: "current" });
  }
  const password = str(b.password);
  const problem = passwordProblem(password, user.email);
  if (problem) throw new HttpError(400, "weak", problem, { field: "password" });
  await changePassword(user.id, password, sessionId);
  await audit("password_changed", user.id, ip(req));
  res.json({ ok: true });
});

api.get("/account/sessions", async (req, res) => {
  const { user, sessionId } = me(req);
  res.json({ sessions: await sessionsOf(user.id, sessionId) });
});

api.post("/account/sessions/end-others", async (req, res) => {
  const { user, sessionId } = me(req);
  const ended = await endOtherSessions(user.id, sessionId);
  await audit("sessions_revoked", user.id, ip(req), { ended });
  res.json({ ended });
});

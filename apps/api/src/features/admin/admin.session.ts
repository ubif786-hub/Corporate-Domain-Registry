// Admin sessions: a random token in an HttpOnly cookie, its SHA-256 in admin_sessions.
//
// - The cookie is HttpOnly, SameSite=Strict, Secure on HTTPS, and scoped to /api/admin, so the
//   rest of the site never sends it and page scripts can never read it.
// - A session ends after 12 hours without use, and 14 days after sign-in whatever happens.
// - Every request that changes something must carry the X-CDR-Admin header. A browser only adds a
//   custom header from our own pages (a cross-site form cannot, and a cross-site script would
//   need CORS, which the API never grants), so with SameSite=Strict that closes off CSRF. When
//   the browser sends Origin, it must be this site.

import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { config } from "../../core/config";
import { db } from "../../core/db";
import { HttpError } from "../../core/http";
import { visitorIp } from "../../core/visitor";
import { sha256, type AdminUserRow } from "./admin.accounts";
import { adminSessions, adminUsers } from "./admin.schema";

export const COOKIE = "cdr_admin";
const COOKIE_PATH = "/api/admin";
const IDLE_MS = 12 * 3600_000;
const MAX_MS = 14 * 24 * 3600_000;
/** last_seen_at is written at most this often, not on every request. */
const TOUCH_MS = 5 * 60_000;

export interface AdminContext {
  user: AdminUserRow;
  sessionId: string;
}

declare module "express-serve-static-core" {
  interface Request { admin?: AdminContext }
}

function readCookie(req: Request, name: string): string {
  for (const part of (req.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return ""; }
    }
  }
  return "";
}

const cookieOptions = (req: Request) => ({
  path: COOKIE_PATH,
  httpOnly: true,
  sameSite: "strict" as const,
  secure: req.secure || config().siteUrl.startsWith("https://"),
});

export async function startSession(req: Request, res: Response, user: AdminUserRow): Promise<void> {
  const d = await db();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await d.insert(adminSessions).values({
    id: sha256(token),
    userId: user.id,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + MAX_MS),
    ip: visitorIp(req),
    userAgent: (req.get("user-agent") ?? "").slice(0, 300) || null,
  });
  await d.update(adminUsers).set({ lastSignInAt: now }).where(eq(adminUsers.id, user.id));
  // Housekeeping: sessions past either limit are of no use to anyone.
  await d.delete(adminSessions).where(or(lt(adminSessions.expiresAt, now), lt(adminSessions.lastSeenAt, new Date(now.getTime() - IDLE_MS))));
  // A session cookie in the browser's sense too (no Max-Age): closing the browser ends it.
  res.cookie(COOKIE, token, cookieOptions(req));
}

export async function endSession(req: Request, res: Response): Promise<void> {
  const token = readCookie(req, COOKIE);
  if (token) {
    const d = await db();
    await d.delete(adminSessions).where(eq(adminSessions.id, sha256(token)));
  }
  res.clearCookie(COOKIE, cookieOptions(req));
}

/** The signed-in person, or null. Touches the session so it stays alive while in use. */
export async function currentAdmin(req: Request): Promise<AdminContext | null> {
  const token = readCookie(req, COOKIE);
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  const id = sha256(token);
  const d = await db();
  const now = new Date();
  const [row] = await d.select({ user: adminUsers, lastSeenAt: adminSessions.lastSeenAt })
    .from(adminSessions).innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .where(and(
      eq(adminSessions.id, id),
      gt(adminSessions.expiresAt, now),
      gt(adminSessions.lastSeenAt, new Date(now.getTime() - IDLE_MS)),
      isNull(adminUsers.disabledAt),
      sql`${adminUsers.passwordHash} is not null`,
    )).limit(1);
  if (!row) return null;
  if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_MS) {
    await d.update(adminSessions).set({ lastSeenAt: now }).where(eq(adminSessions.id, id));
  }
  return { user: row.user, sessionId: id };
}

export interface SessionInfo { current: boolean; created_at: string; last_seen_at: string; ip: string | null; device: string }

function device(ua: string | null): string {
  if (!ua) return "Unknown browser";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export async function sessionsOf(userId: number, currentId: string): Promise<SessionInfo[]> {
  const d = await db();
  const now = new Date();
  const rows = await d.select().from(adminSessions)
    .where(and(eq(adminSessions.userId, userId), gt(adminSessions.expiresAt, now), gt(adminSessions.lastSeenAt, new Date(now.getTime() - IDLE_MS))))
    .orderBy(sql`${adminSessions.lastSeenAt} desc`);
  return rows.map((r) => ({
    current: r.id === currentId,
    created_at: r.createdAt.toISOString(),
    last_seen_at: r.lastSeenAt.toISOString(),
    ip: r.ip,
    device: device(r.userAgent),
  }));
}

export async function endOtherSessions(userId: number, keep: string): Promise<number> {
  const d = await db();
  const gone = await d.delete(adminSessions).where(and(eq(adminSessions.userId, userId), sql`${adminSessions.id} <> ${keep}`)).returning({ id: adminSessions.id });
  return gone.length;
}

/* ---------- middleware ---------- */

/** Headers every admin answer carries: never cached, never indexed, never framed. */
export function adminHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.set({
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  next();
}

/** Writes need our header, and Origin (when sent) must be this site. */
export function sameSiteWrites(req: Request, _res: Response, next: NextFunction): void {
  if (req.method === "GET" || req.method === "HEAD") return next();
  if (req.get("x-cdr-admin") !== "1") return next(new HttpError(403, "forbidden", "Reload the page and try again."));
  const origin = req.get("origin");
  if (origin) {
    const site = config().siteUrl;
    const host = req.get("host") ?? "";
    let ok = false;
    try {
      const o = new URL(origin);
      ok = (site !== "" && o.origin === new URL(site).origin) || o.host === host;
    } catch { ok = false; }
    if (!ok) return next(new HttpError(403, "forbidden", "Reload the page and try again."));
  }
  next();
}

/** 401 unless signed in; puts the person on req.admin. */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const ctx = await currentAdmin(req);
    if (!ctx) return next(new HttpError(401, "signed_out", "Sign in to continue."));
    req.admin = ctx;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireOwner(req: Request, _res: Response, next: NextFunction): void {
  if (req.admin?.user.role !== "owner") return next(new HttpError(403, "owner_only", "Only an owner can do that."));
  next();
}

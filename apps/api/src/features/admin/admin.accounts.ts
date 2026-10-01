// The people who can sign in, and their setup links (admin.schema.ts).

import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { config } from "../../core/config";
import { db } from "../../core/db";
import { hashPassword, passwordProblem } from "./admin.password";
import { adminAudit, adminSessions, adminUsers, type AdminRole } from "./admin.schema";

export type AdminUserRow = typeof adminUsers.$inferSelect;

/** What the pages are told about a person: never the hashes. */
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  status: "active" | "invited" | "disabled";
  created_at: string;
  last_sign_in_at: string | null;
  setup_expires_at: string | null;
  /** The password breaks the rules; the panel asks for a new one until it is changed. */
  weak_password: boolean;
}

export function publicUser(u: AdminUserRow): AdminUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.disabledAt ? "disabled" : u.passwordHash ? "active" : "invited",
    created_at: u.createdAt.toISOString(),
    last_sign_in_at: u.lastSignInAt?.toISOString() ?? null,
    setup_expires_at: u.setupExpiresAt?.toISOString() ?? null,
    weak_password: u.weakPassword,
  };
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normaliseEmail = (s: unknown) => (typeof s === "string" ? s.trim().toLowerCase() : "");
export const isEmail = (s: string) => s.length <= 254 && EMAIL.test(s);

/** Setup links work for three days, once. */
const SETUP_HOURS = 72;

export async function findUserByEmail(email: string): Promise<AdminUserRow | null> {
  const d = await db();
  const [u] = await d.select().from(adminUsers).where(sql`lower(${adminUsers.email}) = ${normaliseEmail(email)}`).limit(1);
  return u ?? null;
}

export async function findUser(id: number): Promise<AdminUserRow | null> {
  const d = await db();
  const [u] = await d.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return u ?? null;
}

export async function listUsers(): Promise<AdminUserRow[]> {
  const d = await db();
  return d.select().from(adminUsers).orderBy(asc(adminUsers.createdAt), asc(adminUsers.id));
}

export async function countOwners(): Promise<number> {
  const d = await db();
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(adminUsers)
    .where(and(eq(adminUsers.role, "owner"), isNull(adminUsers.disabledAt)));
  return n;
}

function setupUrl(token: string): string {
  const base = config().siteUrl || "";
  return `${base}/admin/setup/?token=${token}`;
}

/** Adds a person and returns their setup link. Throws "exists" when the email is taken. */
export async function addUser(input: { email: string; name: string; role: AdminRole; createdBy: number | null }): Promise<{ user: AdminUserRow; link: string; expires: Date }> {
  const d = await db();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SETUP_HOURS * 3600_000);
  try {
    const [user] = await d.insert(adminUsers).values({
      email: input.email,
      name: input.name,
      role: input.role,
      setupHash: sha256(token),
      setupExpiresAt: expires,
      createdBy: input.createdBy,
    }).returning();
    return { user, link: setupUrl(token), expires };
  } catch (e) {
    // Drizzle wraps the driver's error; the unique violation (23505) is on it or on its cause.
    const pgCode = (x: unknown) => (x as { code?: string } | null)?.code;
    if (pgCode(e) === "23505" || pgCode((e as { cause?: unknown })?.cause) === "23505") throw new Error("exists");
    throw e;
  }
}

/** A fresh setup link (first sign-in, or a forgotten password). The old link stops working. The
 *  current password keeps working until the link is used. */
export async function newSetupLink(userId: number): Promise<{ link: string; expires: Date } | null> {
  const d = await db();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SETUP_HOURS * 3600_000);
  const done = await d.update(adminUsers).set({ setupHash: sha256(token), setupExpiresAt: expires })
    .where(eq(adminUsers.id, userId)).returning({ id: adminUsers.id });
  return done.length ? { link: setupUrl(token), expires } : null;
}

/** The person a setup link belongs to, while it is valid. */
export async function userForSetup(token: string): Promise<AdminUserRow | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const d = await db();
  const [u] = await d.select().from(adminUsers)
    .where(and(eq(adminUsers.setupHash, sha256(token)), gt(adminUsers.setupExpiresAt, new Date()), isNull(adminUsers.disabledAt)))
    .limit(1);
  return u ?? null;
}

/** Sets the password and spends the link. Every other session of this person ends. */
export async function completeSetup(userId: number, password: string): Promise<void> {
  const d = await db();
  const hash = await hashPassword(password);
  await d.transaction(async (tx) => {
    await tx.update(adminUsers).set({ passwordHash: hash, passwordChangedAt: new Date(), setupHash: null, setupExpiresAt: null, weakPassword: false })
      .where(eq(adminUsers.id, userId));
    await tx.delete(adminSessions).where(eq(adminSessions.userId, userId));
  });
}

/** The command line's way in (cli.js --password): sets the password as given, rules or not, spends
 *  any setup link, ends every session. A password that breaks the rules is flagged, and the panel
 *  keeps asking for a new one until it is changed. Answers whether it was flagged. */
export async function setPasswordDirectly(user: AdminUserRow, password: string): Promise<boolean> {
  const d = await db();
  const hash = await hashPassword(password);
  const weak = passwordProblem(password, user.email) !== null;
  await d.transaction(async (tx) => {
    await tx.update(adminUsers).set({ passwordHash: hash, passwordChangedAt: new Date(), setupHash: null, setupExpiresAt: null, weakPassword: weak })
      .where(eq(adminUsers.id, user.id));
    await tx.delete(adminSessions).where(eq(adminSessions.userId, user.id));
  });
  return weak;
}

/** Re-checked at each sign-in, when the password itself is at hand. */
export async function markWeak(userId: number, weak: boolean): Promise<void> {
  const d = await db();
  await d.update(adminUsers).set({ weakPassword: weak }).where(eq(adminUsers.id, userId));
}

export async function changePassword(userId: number, password: string, keepSession: string): Promise<void> {
  const d = await db();
  const hash = await hashPassword(password);
  await d.transaction(async (tx) => {
    await tx.update(adminUsers).set({ passwordHash: hash, passwordChangedAt: new Date(), weakPassword: false }).where(eq(adminUsers.id, userId));
    await tx.delete(adminSessions).where(and(eq(adminSessions.userId, userId), sql`${adminSessions.id} <> ${keepSession}`));
  });
}

export async function renameUser(userId: number, name: string): Promise<void> {
  const d = await db();
  await d.update(adminUsers).set({ name }).where(eq(adminUsers.id, userId));
}

export async function setDisabled(userId: number, disabled: boolean): Promise<void> {
  const d = await db();
  await d.transaction(async (tx) => {
    await tx.update(adminUsers).set({ disabledAt: disabled ? new Date() : null, ...(disabled ? { setupHash: null, setupExpiresAt: null } : {}) })
      .where(eq(adminUsers.id, userId));
    if (disabled) await tx.delete(adminSessions).where(eq(adminSessions.userId, userId));
  });
}

export async function setRole(userId: number, role: AdminRole): Promise<void> {
  const d = await db();
  await d.update(adminUsers).set({ role }).where(eq(adminUsers.id, userId));
}

/* ---------- the audit trail ---------- */

export async function audit(action: string, userId: number | null, ip: string | null, detail?: Record<string, unknown>): Promise<void> {
  try {
    const d = await db();
    await d.insert(adminAudit).values({ action, userId, ip, detail: detail ?? null });
  } catch (e) {
    console.error("[admin] audit not written:", e instanceof Error ? e.message : e);
  }
}

export interface AuditEntry { at: string; action: string; who: string | null; ip: string | null; detail: Record<string, unknown> | null }

export async function recentAudit(limit: number): Promise<AuditEntry[]> {
  const d = await db();
  const rows = await d.select({ at: adminAudit.at, action: adminAudit.action, ip: adminAudit.ip, detail: adminAudit.detail, who: adminUsers.name })
    .from(adminAudit).leftJoin(adminUsers, eq(adminUsers.id, adminAudit.userId))
    .orderBy(desc(adminAudit.at), desc(adminAudit.id)).limit(limit);
  return rows.map((r) => ({ at: r.at.toISOString(), action: r.action, who: r.who ?? null, ip: r.ip, detail: r.detail ?? null }));
}

// The people who can sign in to /admin, their sessions, and what they did.
//
//   admin_users     one row per person: email, name, role, the password hash (scrypt)
//   admin_sessions  one row per signed-in browser; the cookie holds a random token, this table
//                   only its SHA-256, so a database dump cannot be replayed as a sign-in
//   admin_audit     sign-ins (good and bad), password changes, team changes, order actions
//
// A person is added with a setup link (cli.ts or the Team page): the link's token is stored as a
// hash with an expiry, and the person chooses their own password on /admin/setup/. Nobody ever
// types another person's password, and no password travels by email.

import { sql } from "drizzle-orm";
import { bigserial, boolean, check, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const ADMIN_ROLES = ["owner", "staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").$type<AdminRole>().notNull(),
  /** scrypt$N$r$p$salt$hash, or null until the person has used their setup link. */
  passwordHash: text("password_hash"),
  setupHash: text("setup_hash"),
  setupExpiresAt: ts("setup_expires_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  createdBy: integer("created_by"),
  passwordChangedAt: ts("password_changed_at"),
  /** The password breaks the rules (set from the command line, cli.js --password). Re-checked at
   *  every sign-in; cleared when the password is changed. */
  weakPassword: boolean("weak_password").notNull().default(false),
  lastSignInAt: ts("last_sign_in_at"),
  disabledAt: ts("disabled_at"),
}, (t) => [
  uniqueIndex("admin_users_email_key").on(sql`lower(${t.email})`),
  uniqueIndex("admin_users_setup_key").on(t.setupHash),
  check("admin_users_role_check", sql`${t.role} in ('owner', 'staff')`),
  check("admin_users_email_check", sql`position('@' in ${t.email}) > 1`),
]);

export const adminSessions = pgTable("admin_sessions", {
  /** SHA-256 of the cookie's token, hex. */
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
  expiresAt: ts("expires_at").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
}, (t) => [index("admin_sessions_user_idx").on(t.userId)]);

export const adminAudit = pgTable("admin_audit", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  at: ts("at").notNull().defaultNow(),
  userId: integer("user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  /** sign_in, sign_in_failed, sign_out, password_changed, setup_completed, user_added,
   *  setup_link, user_disabled, user_enabled, order_driven, csv_exported, sessions_revoked */
  action: text("action").notNull(),
  ip: text("ip"),
  detail: jsonb("detail").$type<Record<string, unknown>>(),
}, (t) => [index("admin_audit_at_idx").on(t.at)]);

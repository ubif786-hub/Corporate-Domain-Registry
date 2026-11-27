// Mailings: each list turned into Torpedo's files, with its letters, so the files can be downloaded
// again and the next mailing's reference numbers carry on from the last one.

import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import type { Letter, MailingCounts } from "./letters.lists";

export const mailings = pgTable("mailings", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  /** The admin's name at the time. */
  createdBy: text("created_by").notNull(),
  /** The uploaded file names. */
  files: text("files").array().notNull(),
  firstRef: integer("first_ref").notNull(),
  lastRef: integer("last_ref").notNull(),
  counts: jsonb("counts").$type<MailingCounts>().notNull(),
  letters: jsonb("letters").$type<Letter[]>().notNull(),
}, (t) => [check("mailings_refs_valid", sql`${t.firstRef} >= 1 and ${t.lastRef} >= ${t.firstRef}`)]);

/** QR scans: visits to the renewal page from a letter's link, one row per letter. */
export const letterScans = pgTable("letter_scans", {
  ref: integer("ref").primaryKey(),
  firstAt: timestamp("first_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  lastAt: timestamp("last_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  count: integer("count").notNull().default(1),
});

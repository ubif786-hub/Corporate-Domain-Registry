// What the owner notices remember between runs and restarts: when the Tucows balance was last
// checked and an alert sent, and when the next report is due. One row per notice.

import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

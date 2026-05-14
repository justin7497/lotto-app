import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const savedNumbersTable = pgTable("saved_numbers", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  sets: jsonb("sets").notNull(),
  mode: text("mode").notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  roundTag: text("round_tag").notNull(),
  subLabel: text("sub_label"),
});

export type SavedNumberRow = typeof savedNumbersTable.$inferSelect;
export type InsertSavedNumber = typeof savedNumbersTable.$inferInsert;

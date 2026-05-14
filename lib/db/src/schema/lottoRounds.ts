import { pgTable, integer, varchar } from "drizzle-orm/pg-core";

export const lottoRoundsTable = pgTable("lotto_rounds", {
  drwNo: integer("drw_no").primaryKey(),
  drwNoDate: varchar("drw_no_date", { length: 20 }).notNull(),
  drwtNo1: integer("drwt_no1").notNull(),
  drwtNo2: integer("drwt_no2").notNull(),
  drwtNo3: integer("drwt_no3").notNull(),
  drwtNo4: integer("drwt_no4").notNull(),
  drwtNo5: integer("drwt_no5").notNull(),
  drwtNo6: integer("drwt_no6").notNull(),
  bnusNo: integer("bnus_no").notNull(),
});

export type LottoRoundRow = typeof lottoRoundsTable.$inferSelect;
export type InsertLottoRound = typeof lottoRoundsTable.$inferInsert;

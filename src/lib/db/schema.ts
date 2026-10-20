import { UIMessage } from "ai";
import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const games = pgTable(
  "games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    title: text("title").notNull(),
    sandboxId: text("sandbox_id"),
    messages: jsonb("messages").$type<UIMessage[]>().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("games_org_id_idx").on(table.orgId)],
);

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    entryKey: text("entry_key").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("credit_ledger_org_id_entry_key_unique").on(
      table.orgId,
      table.entryKey,
    ),
    index("credit_ledger_org_id_idx").on(table.orgId),
  ],
);

export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
export type NewCreditLedgerEntry = typeof creditLedger.$inferInsert;
export type CreditLedger = typeof creditLedger.$inferSelect;
export type NewCreditLedger = typeof creditLedger.$inferInsert;

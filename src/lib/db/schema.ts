import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const games = pgTable(
  "games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),
    title: text("title").notNull(),
    messages: jsonb("messages").$type<unknown[]>().default([]).notNull(),
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


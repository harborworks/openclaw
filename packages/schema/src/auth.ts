import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { deleted, timestamps } from "./helpers";

export const users = pgTable(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    cognitoId: uuid().notNull().unique(),
    email: varchar({ length: 255 }).notNull().unique(),
    superadmin: boolean().default(false).notNull(),
    deletedById: integer(),
    deletedAt: timestamp(),
    ...timestamps,
  },
  (table) => {
    return {
      cognitoIdIdx: index("cognito_id_idx").on(table.cognitoId),
    };
  }
);

export const usersRelations = relations(users, ({ one }) => ({
  deletedBy: one(users, {
    fields: [users.deletedById],
    references: [users.id],
  }),
}));

export const orgs = pgTable("orgs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar({ length: 255 }).notNull().unique(),
  ...deleted,
  ...timestamps,
});

export const memberships = pgTable(
  "memberships",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .references(() => users.id)
      .notNull(),
    orgId: integer()
      .references(() => orgs.id)
      .notNull(),
    admin: boolean().default(false).notNull(),
    ...deleted,
    ...timestamps,
  },
  (table) => {
    return {
      unq: unique().on(table.userId, table.orgId),
    };
  }
);

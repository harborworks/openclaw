import {
  boolean,
  index,
  integer,
  pgTable,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { timestamps } from "./timestamps";

export const users = pgTable(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    cognitoId: uuid().notNull().unique(),
    email: varchar({ length: 255 }).notNull().unique(),
    superadmin: boolean().default(false).notNull(),
    ...timestamps,
  },
  (table) => {
    return {
      cognitoIdIdx: index("cognito_id_idx").on(table.cognitoId),
    };
  }
);

export const orgs = pgTable("orgs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar({ length: 255 }).notNull().unique(),
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
    ...timestamps,
  },
  (table) => {
    return {
      unq: unique().on(table.userId, table.orgId),
    };
  }
);

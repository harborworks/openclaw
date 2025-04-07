import { integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const timestamps = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const deleted = {
  deletedById: integer().references(() => users.id),
  deletedAt: timestamp(),
};

import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";

import { orgs, users } from "./auth";
import { timestamps } from "./timestamps";

export const dataType = pgEnum("data_type", ["image", "video"]);
export const tagType = pgEnum("tag_type", [
  "bounding-boxes",
  "categories",
  "time-segments",
]);

export const jobs = pgTable("jobs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer()
    .notNull()
    .references(() => orgs.id),
  name: varchar({ length: 255 }),
  instructions: text(),
  dataType: dataType("data_type").notNull(),
  tagType: tagType("tag_type").notNull(),
  labels: jsonb().notNull(),
  ...timestamps,
});

export const tasks = pgTable("tasks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  jobId: integer()
    .notNull()
    .references(() => jobs.id),
  url: varchar({ length: 255 }).notNull(),
  ...timestamps,
});

export const tags = pgTable("tags", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  taskId: integer()
    .notNull()
    .references(() => tasks.id),
  createdById: integer()
    .notNull()
    .references(() => users.id),
  tagType: tagType("tag_type").notNull(),
  isPrediction: boolean().notNull().default(false),
  values: jsonb().notNull(),
  ...timestamps,
});

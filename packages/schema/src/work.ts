import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { orgs, users } from "./auth";
import { deleted, timestamps } from "./helpers";

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
  ...deleted,
  ...timestamps,
});

export const tasks = pgTable(
  "tasks",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    jobId: integer()
      .notNull()
      .references(() => jobs.id),
    url: varchar({ length: 255 }).notNull(),
    assignedToId: integer().references(() => users.id),
    assignedAt: timestamp(),
    completedAt: timestamp(),
    ...deleted,
    ...timestamps,
  },
  (table) => {
    return {
      jobIdIdx: index("job_id_idx").on(table.jobId),
      assignmentIdx: index("assignment_idx").on(
        table.assignedToId,
        table.completedAt
      ),
      assignedAtIdx: index("assigned_at_idx").on(table.assignedAt),
    };
  }
);

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
  /**
   * For bounding-boxes, values should be object with the following structure:
   * {
   *   label: string,
   *   x1: number,
   *   y1: number,
   *   x2: number,
   *   y2: number,
   * }
   */
  values: jsonb().notNull(),
  ...deleted,
  ...timestamps,
});

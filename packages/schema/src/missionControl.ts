import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";

import { timestamps } from "./helpers";

// Enums
export const taskStatusEnum = pgEnum("task_status", [
  "inbox",
  "assigned",
  "in_progress",
  "review",
  "ready_to_deploy",
  "done",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const agentRoleEnum = pgEnum("agent_role", [
  "pm",
  "dev",
  "qa",
]);

export const agentLevelEnum = pgEnum("agent_level", [
  "junior",
  "senior",
  "lead",
]);

// Tables
export const shires = pgTable("shires", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  ...timestamps,
});

export const agents = pgTable(
  "agents",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    role: agentRoleEnum().notNull(),
    sessionKey: varchar({ length: 255 }).notNull().unique(),
    level: agentLevelEnum(),
    shireId: integer().references(() => shires.id),
    ...timestamps,
  },
  (table) => ({
    sessionKeyIdx: index("agent_session_key_idx").on(table.sessionKey),
  })
);

export const tasks = pgTable(
  "tasks",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar({ length: 500 }).notNull(),
    description: text(),
    status: taskStatusEnum().notNull().default("inbox"),
    priority: taskPriorityEnum().notNull().default("medium"),
    assigneeIds: json().$type<number[]>().default([]),
    tags: json().$type<string[]>().default([]),
    createdBy: integer().references(() => agents.id),
    shireId: integer().references(() => shires.id),
    ...timestamps,
  },
  (table) => ({
    statusIdx: index("task_status_idx").on(table.status),
  })
);

export const taskComments = pgTable(
  "task_comments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    taskId: integer()
      .references(() => tasks.id)
      .notNull(),
    fromAgentId: integer()
      .references(() => agents.id)
      .notNull(),
    content: text().notNull(),
    ...timestamps,
  },
  (table) => ({
    taskIdIdx: index("comment_task_id_idx").on(table.taskId),
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    agentId: integer()
      .references(() => agents.id)
      .notNull(),
    taskId: integer()
      .references(() => tasks.id)
      .notNull(),
    commentId: integer()
      .references(() => taskComments.id)
      .notNull(),
    delivered: boolean().notNull().default(false),
    ...timestamps,
  },
  (table) => ({
    agentDeliveredIdx: index("notification_agent_delivered_idx").on(
      table.agentId,
      table.delivered
    ),
  })
);

// Relations
export const shiresRelations = relations(shires, ({ many }) => ({
  agents: many(agents),
  tasks: many(tasks),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  shire: one(shires, {
    fields: [agents.shireId],
    references: [shires.id],
  }),
  comments: many(taskComments),
  notifications: many(notifications),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  creator: one(agents, {
    fields: [tasks.createdBy],
    references: [agents.id],
  }),
  shire: one(shires, {
    fields: [tasks.shireId],
    references: [shires.id],
  }),
  comments: many(taskComments),
  notifications: many(notifications),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  agent: one(agents, {
    fields: [taskComments.fromAgentId],
    references: [agents.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  agent: one(agents, {
    fields: [notifications.agentId],
    references: [agents.id],
  }),
  task: one(tasks, {
    fields: [notifications.taskId],
    references: [tasks.id],
  }),
  comment: one(taskComments, {
    fields: [notifications.commentId],
    references: [taskComments.id],
  }),
}));

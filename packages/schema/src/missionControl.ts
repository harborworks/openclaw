import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";

import { timestamps } from "./helpers";

// Enums
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

export const notifications = pgTable(
  "notifications",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    agentId: integer()
      .references(() => agents.id)
      .notNull(),
    message: text().notNull(),
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

export const secretCategoryEnum = pgEnum("secret_category", [
  "required",
  "custom",
]);

export const secrets = pgTable(
  "secrets",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    category: secretCategoryEnum().notNull().default("custom"),
    description: varchar({ length: 500 }),
    /** AES-256-GCM encrypted value (base64). Null when deleted but record kept. */
    encryptedValue: text(),
    /** AES-256-GCM IV (base64) */
    iv: varchar({ length: 32 }),
    /** AES-256-GCM auth tag (base64) */
    authTag: varchar({ length: 32 }),
    isSet: boolean().notNull().default(false),
    /** True when value has been updated but not yet synced to host */
    pendingSync: boolean().notNull().default(true),
    shireId: integer().references(() => shires.id),
    ...timestamps,
  },
  (table) => ({
    shireNameIdx: index("secret_shire_name_idx").on(table.shireId, table.name),
  })
);

// Relations
export const shiresRelations = relations(shires, ({ many }) => ({
  agents: many(agents),
  secrets: many(secrets),
}));

export const secretsRelations = relations(secrets, ({ one }) => ({
  shire: one(shires, {
    fields: [secrets.shireId],
    references: [shires.id],
  }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  shire: one(shires, {
    fields: [agents.shireId],
    references: [shires.id],
  }),
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  agent: one(agents, {
    fields: [notifications.agentId],
    references: [agents.id],
  }),
}));

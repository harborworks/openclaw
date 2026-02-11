import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { timestamps } from "./helpers";

// ── Enums ──────────────────────────────────────────────────────

export const agentRoleEnum = pgEnum("agent_role", ["pm", "dev", "qa"]);

export const agentLevelEnum = pgEnum("agent_level", [
  "junior",
  "senior",
  "lead",
]);

export const orgMemberRoleEnum = pgEnum("org_member_role", [
  "owner",
  "admin",
  "member",
]);

export const secretCategoryEnum = pgEnum("secret_category", [
  "required",
  "custom",
]);

// ── Orgs & Users ───────────────────────────────────────────────

/** An organization — top-level tenant that owns harbors */
export const orgs = pgTable("orgs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 100 }).notNull().unique(),
  ...timestamps,
});

/** A user identified by Auth0 sub. Exists once across all orgs. */
export const users = pgTable(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    /** Auth0 user ID (e.g. "google-oauth2|123456") */
    auth0Id: varchar({ length: 255 }).notNull().unique(),
    email: varchar({ length: 255 }).notNull(),
    name: varchar({ length: 255 }),
    avatarUrl: varchar({ length: 500 }),
    ...timestamps,
  },
  (table) => ({
    auth0IdIdx: uniqueIndex("user_auth0_id_idx").on(table.auth0Id),
    emailIdx: index("user_email_idx").on(table.email),
  })
);

/** Links users to orgs with a role */
export const orgMembers = pgTable(
  "org_members",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    orgId: integer()
      .references(() => orgs.id)
      .notNull(),
    userId: integer()
      .references(() => users.id)
      .notNull(),
    role: orgMemberRoleEnum().notNull().default("member"),
    ...timestamps,
  },
  (table) => ({
    orgUserIdx: uniqueIndex("org_member_org_user_idx").on(
      table.orgId,
      table.userId
    ),
  })
);

// ── Harbors ────────────────────────────────────────────────────

/** A harbor is a deployment environment — an EC2 instance, a customer server, etc. */
export const harbors = pgTable(
  "harbors",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    orgId: integer()
      .references(() => orgs.id)
      .notNull(),
    name: varchar({ length: 255 }).notNull(),
    ...timestamps,
  },
  (table) => ({
    orgIdIdx: index("harbor_org_id_idx").on(table.orgId),
  })
);

// ── Agents ─────────────────────────────────────────────────────

export const agents = pgTable(
  "agents",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    role: agentRoleEnum().notNull(),
    sessionKey: varchar({ length: 255 }).notNull().unique(),
    level: agentLevelEnum(),
    harborId: integer().references(() => harbors.id),
    ...timestamps,
  },
  (table) => ({
    sessionKeyIdx: index("agent_session_key_idx").on(table.sessionKey),
  })
);

// ── Notifications ──────────────────────────────────────────────

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

// ── Secrets ────────────────────────────────────────────────────

export const secrets = pgTable(
  "secrets",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    category: secretCategoryEnum().notNull().default("custom"),
    description: varchar({ length: 500 }),
    encryptedValue: text(),
    iv: varchar({ length: 32 }),
    authTag: varchar({ length: 32 }),
    isSet: boolean().notNull().default(false),
    pendingSync: boolean().notNull().default(true),
    harborId: integer().references(() => harbors.id),
    ...timestamps,
  },
  (table) => ({
    harborNameIdx: index("secret_harbor_name_idx").on(
      table.harborId,
      table.name
    ),
  })
);

// ── Relations ──────────────────────────────────────────────────

export const orgsRelations = relations(orgs, ({ many }) => ({
  members: many(orgMembers),
  harbors: many(harbors),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(orgMembers),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  org: one(orgs, { fields: [orgMembers.orgId], references: [orgs.id] }),
  user: one(users, { fields: [orgMembers.userId], references: [users.id] }),
}));

export const harborsRelations = relations(harbors, ({ one, many }) => ({
  org: one(orgs, { fields: [harbors.orgId], references: [orgs.id] }),
  agents: many(agents),
  secrets: many(secrets),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  harbor: one(harbors, {
    fields: [agents.harborId],
    references: [harbors.id],
  }),
  notifications: many(notifications),
}));

export const secretsRelations = relations(secrets, ({ one }) => ({
  harbor: one(harbors, {
    fields: [secrets.harborId],
    references: [harbors.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  agent: one(agents, {
    fields: [notifications.agentId],
    references: [agents.id],
  }),
}));

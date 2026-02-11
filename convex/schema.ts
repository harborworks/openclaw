import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Organizations ──────────────────────────────────────────────────
  // The billing/account unit. Globally unique slug for URL routing.
  orgs: defineTable({
    name: v.string(),
    slug: v.string(),
    plan: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("enterprise"),
    ),
  }).index("by_slug", ["slug"]),

  // ── Users ──────────────────────────────────────────────────────────
  // Human accounts, linked to Cognito via cognitoSub.
  users: defineTable({
    name: v.string(),
    email: v.string(),
    cognitoSub: v.string(), // Cognito User Pool "sub" (unique identifier)
  })
    .index("by_email", ["email"])
    .index("by_cognito_sub", ["cognitoSub"]),

  // ── Memberships ────────────────────────────────────────────────────
  // Users belong to orgs with a role.
  memberships: defineTable({
    userId: v.id("users"),
    orgId: v.id("orgs"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member"),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["orgId"])
    .index("by_user_org", ["userId", "orgId"]),

  // ── Harbors ────────────────────────────────────────────────────────
  // A group of agents scoped to an org. Maps to one OpenClaw gateway.
  // Slug is unique within the org. Routes: /:orgSlug/:harborSlug/...
  harbors: defineTable({
    name: v.string(),
    slug: v.string(),
    orgId: v.id("orgs"),
    apiKeyHash: v.optional(v.string()), // bcrypt hash of the daemon API key
    publicKey: v.optional(v.string()), // RSA-OAEP JWK for secret encryption
    heartbeatIntervalMs: v.optional(v.number()),
  })
    .index("by_org", ["orgId"])
    .index("by_org_slug", ["orgId", "slug"]),

  // ── Agents ─────────────────────────────────────────────────────────
  // AI workers within a harbor.
  agents: defineTable({
    name: v.string(),
    sessionKey: v.string(),
    role: v.string(),
    level: v.optional(
      v.union(
        v.literal("intern"),
        v.literal("specialist"),
        v.literal("lead"),
      ),
    ),
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked"),
    ),
    currentTaskId: v.optional(v.id("tasks")),
    harborId: v.id("harbors"),
    telegramBotToken: v.optional(v.string()),
  })
    .index("by_session_key", ["sessionKey"])
    .index("by_harbor", ["harborId"]),

  // ── Tasks ──────────────────────────────────────────────────────────
  // Work items with a status lifecycle.
  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("ready_to_deploy"),
      v.literal("done"),
      v.literal("blocked"),
    ),
    assigneeIds: v.array(v.id("agents")),
    createdBy: v.optional(v.id("agents")),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent"),
      ),
    ),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    harborId: v.id("harbors"),
    qaApprovedBy: v.optional(v.union(v.id("agents"), v.null())),
    qaApprovedAt: v.optional(v.union(v.number(), v.null())),
  })
    .index("by_status", ["status"])
    .index("by_harbor", ["harborId"])
    .index("by_harbor_status", ["harborId", "status"]),

  // ── Messages ───────────────────────────────────────────────────────
  // Comments on tasks.
  messages: defineTable({
    taskId: v.id("tasks"),
    fromAgentId: v.id("agents"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
    mentions: v.optional(v.array(v.id("agents"))),
    harborId: v.id("harbors"),
  })
    .index("by_task", ["taskId"])
    .index("by_harbor", ["harborId"]),

  // ── Notifications ──────────────────────────────────────────────────
  // Delivered to agents via the daemon → gateway pipeline.
  notifications: defineTable({
    mentionedAgentId: v.id("agents"),
    content: v.string(),
    sourceTaskId: v.optional(v.id("tasks")),
    sourceMessageId: v.optional(v.id("messages")),
    delivered: v.boolean(),
    deliveredAt: v.optional(v.number()),
    harborId: v.id("harbors"),
  })
    .index("by_agent", ["mentionedAgentId"])
    .index("by_undelivered", ["delivered", "mentionedAgentId"])
    .index("by_harbor", ["harborId"]),

  // ── Activities ─────────────────────────────────────────────────────
  // Audit log / activity feed.
  activities: defineTable({
    type: v.union(
      v.literal("task_created"),
      v.literal("task_updated"),
      v.literal("task_assigned"),
      v.literal("task_status_changed"),
      v.literal("message_sent"),
      v.literal("document_created"),
      v.literal("agent_status_changed"),
    ),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    message: v.string(),
    metadata: v.optional(v.any()),
    harborId: v.id("harbors"),
  })
    .index("by_type", ["type"])
    .index("by_harbor", ["harborId"]),

  // ── Documents ──────────────────────────────────────────────────────
  // Deliverables and reference docs attached to tasks.
  documents: defineTable({
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("protocol"),
      v.literal("reference"),
      v.literal("draft"),
    ),
    taskId: v.optional(v.id("tasks")),
    createdBy: v.id("agents"),
    tags: v.optional(v.array(v.string())),
    harborId: v.id("harbors"),
  })
    .index("by_task", ["taskId"])
    .index("by_type", ["type"])
    .index("by_harbor", ["harborId"]),

  // ── Template Variables ─────────────────────────────────────────────
  // Harbor-level or agent-level config values rendered into workspace files.
  templateVars: defineTable({
    key: v.string(),
    value: v.any(),
    scope: v.union(v.literal("harbor"), v.literal("agent")),
    harborId: v.id("harbors"),
    agentId: v.optional(v.id("agents")),
  })
    .index("by_harbor", ["harborId"])
    .index("by_harbor_scope", ["harborId", "scope"])
    .index("by_agent", ["agentId"]),

  // ── Cron Jobs ──────────────────────────────────────────────────────
  // Scheduled tasks synced to the gateway by the daemon.
  cronJobs: defineTable({
    name: v.string(),
    agentId: v.optional(v.string()), // gateway sessionKey, not convex id
    enabled: v.boolean(),
    scheduleKind: v.union(
      v.literal("every"),
      v.literal("cron"),
      v.literal("at"),
    ),
    everyMs: v.optional(v.number()),
    cronExpr: v.optional(v.string()),
    cronTz: v.optional(v.string()),
    atTime: v.optional(v.string()), // ISO-8601
    sessionTarget: v.union(v.literal("main"), v.literal("isolated")),
    message: v.string(),
    gatewayJobId: v.optional(v.string()),
    lastStatus: v.optional(v.string()),
    lastRunAt: v.optional(v.number()),
    nextRunAt: v.optional(v.number()),
    harborId: v.id("harbors"),
  }).index("by_harbor", ["harborId"]),

  // ── Secrets ────────────────────────────────────────────────────────
  // Env vars encrypted with harbor's public key, synced to host by daemon.
  secrets: defineTable({
    name: v.string(),
    category: v.union(v.literal("required"), v.literal("custom")),
    description: v.optional(v.string()),
    pendingValue: v.optional(v.string()), // plaintext, cleared after daemon consumes
    isSet: v.boolean(),
    updatedAt: v.optional(v.number()),
    harborId: v.id("harbors"),
  })
    .index("by_harbor", ["harborId"])
    .index("by_harbor_name", ["harborId", "name"]),

  // ── Subscriptions ──────────────────────────────────────────────────
  // Agents subscribed to task threads for notifications.
  subscriptions: defineTable({
    agentId: v.id("agents"),
    taskId: v.id("tasks"),
    harborId: v.id("harbors"),
  })
    .index("by_agent", ["agentId"])
    .index("by_task", ["taskId"])
    .index("by_agent_task", ["agentId", "taskId"])
    .index("by_harbor", ["harborId"]),
});

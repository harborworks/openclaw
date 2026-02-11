# Harbor Works — Mission Control Architecture

## Overview

Mission Control is the web dashboard for managing AI agent workforces. It's built on **Convex** (backend-as-a-service) + **React** (frontend). A **daemon** process runs on the agent host and bridges Convex ↔ the OpenClaw gateway.

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                   │
│  React + Convex React client                        │
│  Real-time subscriptions (useQuery auto-updates)    │
└──────────────────────┬──────────────────────────────┘
                       │ WebSocket (automatic)
                       ▼
┌─────────────────────────────────────────────────────┐
│                  Convex Cloud                        │
│                                                      │
│  Tables: orgs, users, memberships, harbors, agents,  │
│          tasks, messages, activities, notifications, │
│          secrets, cronJobs, templateVars, documents, │
│          subscriptions                               │
│                                                      │
│  Functions:                                          │
│    queries  — read data (auto-cached, real-time)     │
│    mutations — write data (transactional, ACID)      │
│    actions  — side effects (call external APIs)      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP polling (1s)
                       ▼
┌─────────────────────────────────────────────────────┐
│              Daemon (Node.js, runs on host)          │
│                                                      │
│  Polls Convex for changes, syncs to gateway:         │
│    • Agent list → gateway config (agents, telegram)  │
│    • Template vars → workspace files (SOUL.md, etc)  │
│    • Heartbeat crons → gateway cron jobs             │
│    • User cron jobs → gateway cron jobs              │
│    • Secrets → ~/.openclaw/.env (encrypted at rest)  │
│                                                      │
│  Exposes HTTP API on :4747 for agents to interact    │
│  with tasks, messages, notifications                 │
└──────────────────────┬──────────────────────────────┘
                       │ WebSocket
                       ▼
┌─────────────────────────────────────────────────────┐
│                OpenClaw Gateway                      │
│  Manages agent sessions, messaging, cron jobs        │
└─────────────────────────────────────────────────────┘
```

## Key Concepts

### How Convex Works (for non-Convex developers)

**Convex is a hosted database + serverless functions platform.** You define your schema and functions in TypeScript. Convex hosts everything — no servers to manage, no SQL to write.

#### Schema (`convex/schema.ts`)
Defines all tables and their fields with runtime type validation. Think of it like Drizzle schemas but enforced at write time:

```ts
orgs: defineTable({
  name: v.string(),
  slug: v.string(),
  plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
}).index("by_slug", ["slug"])
```

- **Tables** are like SQL tables but document-oriented (no JOINs needed — you fetch related docs in your function)
- **Indexes** are explicit — you declare them in the schema
- Every document gets `_id` (typed!) and `_creationTime` automatically

#### Functions (the API layer)

Three types, defined in `convex/*.ts`:

| Type | Purpose | Properties |
|------|---------|------------|
| **query** | Read data | Cached, real-time, deterministic, no side effects |
| **mutation** | Write data | Transactional (ACID), can read+write, no side effects |
| **action** | Side effects | Can call external APIs, run mutations/queries internally |

**Queries are reactive.** When the frontend calls `useQuery(api.tasks.list)`, Convex automatically re-runs the query and pushes updates whenever the underlying data changes. No polling, no WebSocket setup — it just works.

**Mutations are transactional.** If a mutation inserts a task and then creates a notification, either both succeed or neither does.

**Actions are for side effects.** Calling external APIs, sending emails, etc. They can call mutations/queries internally but aren't transactional themselves.

#### Frontend Integration

```tsx
// This auto-updates when any task changes
const tasks = useQuery(api.tasks.list, { status: "in_progress" });

// This calls a mutation (write)
const createTask = useMutation(api.tasks.create);
await createTask({ title: "Fix bug", description: "..." });
```

No fetch calls, no loading states to manage for real-time data, no cache invalidation.

### Data Model

#### Hierarchy
```
Org (billing unit)
  └── Harbor (agent group — "a harbor")
        ├── Agents (AI workers)
        ├── Tasks (work items)
        │     ├── Messages (comments)
        │     └── Subscriptions (who gets notified)
        ├── Secrets (env vars, encrypted)
        ├── Cron Jobs (scheduled tasks)
        ├── Template Vars (config values)
        ├── Documents (deliverables)
        └── Activities (audit log)
```

- **Org**: The billing/account unit. Has a slug for URL routing.
- **Harbor**: A group of agents. Maps to one OpenClaw gateway. Has its own secrets, cron jobs, and templates. Named "Harbor" in the product.
- **Agent**: An AI worker with a `sessionKey` (maps to an OpenClaw agent), role, level, and optional Telegram bot token.
- **Task**: A work item with a status lifecycle: `todo → in_progress → review → done`
- **Message**: A comment on a task. Supports @mentions which create notifications.
- **Notification**: Delivered to agents via the daemon → gateway pipeline.
- **Secret**: An environment variable. Encrypted with the harbor's RSA public key. The daemon decrypts and writes to `~/.openclaw/.env`.
- **Cron Job**: Scheduled tasks synced to the gateway's cron system.

### Task Lifecycle

```
todo → in_progress → review → done
          ↑            │
          └────────────┘  (rejection)
```

**Rules (enforced at the app level):**
- Exactly one assignee at all times
- Status changes must also change the assignee — an agent cannot move a task without reassigning it

### Security: Harbor API Keys

Each harbor has an API key for daemon authentication:

1. When a harbor is created, the app generates a random API key (stored hashed in Convex)
2. User copies the key and sets it as an env var on the host (`HARBOR_API_KEY`)
3. Daemon sends it as a Bearer token on every request to Convex
4. Convex verifies the hash and resolves the harbor

Keys can be rotated from the UI. Standard shared-secret pattern over HTTPS.

### The Daemon

The daemon (`daemon/index.ts`) is the bridge between Convex and the local OpenClaw gateway. It:

1. **Polls Convex every 1s** for changes to agents, templates, secrets, cron jobs
2. **Syncs agent list** → gateway config (adds/removes agents, manages Telegram accounts)
3. **Renders templates** → agent workspace files (SOUL.md, HEARTBEAT.md, etc.)
4. **Manages heartbeat crons** → staggered health check schedules for each agent
5. **Syncs secrets** → decrypts pending secrets, writes to `~/.openclaw/.env`
6. **Syncs user cron jobs** → creates/updates/removes gateway cron jobs
7. **Exposes HTTP API** on `:4747` for agents to interact with tasks
8. **Runs a watchdog** — restarts the gateway if disconnected for >60s

### Frontend Pages

The app routes as `/:orgSlug/:harborName/...`:

- **KanbanBoard** — task board with drag-and-drop columns
- **AgentList** — manage agents, view status
- **SecretsManager** — set/view encrypted env vars
- **HarborConfig** — template vars, heartbeat interval
- **ActivityFeed** — audit log of all actions
- **CommandPalette** — keyboard-driven search/navigation

## Deploy

**Convex backend**: `npx convex deploy` — that's it. No servers, no Docker, no ALB.

**Frontend**: Static build (`vite build`) served from any CDN or static host. Currently runs in Docker with nginx, but could be S3+CloudFront.

**Daemon**: Runs as a Docker container or systemd service on the agent host alongside OpenClaw.

## What Exists vs What's Needed

### Already Built (in ~/code/mission-control)
- Full Convex schema with 12 tables
- Complete CRUD for orgs, harbors, agents, tasks, messages, notifications, secrets, cron jobs
- Task state machine with transition validation and QA gates
- Device authentication (RSA-PSS signing)
- Daemon with agent sync, template rendering, secret management, cron sync, watchdog
- React frontend with kanban board, agent management, secrets UI, activity feed
- Real-time updates throughout

### Needed for Harbor Works
- Cognito auth integration (replace current open access)
- Multi-harbor support in the UI
- Billing/plan enforcement
- Harbor provisioning flow (create harbor → spin up host → pair daemon)
- User management UI (invite users to org)

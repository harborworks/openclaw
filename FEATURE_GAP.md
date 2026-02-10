# Mission Control v2 — Feature Gap Analysis

Comparing OG Mission Control (Convex) → v2 POC (Postgres/Express/React).

## ✅ Already in v2

- **Kanban Board** — 6-column task board (inbox → done)
- **Task CRUD** — create, update, view tasks with title/description/status/priority/tags
- **Task Detail Sheet** — view task details + comments
- **Task Comments** — post comments with @mentions, notifications created
- **Agent Registry** — list agents, lookup by sessionKey
- **Notifications** — create on @mention/@all, mark delivered endpoint
- **Create Task Dialog** — UI for creating new tasks
- **Auth** — basic auth (password cookie) + API key for agents
- **Polling** — React Query 3s refetch

## ❌ Missing from v2

### Core (must-have for parity)

1. **Agent Management UI** — OG has full agent list page with add/edit/delete agents, role assignment, status display, level (intern/specialist/lead). v2 has no agent management page.

2. **Activity Feed** — OG tracks task_created, task_updated, task_assigned, task_status_changed, message_sent, document_created, agent_status_changed events. Displayed on dedicated Activity tab. v2 has no activity tracking or feed.

3. **Global Search (Cmd+K / "/")** — OG has CommandPalette-style search across tasks, agents, comments. v2 has no search.

4. **Task Detail: Assignee Display** — OG resolves agent IDs to names in task detail and board cards. v2 likely shows raw IDs.

5. **@mention Rendering** — OG has MentionText component that renders @AgentName as styled inline badges in comments. v2 backend parses mentions but unclear if frontend renders them.

6. **Blocked Status Column** — OG schema includes "blocked" as a task status. v2 schema has 6 statuses (no blocked).

7. **QA Approval Tracking** — OG has `qaApprovedBy`, `qaApprovedAt` fields on tasks + dedicated `/tasks/:id/approve-qa` endpoint. v2 has neither.

8. **Due Dates on Tasks** — OG schema has `dueDate` field. v2 schema doesn't include it.

### Shire/Org Management

9. **Org/Shire Switcher** — OG has multi-org, multi-shire with a switcher dropdown in header. v2 is single-tenant (no org/shire switching UI).

10. **Shire Config Page** — OG has dedicated config page for shire-level settings and template variables (TemplateVarsEditor). v2 has nothing.

### Scheduling

11. **Calendar/Schedule View** — OG has full CalendarView for managing cron jobs: create/edit/delete schedules with ScheduleBuilder UI (human-friendly cron/interval/one-shot). v2 has no scheduling UI.

### Secrets

12. **Secrets Manager** — OG has UI to manage env vars/secrets per shire (add, view status, mark as set). Daemon syncs to host. v2 has nothing.

### Documents

13. **Documents System** — OG has documents table (deliverable, research, protocol, reference, draft types) with task attachments. v2 has no document support.

### Gateway Integration

14. **Gateway Connect** — OG has UI to connect/disconnect to the OpenClaw gateway, showing connection status. v2 has no gateway awareness.

### Infrastructure

15. **Thread Subscriptions** — OG has subscriptions table so agents can subscribe to task threads and get notified of all comments (not just @mentions). v2 only has @mention notifications.

16. **Task Assignee Resolution in API** — OG daemon resolves sessionKey → Convex ID for assigneeIds in create/update. v2 backend does this for `fromAgentId` but need to verify assigneeIds handling.

## 📋 Recommended Priority Order

**Phase 1 — Core usability (ship first):**
1. Agent Management UI (list, add, edit, delete)
2. Assignee name resolution on board cards + detail
3. @mention rendering in comments
4. QA approval tracking
5. Blocked status column
6. Due dates on tasks
7. Activity feed (backend + UI)

**Phase 2 — Power features:**
8. Global search
9. Calendar/schedule view (cron job management)
10. Thread subscriptions

**Phase 3 — Shire management:**
11. Secrets manager
12. Shire config / template vars
13. Org/shire switcher (if multi-tenant needed)
14. Documents system
15. Gateway connect UI

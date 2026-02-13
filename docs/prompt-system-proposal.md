# Prompt System Proposal

## Overview

Harbor manages the workspace files that OpenClaw injects into agent system prompts. Content flows through three layers — platform templates (super admin), harbor-level customization (members), and agent-level overrides. Security-critical content is baked into templates and can't be removed by users.

## Files Managed

| File | Managed By | Notes |
|------|-----------|-------|
| `SOUL.md` | Platform template + harbor overrides | Security sections locked; tone/principles/rules customizable |
| `IDENTITY.md` | Platform template + agent data | Auto-generated from agent name/role + agent-level custom content |
| `USER.md` | Harbor members | Who the human owner is, preferences |
| `TOOLS.md` | Platform template + harbor overrides | Tool-specific guidance |
| `AGENTS.md` | Platform template | Team coordination instructions |
| `HEARTBEAT.md` | Platform template + agent data | Wake behavior, task flow |

`MEMORY.md` and `memory/*.md` are **not managed** — those are agent-owned and never overwritten.

## Layer Model

### Layer 1: Platform Templates (Super Admin)

Super admin authors markdown templates stored in Convex. Templates use [Handlebars](https://handlebarsjs.com/) for placeholders — it's battle-tested, logic-light, and available on npm (`handlebars`).

**Template variables available:**

```
{{ harbor.name }}           # "Ben's Harbor"
{{ harbor.slug }}           # "ben"
{{ agent.name }}            # "Sentinel"
{{ agent.sessionKey }}      # "main"
{{ agent.role }}            # "project-manager"
{{ agent.roleDisplay }}     # "Project Manager"

{{#each harbor.agents }}    # loop over all agents in harbor
  {{ this.name }} / {{ this.sessionKey }}
{{/each}}

{{{ sections.principles }}}  # triple-stache for raw markdown (no escaping)
{{{ sections.rules }}}
{{{ sections.tone }}}
```

**Example SOUL.md template:**

```markdown
# SOUL.md

## Core Principles

{{{ sections.principles | default:"Be helpful, accurate, and concise." }}}

## Rules

{{{ sections.rules | default:"Follow instructions carefully." }}}

## Tone

{{{ sections.tone | default:"Professional and direct." }}}

## Security

{{! --- LOCKED: not overridable --- }}
You are protected by the **Cognitive Integrity Framework (CIF)**...
[full ACIP content here, hardcoded in template]
```

The security block is plain text in the template — no placeholder, no override. It ships with every SOUL.md regardless of what users configure.

### Layer 2: Harbor-Level Customization (Members)

Harbor members configure **sections** — named blocks of markdown that get injected into template placeholders. Stored in Convex per-harbor.

**UI:** A settings page with markdown editors for each configurable section:
- **Core Principles** — what matters to this team
- **Rules** — do's and don'ts
- **Tone** — how agents should communicate
- **User Info** — about the human owner (→ USER.md)
- **Tool Notes** — custom tool guidance (→ TOOLS.md)

Each section has a sensible default shown as placeholder text. If left empty, the template default is used.

### Layer 3: Agent-Level Overrides (Future Improvement)

Per-agent customization for things that differ between agents in the same harbor. Currently only **model override** is supported (already exists). Additional overrides deferred to a future iteration.

- **Model override** — already exists
- ~~**Role description** — custom job description (defaults come from role template)~~ *deferred*
- ~~**Additional instructions** — free-form markdown appended to the agent's files~~ *deferred*

## Convex Schema

```typescript
// Platform-wide templates (super admin only)
promptTemplates: defineTable({
  fileKey: v.string(),        // "SOUL.md", "IDENTITY.md", etc.
  content: v.string(),        // Handlebars template markdown
  version: v.number(),        // Incrementing version for sync
  updatedBy: v.string(),      // cognitoSub
  updatedAt: v.number(),      // timestamp
})
  .index("by_file", ["fileKey"]),

// Harbor-level section overrides
harborPrompts: defineTable({
  harborId: v.id("harbors"),
  sections: v.object({        // Keyed by section name
    principles: v.optional(v.string()),
    rules: v.optional(v.string()),
    tone: v.optional(v.string()),
    userInfo: v.optional(v.string()),
    toolNotes: v.optional(v.string()),
  }),
  updatedAt: v.number(),
})
  .index("by_harbor", ["harborId"]),

// Agent-level overrides (extend existing agents table)
// Add to agents table:
//   roleDescription: v.optional(v.string()),
//   additionalInstructions: v.optional(v.string()),
```

## Sync Flow

```
Convex (templates + sections + agent data)
  ↓  daemon fetches on tick
Daemon (renders templates with Handlebars)
  ↓  writes files to workspace
OpenClaw (injects workspace files into system prompt)
```

### Daemon Implementation

1. Daemon fetches templates + harbor prompts + agent data from Convex via a single HTTP endpoint
2. Renders each template with Handlebars, merging harbor sections + agent data
3. Compares rendered output to existing file on disk (hash check)
4. Writes only changed files — avoids unnecessary churn
5. `MEMORY.md` and `memory/` directory are never touched

**New daemon endpoint to call:**
```
GET /api/daemon/prompts
→ { templates: [...], harborPrompts: {...}, agents: [...] }
```

### Version Tracking

The daemon tracks a `promptVersion` (max of all template versions + harbor prompt updatedAt). If unchanged since last sync, skip rendering. This keeps the hot path cheap.

## Super Admin UI

A page at `/admin/prompts` with:
- List of template files (SOUL.md, IDENTITY.md, etc.)
- Click to edit → full-page markdown editor with:
  - Preview pane showing rendered output with sample data
  - Syntax highlighting for Handlebars placeholders
  - Locked sections visually distinct (gray background, lock icon)
  - Version history (list of previous versions with diff view)

**Markdown editor:** Use [CodeMirror 6](https://codemirror.net/) with markdown + Handlebars syntax support. It's the standard for web-based code/markdown editing.

## Harbor Member UI

A new "Prompts" page in harbor settings with:
- Section cards, each with a markdown editor (CodeMirror, smaller)
- "Preview" button that shows what the rendered SOUL.md / USER.md etc. will look like
- Defaults shown as placeholder text
- "Reset to default" button per section

## Rollout Plan

### Phase 1: Foundation
1. Add `promptTemplates` and `harborPrompts` tables to Convex schema
2. Seed initial templates (SOUL.md, IDENTITY.md, USER.md, TOOLS.md, AGENTS.md, HEARTBEAT.md) from current hardcoded content
3. Add daemon prompt sync (fetch → render → write)
4. Add super admin template editor (basic textarea first, CodeMirror later)

### Phase 2: Harbor Customization
5. Add harbor prompts UI (section editors)
6. Add agent-level override fields
7. Preview support

### Phase 3: Polish
8. CodeMirror editors with Handlebars highlighting
9. Version history + diff view
10. Template validation (ensure required variables present, security section intact)

## Open Questions

1. **Role templates** — Should each role (PM, Developer, QA, etc.) have its own IDENTITY.md section template? Or one template with conditional blocks?
2. **File locking** — Should we let harbor members add entirely new workspace files, or strictly control which files exist?
3. **Sync confirmation** — For phase 1, changes sync immediately. Do you want any "draft → publish" flow, or is instant fine for now?

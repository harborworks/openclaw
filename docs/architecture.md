# Harbor App Architecture

## URL Structure & Navigation

Routes follow the pattern `/:orgSlug/:harborSlug/<feature>`:

```
/sparrow/main/secrets
/sparrow/main/agents    (future)
/sparrow/staging/secrets
```

### Resolution Flow

1. `HarborProvider` reads `orgSlug` and `harborSlug` from URL params
2. `orgs.resolveBySlug` verifies the user has membership in the org and the harbor exists
3. If invalid → redirect to `/`
4. If valid → provides `HarborContext` (harborId, orgId, basePath, etc.) to all child routes

### Auto-redirect

On `/`, `HarborRedirect` checks:
1. `lastOrgSlug`/`lastHarborSlug` on the user record (set on every navigation)
2. Falls back to first org/first harbor via `orgs.listWithHarbors`

### Data Model Notes

- **Org slugs** are globally unique (`orgs.by_slug` index)
- **Harbor slugs** are unique within an org (`harbors.by_org_slug` index)
- **Users** no longer have a `name` field (deprecated, optional). Identified by email.
- **Users** store `lastOrgSlug`/`lastHarborSlug` for redirect preference

## Secrets & Config Pipeline

### Overview

Secrets flow from the Harbor app UI to the host gateway through an encrypted pipeline:

```
Browser → Convex (encrypted) → Daemon (decrypt) → .env file → Gateway
```

### Secret Types

Not all secrets are equal. Some are plain env vars, others require gateway config changes.

**Plain env vars** — The gateway reads them directly from `.env`. No config change needed.
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

**Config-linked secrets** — Setting these requires both an env var AND a gateway config patch. Without the config patch, the gateway doesn't know to use the env var.
- `TELEGRAM_BOT_TOKEN` → patches `channels.telegram` + `plugins.entries.telegram`
- `BRAVE_SEARCH_API_KEY` → patches `tools.web.search`

### Daemon Behavior

When the daemon processes a pending secret:

1. Decrypt the value (RSA-OAEP)
2. Write to `~/.openclaw/.env`
3. If the secret has an associated config patch, apply it via `config.patch` over WebSocket
4. Gateway restarts, picks up both the new env var and the config that references it

### Config Patch Strategy

Config patches for known keys are **hardcoded in the daemon**. This keeps things simple and predictable for the current set of integrations.

```
TELEGRAM_BOT_TOKEN → {
  channels: { telegram: { botToken: "${TELEGRAM_BOT_TOKEN}", enabled: true, dmPolicy: "pairing", groupPolicy: "allowlist", streamMode: "block" } },
  plugins: { entries: { telegram: { enabled: true } } }
}

BRAVE_SEARCH_API_KEY → {
  tools: { web: { search: { apiKey: "${BRAVE_SEARCH_API_KEY}", provider: "brave" } } }
}
```

**Future evolution:**
- Config patches stored on the secret record in Convex (UI-defined)
- Higher-level "integrations" concept — enabling Telegram is a toggle that sets both the secret and the config
- Per-harbor config overrides

### Default Config

The daemon patches a base config into the gateway on startup (`daemon/scripts/openclaw-config.json`). This provides:
- Auth profile for Anthropic
- Agent defaults (opus model, main agent with workspace)
- Tool sandbox allowlist
- Gateway auth token
- `commands.restart: true` (required for WS-based restarts)

Only references env vars that are guaranteed to exist (`OPENCLAW_GATEWAY_TOKEN`, `HOME`). Optional integrations (Telegram, Brave) are patched in when their secrets are set.

## Host Deployment

### Image Pipeline

```
git tag v0.x.x → GH Actions → Build → Push to ECR → deploy-host.sh → Host
```

Two ECR images:
- `harbor-daemon` — polls Convex, syncs secrets, manages gateway config
- `harbor-gateway` — OpenClaw gateway (openclaw from npm + env watcher entrypoint)

### Deploy Flow

First deploy:
```bash
./scripts/deploy-host.sh <host-name> --harbor-id <id> --api-key <key> --daemon-version v0.x.x --gateway-version v0.x.x
```

Update:
```bash
./scripts/deploy-host.sh <host-name> --daemon-version v0.x.x --gateway-version v0.x.x
```

The script:
1. Resolves EC2 instance ID from host name tag (`harbor-host-<name>`)
2. Creates deploy dirs with correct ownership (UID 1000 for node user)
3. Copies `docker-compose.yml` and writes `.env.host`
4. Clears stale `openclaw.json` (daemon re-patches on startup)
5. ECR login, pull, start — all via SSM (no SSH)

### Authentication

- **UI → Convex**: Cognito auth (existing)
- **Daemon → Convex**: HTTP API endpoints with `Authorization: Bearer <apiKey>` + `X-Harbor-ID` header. API key is SHA-256 hashed in Convex, generated once per harbor.
- **Daemon → Gateway**: WebSocket with optional gateway token
- **Daemon-facing Convex functions**: `internalQuery`/`internalMutation` only — not callable from outside Convex directly

## Docker Compose Stack

```
┌─────────────┐     ┌─────────────┐
│   daemon    │────▶│   gateway   │
│  (polls     │ WS  │  (openclaw) │
│   Convex)   │     │             │
└─────────────┘     └─────────────┘
      │                    │
      ▼                    ▼
  ~/.openclaw/.env    ~/.openclaw/openclaw.json
  (shared volume)     (shared volume)
```

The daemon and gateway share a config volume. The daemon writes `.env` and patches `openclaw.json` via WS. The gateway has an env watcher that restarts when `.env` changes.

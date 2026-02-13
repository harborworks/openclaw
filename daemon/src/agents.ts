/**
 * Agent Sync — bridges Convex agent CRUD to gateway config + workspace files.
 *
 * On each tick:
 * 1. Fetches agents from Convex
 * 2. Compares to current gateway config
 * 3. Creates/updates/archives agents as needed
 */

import * as fs from "fs";
import * as path from "path";
import type { ConvexApiConfig } from "./secrets.js";
import { GatewayClient, configApi } from "./gateway-client.js";
import { convexGet } from "./utils.js";

function log(msg: string) {
  console.log(`[agents] ${new Date().toISOString()} ${msg}`);
}

// --- Types ---

export interface ConvexAgent {
  _id: string;
  name: string;
  sessionKey: string;
  role: string;
  model?: string;
  status: string;
  roleDescription?: string;
  additionalInstructions?: string;
  telegramBotToken?: string;
}

interface GatewayAgentConfig {
  id: string;
  workspace: string;
  model?: { primary: string };
  [key: string]: unknown;
}

// --- Model mapping ---

/** Map our model values to OpenClaw model refs and aliases. */
const MODEL_MAP: Record<string, { ref: string; alias: string }> = {
  "opus4.6": { ref: "anthropic/claude-opus-4-6", alias: "Opus" },
  "sonnet4.5": { ref: "anthropic/claude-sonnet-4-5", alias: "Sonnet" },
  "haiku4.5": { ref: "anthropic/claude-haiku-4-5", alias: "Haiku" },
};

// --- Convex API ---

export async function fetchAgents(api: ConvexApiConfig): Promise<ConvexAgent[]> {
  return convexGet<ConvexAgent[]>(api, "/api/daemon/agents");
}

// --- Workspace scaffolding ---
// Only creates the directory and MEMORY.md (which the prompt system won't touch).

function scaffoldWorkspace(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  const memoryPath = path.join(dir, "MEMORY.md");
  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, "# MEMORY.md\n");
    log(`  Created MEMORY.md`);
  }
}

function archiveWorkspace(workspacesDir: string, agentId: string): void {
  const srcDir = path.join(workspacesDir, agentId);
  if (!fs.existsSync(srcDir)) return;

  const archiveDir = path.join(workspacesDir, ".archived");
  fs.mkdirSync(archiveDir, { recursive: true });

  const destDir = path.join(archiveDir, `${agentId}-${Date.now()}`);
  fs.renameSync(srcDir, destDir);
  log(`  Archived workspace ${agentId} → .archived/`);
}

// --- Gateway config sync ---

function buildAgentListEntry(agent: ConvexAgent, workspacesDir: string): GatewayAgentConfig {
  const entry: GatewayAgentConfig = {
    id: agent.sessionKey,
    workspace: path.join(workspacesDir, agent.sessionKey),
  };
  if (agent.model && MODEL_MAP[agent.model]) {
    entry.model = { primary: MODEL_MAP[agent.model].ref };
  }
  return entry;
}

function buildModelsMap(): Record<string, { alias: string }> {
  const models: Record<string, { alias: string }> = {};
  for (const [, { ref, alias }] of Object.entries(MODEL_MAP)) {
    models[ref] = { alias };
  }
  return models;
}

// --- Main sync ---

/** In-memory cache of last synced state to detect changes. */
let lastSyncedState: string = "";

export async function syncAgents(
  api: ConvexApiConfig,
  gateway: GatewayClient,
  workspacesDir: string,
): Promise<void> {
  if (!gateway.isConnected) return;

  // 1. Fetch current agents from Convex
  const convexAgents = await fetchAgents(api);

  // 2. Build a fingerprint to detect changes
  const stateFingerprint = JSON.stringify(
    convexAgents.map((a) => ({ id: a.sessionKey, name: a.name, role: a.role, model: a.model, tg: a.telegramBotToken ?? null }))
      .sort((a, b) => a.id.localeCompare(b.id))
  );

  if (stateFingerprint === lastSyncedState) return; // No changes

  log(`Agent changes detected — syncing ${convexAgents.length} agent(s)`);

  // 3. Get current gateway config
  const current = await configApi(gateway).get();
  const config = current.config as Record<string, unknown>;
  const agents = (config.agents ?? {}) as Record<string, unknown>;
  const defaults = (agents.defaults ?? {}) as Record<string, unknown>;
  const currentList = ((agents.list ?? []) as GatewayAgentConfig[]);

  // Build set of current gateway agent IDs
  const currentIds = new Set(currentList.map((a) => a.id));
  const convexIds = new Set(convexAgents.map((a) => a.sessionKey));

  // 4. Determine creates, updates, deletes
  const toCreate = convexAgents.filter((a) => !currentIds.has(a.sessionKey));
  const toDelete = currentList.filter((a) => !convexIds.has(a.id));
  const toUpdate = convexAgents.filter((a) => currentIds.has(a.sessionKey));

  // 5. Handle workspaces for new agents
  for (const agent of toCreate) {
    log(`Creating agent: ${agent.sessionKey} (${agent.name})`);
    const dir = path.join(workspacesDir, agent.sessionKey);
    scaffoldWorkspace(dir);
  }

  // 6. Ensure workspace exists for existing agents
  for (const agent of toUpdate) {
    const dir = path.join(workspacesDir, agent.sessionKey);
    if (!fs.existsSync(dir)) {
      log(`Recreating workspace for ${agent.sessionKey}`);
      scaffoldWorkspace(dir);
    }
  }

  // 7. Archive deleted agents
  for (const agent of toDelete) {
    log(`Archiving agent: ${agent.id}`);
    archiveWorkspace(workspacesDir, agent.id);
  }

  // 8. Build new agent list for gateway config
  const newList = convexAgents.map((a) => buildAgentListEntry(a, workspacesDir));

  // 9. Build Telegram accounts + bindings for agents with bot tokens
  const telegramAccounts: Record<string, unknown> = {};
  const bindings: Array<Record<string, unknown>> = [];
  for (const agent of convexAgents) {
    if (agent.telegramBotToken) {
      telegramAccounts[agent.sessionKey] = {
        name: agent.name,
        botToken: agent.telegramBotToken,
      };
      bindings.push({
        agentId: agent.sessionKey,
        match: { channel: "telegram", accountId: agent.sessionKey },
      });
    }
  }

  const hasTelegram = Object.keys(telegramAccounts).length > 0;

  // 10. Build the config patch
  // Only manage models catalog + agent list. Leave defaults.model alone
  // (that's the harbor-wide default, set by static config).
  const patch: Record<string, unknown> = {
    agents: {
      defaults: {
        ...defaults,
        models: buildModelsMap(),
      },
      list: newList,
    },
    ...(hasTelegram ? {
      channels: {
        telegram: {
          enabled: true,
          dmPolicy: "pairing",
          accounts: telegramAccounts,
        },
      },
      plugins: {
        entries: {
          telegram: { enabled: true },
        },
      },
      bindings,
    } : {
      channels: {
        telegram: {
          enabled: false,
        },
      },
      bindings: [],
    }),
  };

  // 11. Apply config patch
  try {
    await configApi(gateway).patch(JSON.stringify(patch), current.hash!);
    log(`Gateway config updated (${newList.length} agent(s))`);
    lastSyncedState = stateFingerprint;
  } catch (err) {
    log(`Failed to patch gateway config: ${err instanceof Error ? err.message : err}`);
  }
}

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
  "opus4.6": { ref: "anthropic/claude-opus-4-6", alias: "Opus 4.6" },
};

// --- Convex API ---

export async function fetchAgents(api: ConvexApiConfig): Promise<ConvexAgent[]> {
  const url = `${api.convexUrl}/api/daemon/agents`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${api.apiKey}`,
      "X-Harbor-ID": api.harborId,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`);
  return res.json();
}

// --- Workspace scaffolding ---

const WORKSPACE_FILES: Record<string, (agent: ConvexAgent) => string> = {
  "IDENTITY.md": (a) => `# ${a.name}\n\n**Role:** ${a.role}\n**Agent ID:** ${a.sessionKey}\n`,
  "MEMORY.md": () => `# MEMORY.md\n`,
  "AGENTS.md": () => `# AGENTS.md\n`,
};

function scaffoldWorkspace(dir: string, agent: ConvexAgent): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const [file, generator] of Object.entries(WORKSPACE_FILES)) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, generator(agent));
      log(`  Created ${file}`);
    }
  }
}

function updateIdentity(dir: string, agent: ConvexAgent): void {
  const filePath = path.join(dir, "IDENTITY.md");
  const content = WORKSPACE_FILES["IDENTITY.md"](agent);
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
  if (existing !== content) {
    fs.writeFileSync(filePath, content);
    log(`  Updated IDENTITY.md for ${agent.sessionKey}`);
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
    convexAgents.map((a) => ({ id: a.sessionKey, name: a.name, role: a.role, model: a.model }))
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
    scaffoldWorkspace(dir, agent);
  }

  // 6. Handle workspace updates for existing agents
  for (const agent of toUpdate) {
    const dir = path.join(workspacesDir, agent.sessionKey);
    if (fs.existsSync(dir)) {
      updateIdentity(dir, agent);
    } else {
      // Workspace missing — recreate
      log(`Recreating workspace for ${agent.sessionKey}`);
      scaffoldWorkspace(dir, agent);
    }
  }

  // 7. Archive deleted agents
  for (const agent of toDelete) {
    log(`Archiving agent: ${agent.id}`);
    archiveWorkspace(workspacesDir, agent.id);
  }

  // 8. Build new agent list for gateway config
  const newList = convexAgents.map((a) => buildAgentListEntry(a, workspacesDir));

  // 9. Build the config patch
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
  };

  // 10. Apply config patch
  try {
    await configApi(gateway).patch(JSON.stringify(patch), current.hash!);
    log(`Gateway config updated (${newList.length} agent(s))`);
    lastSyncedState = stateFingerprint;
  } catch (err) {
    log(`Failed to patch gateway config: ${err instanceof Error ? err.message : err}`);
  }
}

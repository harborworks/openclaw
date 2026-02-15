/**
 * Harbor Daemon
 *
 * Bridges the Harbor app (Convex) with the local OpenClaw gateway.
 * Polls Convex for changes and syncs secrets to the host environment.
 */

import * as fs from "fs";
import * as path from "path";
import { initKeypair, syncSecrets, registerPublicKey } from "./secrets.js";
import type { ConvexApiConfig } from "./secrets.js";
import { GatewayClient, configApi } from "./gateway-client.js";
import { syncAgents, fetchAgents } from "./agents.js";
import { syncPrompts } from "./prompts.js";
import { syncPairing } from "./pairing.js";
import { handleTaskRequest } from "./tasks.js";
import { syncCronJobs } from "./cron.js";
import type { ConvexAgent } from "./agents.js";
import { convexGet } from "./utils.js";

// --- Config ---
const TICK_INTERVAL_MS = parseInt(process.env.TICK_INTERVAL_MS || "5000", 10);
const CONVEX_URL = process.env.CONVEX_URL || "";
const HARBOR_ID = process.env.HARBOR_ID || "";
const HARBOR_API_KEY = process.env.HARBOR_API_KEY || "";
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:18789";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";
const DAEMON_PORT = parseInt(process.env.DAEMON_PORT || "4747", 10);

const WORKSPACES_DIR = process.env.WORKSPACES_DIR ?? path.join(
  process.env.HOME ?? "/home/ubuntu", "workspaces"
);
const CONFIG_DIR = process.env.OPENCLAW_CONFIG_DIR ?? path.join(
  process.env.HOME ?? "/home/ubuntu", ".openclaw"
);

// Path to default config that gets merged into gateway config on startup
const DEFAULT_CONFIG_PATH = process.env.DEFAULT_CONFIG_PATH
  ?? path.resolve(import.meta.dirname ?? ".", "../scripts/openclaw-config.json");

function log(msg: string) {
  console.log(`[daemon] ${new Date().toISOString()} ${msg}`);
}

function checkConfig() {
  const missing: string[] = [];
  if (!CONVEX_URL) missing.push("CONVEX_URL");
  if (!HARBOR_ID) missing.push("HARBOR_ID");
  if (!HARBOR_API_KEY) missing.push("HARBOR_API_KEY");
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
}

let convexApi: ConvexApiConfig;
let gateway: GatewayClient;
let cachedAgents: ConvexAgent[] = [];
let harborHeartbeatIntervalMs: number | undefined;

/** Load default config and patch it into the gateway. */
async function applyDefaultConfig(): Promise<void> {
  let defaults: Record<string, unknown> = {};
  try {
    const raw = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf-8");
    defaults = JSON.parse(raw);
    log(`Loaded default config from ${DEFAULT_CONFIG_PATH}`);
  } catch (err) {
    log(`No default config found at ${DEFAULT_CONFIG_PATH} — skipping`);
    return;
  }

  if (Object.keys(defaults).length === 0) return;

  // Inject sandbox config only when sandboxing is enabled.
  const agents = (defaults.agents ?? {}) as Record<string, unknown>;
  const defs = (agents.defaults ?? {}) as Record<string, unknown>;
  const sandbox = (defs.sandbox ?? {}) as Record<string, unknown>;
  const sandboxMode = (sandbox.mode as string) ?? "off";

  if (sandboxMode !== "off") {
    // HOST_WORKSPACE_DIR is the actual host path (e.g. /home/ubuntu/harbor/workspaces).
    // Docker bind mounts always reference host paths, even when invoked from a container.
    const hostWorkspaceDir = process.env.HOST_WORKSPACE_DIR || WORKSPACES_DIR;
    const hostHarborRoot = path.dirname(hostWorkspaceDir);
    const docker = (sandbox.docker ?? {}) as Record<string, unknown>;
    docker.image = process.env.SANDBOX_IMAGE || docker.image || "harbor-sandbox:latest";
    docker.binds = [
      `${hostHarborRoot}/vault:/workspace/vault:rw`,
      `${hostHarborRoot}/knowledge:/workspace/knowledge:rw`,
    ];
    sandbox.docker = docker;
    defs.sandbox = sandbox;
  }
  agents.defaults = defs;
  defaults.agents = agents;

  try {
    const current = await configApi(gateway).get();
    await configApi(gateway).patch(JSON.stringify(defaults), current.hash!);
    log(`Patched gateway config with defaults: ${Object.keys(defaults).join(", ")}`);
  } catch (err) {
    log(`Failed to patch gateway config: ${err instanceof Error ? err.message : err}`);
  }
}

/** Patch additional config into the gateway (e.g. for config-linked secrets). */
async function patchGatewayConfig(patch: Record<string, unknown>): Promise<void> {
  if (!gateway.isConnected) {
    log("Gateway not connected — skipping config patch");
    return;
  }
  try {
    const current = await configApi(gateway).get();
    await configApi(gateway).patch(JSON.stringify(patch), current.hash!);
    log(`Patched gateway config: ${Object.keys(patch).join(", ")}`);
  } catch (err) {
    log(`Failed to patch gateway config: ${err instanceof Error ? err.message : err}`);
  }
}

async function tick() {
  if (!gateway.isConnected) return;

  try {
    const harborConfig = await convexGet<{ heartbeatIntervalMs?: number }>(convexApi, "/api/daemon/harbor");
    harborHeartbeatIntervalMs = harborConfig.heartbeatIntervalMs;
  } catch (err) {
    log(`Harbor config fetch error: ${err instanceof Error ? err.message : err}`);
  }

  try {
    await syncSecrets(convexApi, patchGatewayConfig);
  } catch (err) {
    log(`Secrets sync error: ${err instanceof Error ? err.message : err}`);
  }

  let agents: ConvexAgent[] = [];
  try {
    agents = await fetchAgents(convexApi);
    cachedAgents = agents;
    await syncAgents(convexApi, gateway, WORKSPACES_DIR);
  } catch (err) {
    log(`Agent sync error: ${err instanceof Error ? err.message : err}`);
  }

  try {
    await syncPrompts(convexApi, agents, WORKSPACES_DIR);
  } catch (err) {
    log(`Prompt sync error: ${err instanceof Error ? err.message : err}`);
  }

  try {
    const credentialsDir = path.join(CONFIG_DIR, "credentials");
    await syncPairing(convexApi, credentialsDir);
  } catch (err) {
    log(`Pairing sync error: ${err instanceof Error ? err.message : err}`);
  }

  try {
    await syncCronJobs(gateway, agents, harborHeartbeatIntervalMs);
  } catch (err) {
    log(`Cron sync error: ${err instanceof Error ? err.message : err}`);
  }
}

async function startHttpServer() {
  const { createServer } = await import("node:http");

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${DAEMON_PORT}`);

    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    // Task API routes
    try {
      const handled = await handleTaskRequest(req, res, url, convexApi, cachedAgents);
      if (handled) return;
    } catch (err) {
      log(`Task request error: ${err instanceof Error ? err.message : err}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  server.listen(DAEMON_PORT, () => {
    log(`HTTP server listening on :${DAEMON_PORT}`);
  });
}

async function main() {
  log("Harbor Daemon starting");
  log(`  CONVEX_URL=${CONVEX_URL || "(not set)"}`);
  log(`  HARBOR_ID=${HARBOR_ID || "(not set)"}`);
  log(`  HARBOR_API_KEY=${HARBOR_API_KEY ? "(set)" : "(not set)"}`);
  log(`  GATEWAY_URL=${GATEWAY_URL}`);
  log(`  CONFIG_DIR=${CONFIG_DIR}`);
  log(`  WORKSPACES_DIR=${WORKSPACES_DIR}`);
  log(`  TICK_INTERVAL_MS=${TICK_INTERVAL_MS}`);

  checkConfig();

  // Configure Convex HTTP API client
  // HTTP actions are served at .convex.site, not .convex.cloud
  const siteUrl = CONVEX_URL.replace(/\.convex\.cloud$/, ".convex.site");
  convexApi = { convexUrl: siteUrl, harborId: HARBOR_ID, apiKey: HARBOR_API_KEY };
  log(`  CONVEX_SITE_URL=${siteUrl}`);

  // Init keypair and publish public key via HTTP API
  const publicKeyJwk = initKeypair(CONFIG_DIR);
  await registerPublicKey(convexApi, publicKeyJwk);
  log("Published public key to Convex");

  // Connect to gateway via WebSocket
  let defaultsApplied = false;
  let defaultsReady: () => void;
  const defaultsPromise = new Promise<void>((resolve) => { defaultsReady = resolve; });

  const gwWsUrl = GATEWAY_URL.replace(/^http/, "ws");
  gateway = new GatewayClient({
    url: gwWsUrl,
    token: GATEWAY_TOKEN || undefined,
    onConnect: async () => {
      log("Gateway WebSocket connected");
      if (!defaultsApplied) {
        defaultsApplied = true;
        await applyDefaultConfig();
        defaultsReady!();
      }
    },
    onDisconnect: () => log("Gateway WebSocket disconnected (will reconnect)"),
    onError: (err) => log(`Gateway WebSocket error: ${err.message}`),
  });

  try {
    await gateway.connect();
  } catch (err) {
    log(`Initial gateway connection failed: ${err instanceof Error ? err.message : err}`);
    log("Will retry in background...");
    // Resolve so tick loop can start even without defaults (sandbox will be off)
    defaultsReady!();
  }

  // Wait for defaults to be applied before starting the tick loop.
  // This prevents syncAgents from clobbering sandbox config in a race.
  await defaultsPromise;

  await startHttpServer();

  log("Starting poll loop...");

  // Main loop
  while (true) {
    try {
      await tick();
    } catch (err) {
      log(`Tick error: ${err instanceof Error ? err.message : err}`);
    }
    await new Promise((r) => setTimeout(r, TICK_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error("[daemon] fatal:", err);
  process.exit(1);
});

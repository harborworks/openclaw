/**
 * Harbor Daemon
 *
 * Bridges the Harbor app (Convex) with the local OpenClaw gateway.
 * Polls Convex for changes and syncs agents, templates, secrets, and cron jobs.
 */

const TICK_INTERVAL_MS = parseInt(process.env.TICK_INTERVAL_MS || "10000", 10);
const HARBOR_API_KEY = process.env.HARBOR_API_KEY || "";
const CONVEX_URL = process.env.CONVEX_URL || "";
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:18789";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";
const DAEMON_PORT = parseInt(process.env.DAEMON_PORT || "4747", 10);

function checkConfig() {
  const missing: string[] = [];
  if (!HARBOR_API_KEY) missing.push("HARBOR_API_KEY");
  if (!CONVEX_URL) missing.push("CONVEX_URL");
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function tick() {
  // TODO: Poll Convex for harbor state and sync to gateway
  // - Agents
  // - Template vars → workspace files
  // - Secrets → ~/.openclaw/.env
  // - Cron jobs → gateway cron API
  console.log(`[tick] polling convex (stub)`);
}

async function startHttpServer() {
  const { createServer } = await import("node:http");

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${DAEMON_PORT}`);

    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    // TODO: Task/message/notification endpoints for agents
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  server.listen(DAEMON_PORT, () => {
    console.log(`[daemon] HTTP server listening on :${DAEMON_PORT}`);
  });
}

async function main() {
  console.log("[daemon] Harbor Daemon starting");
  console.log(`[daemon] CONVEX_URL=${CONVEX_URL || "(not set)"}`);
  console.log(`[daemon] GATEWAY_URL=${GATEWAY_URL}`);
  console.log(`[daemon] TICK_INTERVAL_MS=${TICK_INTERVAL_MS}`);

  checkConfig();

  await startHttpServer();

  // Main loop
  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error("[tick] error:", err);
    }
    await new Promise((r) => setTimeout(r, TICK_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error("[daemon] fatal:", err);
  process.exit(1);
});

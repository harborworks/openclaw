/**
 * Cron Sync — ensures each active agent has an isolated heartbeat cron job.
 *
 * Replaces the built-in heartbeat (which suffers from pattern lock in long sessions)
 * with isolated cron sessions that start fresh each time.
 *
 * On each tick:
 * 1. Lists existing cron jobs from the gateway
 * 2. Creates missing heartbeat jobs for active agents
 * 3. Removes orphaned heartbeat jobs for deleted agents
 */

import { GatewayClient, cronApi } from "./gateway-client.js";
import type { ConvexAgent } from "./agents.js";

function log(msg: string) {
  console.log(`[cron] ${new Date().toISOString()} ${msg}`);
}

/** Prefix used for daemon-managed heartbeat jobs. */
const JOB_PREFIX = "harbor-heartbeat-";

/** Default heartbeat interval in milliseconds. */
const HEARTBEAT_INTERVAL_MS = parseInt(
  process.env.HEARTBEAT_INTERVAL_MS || "900000",
  10
);

/** Daemon URL reachable from wherever the exec tool runs.
 * Sandbox containers use host networking, so localhost reaches the daemon's
 * published port. DAEMON_INTERNAL_URL env var allows override for other setups. */
const DAEMON_URL = process.env.DAEMON_INTERNAL_URL || "http://localhost:4747";

const LEADER_ROLES = new Set(["project-manager", "executive-assistant"]);

/** Build the heartbeat message for an agent with explicit exec instructions. */
function buildHeartbeatMessage(sessionKey: string, role?: string): string {
  const leaderInstructions = role && LEADER_ROLES.has(role)
    ? `

You can also CREATE tasks for other agents:
exec: curl -s -X POST -H "X-Agent-ID: ${sessionKey}" -H "Content-Type: application/json" ${DAEMON_URL}/tasks/create -d '{"title": "...", "description": "...", "priority": "medium", "assigneeSessionKey": "agent-session-key", "reviewerSessionKeys": ["reviewer-key"]}'
Use this when the human asks you to delegate work or create tasks based on your conversations.`
    : "";

  return `You MUST use the exec tool to run this command before responding:

exec command: curl -s -H "X-Agent-ID: ${sessionKey}" ${DAEMON_URL}/tasks

If the curl command fails or returns an error, reply HEARTBEAT_OK (the daemon may be restarting).

Based on the JSON response:
- Tasks are sorted by priority (urgent > high > medium > low) then oldest first. Always pick the FIRST "to_do" task.
- If any task has status "to_do": pick it up with exec: curl -s -X POST -H "X-Agent-ID: ${sessionKey}" ${DAEMON_URL}/tasks/TASK_ID/pickup
  Then read the full task and work on it.
- If any task has status "review" and _agentRole is "reviewer": review the work, then exec: curl -s -X POST -H "X-Agent-ID: ${sessionKey}" -H "Content-Type: application/json" ${DAEMON_URL}/tasks/TASK_ID/review -d '{"verdict": "approved", "comment": "looks good"}' (or verdict "changes_requested" with feedback)
- If any task has status "in_progress": read its details and continue working.
- If you need human input: exec: curl -s -X POST -H "X-Agent-ID: ${sessionKey}" -H "Content-Type: application/json" ${DAEMON_URL}/tasks/TASK_ID/block -d '{"reason": "what you need"}'
- When done: exec: curl -s -X POST -H "X-Agent-ID: ${sessionKey}" ${DAEMON_URL}/tasks/TASK_ID/submit
- ONLY if all tasks are "done" or the list is empty: reply HEARTBEAT_OK

Post updates: exec: curl -s -X POST -H "X-Agent-ID: ${sessionKey}" -H "Content-Type: application/json" ${DAEMON_URL}/tasks/TASK_ID/message -d '{"content": "update"}'${leaderInstructions}`;
}

/** Stale threshold: force-run a job if it hasn't run in this many multiples of its interval. */
const STALE_MULTIPLIER = 3;

/** In-memory cache to avoid redundant API calls. */
let lastSyncFingerprint: string = "";

export async function syncCronJobs(
  gateway: GatewayClient,
  agents: ConvexAgent[],
  heartbeatIntervalMs?: number,
): Promise<void> {
  if (!gateway.isConnected) return;

  // Agents with any non-archived status are considered active for heartbeat purposes
  const activeAgents = agents.filter((a) => a.status !== "archived");
  const intervalMs = heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS;

  // Fingerprint includes agent list, interval, and DAEMON_URL so changes trigger a sync
  const fingerprint = activeAgents
    .map((a) => `${a.sessionKey}:${a.role ?? ""}`)
    .sort()
    .join(",") + `@${intervalMs}@${DAEMON_URL}`;

  const needsFullSync = fingerprint !== lastSyncFingerprint;

  const cron = cronApi(gateway);

  // 1. List existing cron jobs
  let existingJobs: Awaited<ReturnType<typeof cron.list>>["jobs"];
  try {
    const result = await cron.list({ includeDisabled: true });
    existingJobs = result.jobs;
  } catch (err) {
    log(`Failed to list cron jobs: ${err instanceof Error ? err.message : err}`);
    return;
  }

  // 2. Find daemon-managed heartbeat jobs
  const managedJobs = new Map(
    existingJobs
      .filter((j) => j.name.startsWith(JOB_PREFIX) || j.id.startsWith(JOB_PREFIX))
      .map((j) => [j.agentId ?? "", j])
  );

  const activeAgentKeys = new Set(activeAgents.map((a) => a.sessionKey));

  if (needsFullSync) {
    // 3. Create missing jobs or update existing ones
    for (const agent of activeAgents) {
      const existing = managedJobs.get(agent.sessionKey);
      const expectedMessage = buildHeartbeatMessage(agent.sessionKey, agent.role);

      if (existing) {
        // Check if interval or payload needs updating
        const currentInterval = (existing.schedule as Record<string, unknown>)?.everyMs;
        const currentMessage = (existing.payload as Record<string, unknown>)?.message;
        const needsUpdate = currentInterval !== intervalMs || currentMessage !== expectedMessage;

        if (needsUpdate) {
          try {
            await cron.update(existing.id, {
              schedule: { kind: "every" as const, everyMs: intervalMs },
              payload: { kind: "agentTurn", message: expectedMessage },
            });
            log(`Updated heartbeat job for ${agent.sessionKey} (interval=${intervalMs}ms, payload=${currentMessage !== expectedMessage ? "updated" : "unchanged"})`);
          } catch (err) {
            log(`Failed to update heartbeat job for ${agent.sessionKey}: ${err instanceof Error ? err.message : err}`);
          }
        }
        continue;
      }

      try {
        const job = await cron.add({
          name: `${JOB_PREFIX}${agent.sessionKey}`,
          schedule: { kind: "every", everyMs: intervalMs },
          payload: { kind: "agentTurn", message: expectedMessage },
          sessionTarget: "isolated",
          agentId: agent.sessionKey,
          delivery: { mode: "none" },
          enabled: true,
        });
        log(`Created heartbeat job for ${agent.sessionKey} (${job.id})`);
      } catch (err) {
        log(`Failed to create heartbeat job for ${agent.sessionKey}: ${err instanceof Error ? err.message : err}`);
      }
    }

    // 4. Remove orphaned jobs (agent deleted or deactivated)
    for (const [agentId, job] of managedJobs) {
      if (activeAgentKeys.has(agentId)) continue;

      try {
        await cron.remove(job.id);
        log(`Removed orphaned heartbeat job for ${agentId} (${job.id})`);
      } catch (err) {
        log(`Failed to remove orphaned job for ${agentId}: ${err instanceof Error ? err.message : err}`);
      }
    }

    lastSyncFingerprint = fingerprint;
    log(`Cron sync complete: ${activeAgentKeys.size} agent(s), ${intervalMs}ms interval`);
  }

  // 5. Health check: detect and unstick stale jobs
  const now = Date.now();
  for (const [agentId, job] of managedJobs) {
    if (!activeAgentKeys.has(agentId)) continue;
    if (!job.enabled) continue;

    const state = job.state as Record<string, unknown>;
    const lastRunAt = (state?.lastRunAtMs as number) ?? 0;
    const jobInterval = ((job.schedule as Record<string, unknown>)?.everyMs as number) ?? intervalMs;
    const staleThreshold = jobInterval * STALE_MULTIPLIER;

    if (lastRunAt > 0 && (now - lastRunAt) > staleThreshold) {
      const staleMins = Math.round((now - lastRunAt) / 60000);
      log(`⚠️ Stale heartbeat detected for ${agentId}: last run ${staleMins}m ago (threshold: ${Math.round(staleThreshold / 60000)}m). Force-running...`);
      try {
        await cron.run(job.id);
        log(`✅ Force-ran stale heartbeat for ${agentId}`);
      } catch (err) {
        log(`❌ Failed to force-run heartbeat for ${agentId}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}

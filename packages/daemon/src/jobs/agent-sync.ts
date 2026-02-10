/**
 * Agent Sync Job
 *
 * Polls agent status and updates the DB. In the future this will
 * query the OpenClaw gateway for agent heartbeat/status info.
 *
 * For now: logs agent count as a smoke test.
 */

import { agents } from "@harbor-app/schema";
import { db } from "../db";

export async function agentSync(): Promise<void> {
  const rows = await db.select().from(agents);
  console.log(`[agent-sync] ${rows.length} agents registered`);
  for (const agent of rows) {
    console.log(`  ${agent.name} (${agent.sessionKey}) — ${agent.role}`);
  }
}

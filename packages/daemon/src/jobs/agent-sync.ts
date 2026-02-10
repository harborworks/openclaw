/**
 * Agent Sync
 *
 * Polls the Harbor API for the agent roster and compares it
 * against local gateway sessions. Logs discrepancies.
 *
 * Future: auto-register agents, update statuses, detect offline agents.
 */

import * as harbor from "../harbor-client";
import * as gateway from "../gateway-client";

export async function agentSync(): Promise<void> {
  const [agents, sessions] = await Promise.all([
    harbor.getAgents(),
    gateway.getSessionStatus(),
  ]);

  console.log(
    `[agent-sync] harbor: ${agents.length} agents, gateway: ${sessions.length} sessions`
  );

  // Compare: agents registered in harbor but not in gateway
  const sessionKeys = new Set(sessions.map((s) => s.key));
  for (const agent of agents) {
    if (!sessionKeys.has(agent.sessionKey)) {
      console.log(
        `[agent-sync] ${agent.name} (${agent.sessionKey}) not found in gateway`
      );
    }
  }
}

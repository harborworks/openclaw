/**
 * Notification Dispatch
 *
 * Polls the Harbor API for undelivered notifications,
 * wakes the relevant agent via the local gateway,
 * then marks the notification as delivered.
 */

import * as harbor from "../harbor-client";
import * as gateway from "../gateway-client";

/** Cache agent list so we don't fetch every tick */
let agentCache: harbor.Agent[] = [];
let agentCacheAge = 0;
const AGENT_CACHE_TTL = 60_000;

async function getAgentMap(): Promise<Map<number, harbor.Agent>> {
  if (Date.now() - agentCacheAge > AGENT_CACHE_TTL || agentCache.length === 0) {
    agentCache = await harbor.getAgents();
    agentCacheAge = Date.now();
  }
  return new Map(agentCache.map((a) => [a.id, a]));
}

export async function notificationDispatch(): Promise<void> {
  const agents = await getAgentMap();

  for (const [, agent] of agents) {
    const notifications = await harbor.getNotifications(agent.sessionKey);
    const pending = notifications.filter((n) => !n.delivered);
    if (pending.length === 0) continue;

    console.log(
      `[notification-dispatch] ${pending.length} for ${agent.name} (${agent.sessionKey})`
    );

    // Wake the agent once with a summary
    await gateway.wakeAgent(
      agent.sessionKey,
      `You have ${pending.length} new notification(s) in Mission Control`
    );

    // Mark all as delivered
    for (const n of pending) {
      await harbor.markNotificationDelivered(n.id);
    }
  }
}

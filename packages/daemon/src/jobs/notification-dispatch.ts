/**
 * Notification Dispatch Job
 *
 * Finds undelivered notifications and dispatches them. In the future
 * this will wake agents via the OpenClaw gateway. For now: logs them.
 */

import { notifications, agents, tasks } from "@harbor-app/schema";
import { eq, and } from "drizzle-orm";
import { db } from "../db";

export async function notificationDispatch(): Promise<void> {
  const pending = await db
    .select({
      id: notifications.id,
      agentName: agents.name,
      agentSessionKey: agents.sessionKey,
      taskTitle: tasks.title,
      taskId: notifications.taskId,
    })
    .from(notifications)
    .innerJoin(agents, eq(notifications.agentId, agents.id))
    .innerJoin(tasks, eq(notifications.taskId, tasks.id))
    .where(eq(notifications.delivered, false));

  if (pending.length === 0) return;

  console.log(
    `[notification-dispatch] ${pending.length} pending notification(s)`
  );

  for (const n of pending) {
    console.log(
      `  → ${n.agentName} (${n.agentSessionKey}): task "${n.taskTitle}"`
    );

    // TODO: Wake agent via gateway
    // await fetch(`${config.gatewayUrl}/api/wake`, { ... })

    // Mark delivered
    await db
      .update(notifications)
      .set({ delivered: true, updatedAt: new Date() })
      .where(eq(notifications.id, n.id));
  }

  console.log(`[notification-dispatch] dispatched ${pending.length}`);
}

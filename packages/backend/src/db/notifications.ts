import { agents, notifications } from "@harbor-app/schema";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./index.js";

export const getUndeliveredNotifications = async (sessionKey: string) => {
  const agentRows = await db
    .select()
    .from(agents)
    .where(eq(agents.sessionKey, sessionKey))
    .limit(1);
  if (agentRows.length === 0) return [];

  return await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.agentId, agentRows[0].id),
        eq(notifications.delivered, false)
      )
    )
    .orderBy(notifications.createdAt);
};

export const markDelivered = async (ids: number[]) => {
  if (ids.length === 0) return;
  await db
    .update(notifications)
    .set({ delivered: true })
    .where(inArray(notifications.id, ids));
};

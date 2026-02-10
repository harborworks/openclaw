import { agents } from "@sparrow-template/schema";
import { eq } from "drizzle-orm";
import { db } from "./index.js";

export const getAllAgents = async () => {
  return await db.select().from(agents).orderBy(agents.name);
};

export const getAgentBySessionKey = async (sessionKey: string) => {
  const rows = await db
    .select()
    .from(agents)
    .where(eq(agents.sessionKey, sessionKey))
    .limit(1);
  if (rows.length === 0) {
    throw new Error("Agent not found");
  }
  return rows[0];
};

export const getAgentById = async (id: number) => {
  const rows = await db
    .select()
    .from(agents)
    .where(eq(agents.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new Error("Agent not found");
  }
  return rows[0];
};

/**
 * Resolve a fromAgentId which may be a sessionKey string or numeric id.
 * Returns the agent's numeric id.
 */
export const resolveAgentId = async (
  fromAgentId: string | number
): Promise<number> => {
  if (typeof fromAgentId === "number") return fromAgentId;
  // If it looks like a number, treat as id
  const parsed = Number(fromAgentId);
  if (!isNaN(parsed)) return parsed;
  // Otherwise resolve as sessionKey
  const agent = await getAgentBySessionKey(fromAgentId);
  return agent.id;
};

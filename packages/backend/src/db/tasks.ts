import { agents, tasks } from "@harbor-app/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "./index.js";

export const getAllTasks = async (filters?: {
  assigneeSessionKey?: string;
  status?: string;
}) => {
  let query = db.select().from(tasks).orderBy(tasks.createdAt);

  if (filters?.status) {
    query = query.where(eq(tasks.status, filters.status as any)) as any;
  }

  const allTasks = await query;

  // Filter by assignee sessionKey if provided
  if (filters?.assigneeSessionKey) {
    const agentRows = await db
      .select()
      .from(agents)
      .where(eq(agents.sessionKey, filters.assigneeSessionKey))
      .limit(1);
    if (agentRows.length === 0) return [];
    const agentId = agentRows[0].id;
    return allTasks.filter((t) => {
      const ids = (t.assigneeIds as number[]) || [];
      return ids.includes(agentId);
    });
  }

  return allTasks;
};

export const getTaskById = async (id: number) => {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new Error("Task not found");
  }
  return rows[0];
};

export const createTask = async (data: {
  title: string;
  description?: string;
  assigneeIds?: number[];
  createdBy?: number;
  priority?: string;
  tags?: string[];
  shireId?: number;
}) => {
  const [task] = await db
    .insert(tasks)
    .values({
      title: data.title,
      description: data.description,
      assigneeIds: data.assigneeIds || [],
      createdBy: data.createdBy,
      priority: (data.priority as any) || "medium",
      tags: data.tags || [],
      shireId: data.shireId,
      status: data.assigneeIds && data.assigneeIds.length > 0 ? "assigned" : "inbox",
    })
    .returning();
  return task;
};

export const updateTask = async (
  id: number,
  data: {
    title?: string;
    description?: string;
    status?: string;
    assigneeIds?: number[];
    priority?: string;
    tags?: string[];
    shireId?: number;
  }
) => {
  const updates: Record<string, any> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.status !== undefined) updates.status = data.status;
  if (data.assigneeIds !== undefined) updates.assigneeIds = data.assigneeIds;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.tags !== undefined) updates.tags = data.tags;
  if (data.shireId !== undefined) updates.shireId = data.shireId;

  const [task] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning();
  if (!task) {
    throw new Error("Task not found");
  }
  return task;
};

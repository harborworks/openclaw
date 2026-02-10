import { agents, notifications, taskComments, tasks } from "@harbor-app/schema";
import { eq, ilike } from "drizzle-orm";
import { db } from "./index.js";

export const getCommentsByTaskId = async (taskId: number) => {
  return await db
    .select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      fromAgentId: taskComments.fromAgentId,
      content: taskComments.content,
      createdAt: taskComments.createdAt,
      agentName: agents.name,
    })
    .from(taskComments)
    .leftJoin(agents, eq(taskComments.fromAgentId, agents.id))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(taskComments.createdAt);
};

export const createComment = async (data: {
  taskId: number;
  fromAgentId: number;
  content: string;
}) => {
  const [comment] = await db
    .insert(taskComments)
    .values(data)
    .returning();

  // Parse @mentions and create notifications
  await processMentions(data.content, data.taskId, comment.id);

  return comment;
};

async function processMentions(
  content: string,
  taskId: number,
  commentId: number
) {
  const mentionRegex = /@(\w[\w\s]*?)(?=\s@|\s|$)/g;
  const mentions = [...content.matchAll(mentionRegex)].map((m) => m[1].trim());

  if (mentions.length === 0) return;

  // Check for @all
  if (mentions.some((m) => m.toLowerCase() === "all")) {
    // Notify all assignees on the task
    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    if (task.length === 0) return;
    const assigneeIds = (task[0].assigneeIds as number[]) || [];
    for (const agentId of assigneeIds) {
      await db.insert(notifications).values({
        agentId,
        taskId,
        commentId,
      });
    }
    return;
  }

  // Resolve individual mentions
  for (const name of mentions) {
    const agentRows = await db
      .select()
      .from(agents)
      .where(ilike(agents.name, name))
      .limit(1);
    if (agentRows.length > 0) {
      await db.insert(notifications).values({
        agentId: agentRows[0].id,
        taskId,
        commentId,
      });
    }
  }
}

import { tasks } from "@sparrow-tags/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "./index.js";

/**
 * Gets the next available task for a worker to work on.
 * Uses raw SQL to ensure proper for update skip locked semantics.
 *
 * @param userId The ID of the user requesting the next task
 * @param jobId Optional job ID to filter tasks by specific job
 * @returns The next available task or null if none available
 */
export const getNextAvailableTask = async (userId: number, jobId: number) => {
  // Build the query using raw SQL for maximum control
  let query = `
    WITH task_to_assign AS (
      SELECT id 
      FROM tasks
      WHERE 
        (assigned_to_id IS NULL OR assigned_at < NOW() - INTERVAL '30 minutes')
        AND completed_at IS NULL
        AND job_id = ${jobId}
        AND deleted_by_id IS NULL
  `;

  // Complete the query with ordering and locking
  query += `
      ORDER BY id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE tasks
    SET 
      assigned_to_id = ${userId},
      assigned_at = NOW()
    FROM task_to_assign
    WHERE tasks.id = task_to_assign.id
    RETURNING *;
  `;

  const result = await db.execute(sql.raw(query));

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * Marks a task as completed by a user
 *
 * @param taskId The ID of the task to mark as completed
 * @param userId The ID of the user completing the task
 * @param isAdmin Whether the user is an admin and can bypass assignment check
 * @returns The updated task or null if not found
 */
export const completeTask = async (
  taskId: number,
  userId: number,
  isAdmin: boolean = false
) => {
  let query;

  if (isAdmin) {
    // Admins can complete any task regardless of assignment
    query = sql`
      UPDATE tasks
      SET completed_at = NOW()
      WHERE id = ${taskId}
      RETURNING *
    `;
  } else {
    // Regular users can only complete tasks assigned to them
    query = sql`
      UPDATE tasks
      SET completed_at = NOW()
      WHERE id = ${taskId} AND assigned_to_id = ${userId}
      RETURNING *
    `;
  }

  const result = await db.execute(query);

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * Gets tasks statistics for a specific job
 *
 * @param jobId The ID of the job to get stats for
 * @returns Task statistics for the job
 */
export const getTaskStats = async (jobId: number) => {
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN assigned_to_id IS NOT NULL AND completed_at IS NULL THEN 1 END) as in_progress,
      COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed
    FROM tasks
    WHERE job_id = ${jobId}
    AND deleted_by_id IS NULL
  `);

  const stats = result.rows[0];

  // Convert string values to numbers
  return {
    total: Number(stats.total),
    in_progress: Number(stats.in_progress),
    completed: Number(stats.completed),
  };
};

/**
 * Gets a task by ID
 *
 * @param taskId The ID of the task to retrieve
 * @returns The task or null if not found
 */
export const getTaskById = async (taskId: number) => {
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedById)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
};

/**
 * Gets paginated tasks for a job
 *
 * @param jobId The ID of the job to get tasks for
 * @param page Page number (1-indexed)
 * @param pageSize Number of tasks per page
 * @returns Paginated list of tasks and total count
 */
export const getPaginatedTasks = async (
  jobId: number,
  page: number = 1,
  pageSize: number = 10
) => {
  const offset = (page - 1) * pageSize;

  // Get tasks with pagination
  const tasksList = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.jobId, jobId), isNull(tasks.deletedById)))
    .orderBy(tasks.id)
    .limit(pageSize)
    .offset(offset);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.jobId, jobId), isNull(tasks.deletedById)));

  const totalCount = countResult[0]?.count || 0;

  return {
    tasks: tasksList,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
};

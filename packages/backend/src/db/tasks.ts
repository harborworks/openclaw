import { sql } from "drizzle-orm";
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
 * @returns The updated task or null if not found
 */
export const completeTask = async (taskId: number, userId: number) => {
  const result = await db.execute(sql`
    UPDATE tasks
    SET completed_at = NOW()
    WHERE id = ${taskId} AND assigned_to_id = ${userId}
    RETURNING *
  `);

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
  `);

  return result.rows[0];
};

import { dataType, jobs, orgs, tagType, tasks } from "@sparrow-tags/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "./index.js";

// Type for job creation
export type CreateJobInput = {
  orgId: number;
  name: string;
  instructions?: string;
  dataType: (typeof dataType.enumValues)[number];
  tagType: (typeof tagType.enumValues)[number];
  labels: string[];
};

// Get all jobs for an organization
export const getJobsByOrgId = async (orgId: number) => {
  return await db
    .select({
      id: jobs.id,
      orgId: jobs.orgId,
      orgSlug: orgs.slug,
      name: jobs.name,
      instructions: jobs.instructions,
      dataType: jobs.dataType,
      tagType: jobs.tagType,
      labels: jobs.labels,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .leftJoin(orgs, eq(jobs.orgId, orgs.id))
    .where(eq(jobs.orgId, orgId))
    .orderBy(jobs.createdAt);
};

// Get a job by ID
export const getJobById = async (jobId: number) => {
  const jobRows = await db
    .select({
      id: jobs.id,
      orgId: jobs.orgId,
      orgSlug: orgs.slug,
      name: jobs.name,
      instructions: jobs.instructions,
      dataType: jobs.dataType,
      tagType: jobs.tagType,
      labels: jobs.labels,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .leftJoin(orgs, eq(jobs.orgId, orgs.id))
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (jobRows.length === 0) {
    throw new Error("Job not found");
  }

  return jobRows[0];
};

// Get all jobs with task statistics
export const getJobsWithStats = async (orgId?: number) => {
  let query = `
    SELECT 
      j.id,
      j.name,
      j.org_id,
      j.data_type,
      j.tag_type,
      j.labels,
      j.created_at,
      j.updated_at,
      o.slug as org_slug,
      COUNT(t.id) as total_tasks,
      COUNT(CASE WHEN t.completed_at IS NOT NULL THEN 1 END) as completed_tasks,
      COUNT(CASE WHEN t.assigned_to_id IS NOT NULL AND t.completed_at IS NULL THEN 1 END) as in_progress_tasks
    FROM jobs j
    LEFT JOIN orgs o ON j.org_id = o.id
    LEFT JOIN tasks t ON j.id = t.job_id
  `;

  if (orgId !== undefined) {
    query += ` WHERE j.org_id = ${orgId}`;
  }

  query += `
    GROUP BY j.id, o.slug
    ORDER BY j.created_at DESC
  `;

  const result = await db.execute(sql.raw(query));
  return result.rows;
};

// Create a new job
export const createJob = async (data: CreateJobInput) => {
  const [newJob] = await db
    .insert(jobs)
    .values({
      orgId: data.orgId,
      name: data.name,
      instructions: data.instructions || null,
      dataType: data.dataType,
      tagType: data.tagType,
      labels: JSON.stringify(data.labels),
    })
    .returning();

  return newJob;
};

// Update a job
export const updateJob = async (
  jobId: number,
  data: Partial<CreateJobInput>
) => {
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.instructions !== undefined)
    updateData.instructions = data.instructions;
  if (data.dataType !== undefined) updateData.dataType = data.dataType;
  if (data.tagType !== undefined) updateData.tagType = data.tagType;
  if (data.labels !== undefined)
    updateData.labels = JSON.stringify(data.labels);

  const [updatedJob] = await db
    .update(jobs)
    .set(updateData)
    .where(eq(jobs.id, jobId))
    .returning();

  if (!updatedJob) {
    throw new Error("Job not found");
  }

  return updatedJob;
};

// Delete a job
export const deleteJob = async (jobId: number) => {
  const [deletedJob] = await db
    .delete(jobs)
    .where(eq(jobs.id, jobId))
    .returning();

  if (!deletedJob) {
    throw new Error("Job not found");
  }

  return deletedJob;
};

// Get tasks for a job
export const getTasksByJobId = async (jobId: number) => {
  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.jobId, jobId))
    .orderBy(tasks.createdAt);
};

// Add a task to a job
export const addTaskToJob = async (jobId: number, url: string) => {
  const [newTask] = await db
    .insert(tasks)
    .values({
      jobId,
      url,
    })
    .returning();

  return newTask;
};

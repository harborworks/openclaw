import { dataType, tagType } from "@sparrow-tags/schema";
import { NextFunction, Request, Response } from "express";
import * as db from "../db";

interface JobWithStats {
  id: number;
  org_id: number;
  org_slug: string;
  name: string;
  data_type: string;
  tag_type: string;
  labels: string[] | string;
  created_at: string;
  updated_at: string;
  deleted_by_id: number | null;
  deleted_at: string | null;
  total_tasks: number | string;
  completed_tasks: number | string;
  in_progress_tasks: number | string;
}

/**
 * Get all jobs for the authenticated user across all of their organizations
 */
export const getAllJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    // Get all orgs the user is a member of
    const userOrgs = await db.getUserOrgs(req.user.id);

    if (userOrgs.length === 0) {
      // User is not a member of any organization
      res.status(200).json({
        success: true,
        data: [],
      });
      return;
    }

    // Get jobs with task statistics
    const jobs = await db.getJobsWithStats();

    // Filter to only include organizations the user is a member of
    const orgIds = userOrgs
      .map((org) => org.id)
      .filter((id): id is number => id !== null);

    const userJobs = jobs.filter(
      (job: JobWithStats) =>
        job.org_id !== null && orgIds.includes(Number(job.org_id))
    );

    // Transform the snake_case keys to camelCase for consistent frontend API
    const transformedJobs = userJobs.map((job: JobWithStats) => {
      // Parse labels if they're a string
      let parsedLabels: string[] = [];
      try {
        if (typeof job.labels === "string") {
          parsedLabels = JSON.parse(job.labels);
        } else if (Array.isArray(job.labels)) {
          parsedLabels = job.labels;
        }
      } catch (e) {
        console.error("Error parsing job labels:", e);
      }

      return {
        id: job.id,
        orgId: job.org_id,
        orgSlug: job.org_slug,
        name: job.name,
        dataType: job.data_type,
        tagType: job.tag_type,
        labels: parsedLabels,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        deletedById: job.deleted_by_id || null,
        deletedAt: job.deleted_at || null,
        totalTasks: parseInt(job.total_tasks as unknown as string) || 0,
        completedTasks: parseInt(job.completed_tasks as unknown as string) || 0,
        inProgressTasks:
          parseInt(job.in_progress_tasks as unknown as string) || 0,
      };
    });

    res.status(200).json({
      success: true,
      data: transformedJobs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all jobs for an organization
 */
export const getJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = parseInt(req.params.orgId);

    if (isNaN(orgId)) {
      res.status(400).json({
        message: "Invalid organization ID",
      });
      return;
    }

    const jobs = await db.getJobsByOrgId(orgId);

    res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single job by ID
 */
export const getJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);

    if (isNaN(jobId)) {
      res.status(400).json({
        message: "Invalid job ID",
      });
      return;
    }

    const job = await db.getJobById(jobId);

    // Parse labels if they're a string
    let parsedLabels: string[] = [];
    try {
      if (typeof job.labels === "string") {
        parsedLabels = JSON.parse(job.labels);
      } else if (Array.isArray(job.labels)) {
        parsedLabels = job.labels;
      }
    } catch (e) {
      console.error("Error parsing job labels:", e);
    }

    // Transform job data
    const transformedJob = {
      ...job,
      labels: parsedLabels,
      deletedById: job.deletedById || null,
      deletedAt: job.deletedAt || null,
    };

    res.status(200).json({
      success: true,
      data: transformedJob,
    });
  } catch (error: any) {
    if (error.message === "Job not found") {
      res.status(404).json({
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

/**
 * Create a new job
 */
export const createJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = parseInt(req.params.orgId);
    const {
      name,
      instructions,
      dataType: dataTypeValue,
      tagType: tagTypeValue,
      labels,
    } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        message: "Missing required field: name",
      });
      return;
    }

    if (!dataTypeValue || !dataType.enumValues.includes(dataTypeValue)) {
      res.status(400).json({
        message: `Invalid dataType. Must be one of: ${dataType.enumValues.join(", ")}`,
      });
      return;
    }

    if (!tagTypeValue || !tagType.enumValues.includes(tagTypeValue)) {
      res.status(400).json({
        message: `Invalid tagType. Must be one of: ${tagType.enumValues.join(", ")}`,
      });
      return;
    }

    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      res.status(400).json({
        message: "At least one label is required",
      });
      return;
    }

    // Create the job
    const job = await db.createJob({
      orgId,
      name,
      instructions,
      dataType: dataTypeValue,
      tagType: tagTypeValue,
      labels,
    });

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a job
 */
export const updateJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);
    const {
      name,
      instructions,
      dataType: dataTypeValue,
      tagType: tagTypeValue,
      labels,
    } = req.body;

    if (isNaN(jobId)) {
      res.status(400).json({
        message: "Invalid job ID",
      });
      return;
    }

    // Validate data if provided
    if (dataTypeValue && !dataType.enumValues.includes(dataTypeValue)) {
      res.status(400).json({
        message: `Invalid dataType. Must be one of: ${dataType.enumValues.join(", ")}`,
      });
      return;
    }

    if (tagTypeValue && !tagType.enumValues.includes(tagTypeValue)) {
      res.status(400).json({
        message: `Invalid tagType. Must be one of: ${tagType.enumValues.join(", ")}`,
      });
      return;
    }

    if (
      labels !== undefined &&
      (!Array.isArray(labels) || labels.length === 0)
    ) {
      res.status(400).json({
        message: "At least one label is required",
      });
      return;
    }

    // Update the job
    const job = await db.updateJob(jobId, {
      name,
      instructions,
      dataType: dataTypeValue,
      tagType: tagTypeValue,
      labels,
    });

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    if (error.message === "Job not found") {
      res.status(404).json({
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

/**
 * Delete a job
 */
export const deleteJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);
    const userId = req.user?.id;

    if (isNaN(jobId)) {
      res.status(400).json({
        message: "Invalid job ID",
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    // Soft delete the job
    const deletedJob = await db.deleteJob(jobId, userId);

    res.status(200).json({
      success: true,
      message: `Job "${deletedJob.name}" deleted successfully`,
      data: deletedJob,
    });
  } catch (error: any) {
    if (error.message === "Job not found") {
      res.status(404).json({
        message: error.message,
      });
      return;
    }
    if (error.message === "Job already deleted") {
      res.status(400).json({
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

/**
 * Get tasks for a job
 */
export const getJobTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);

    if (isNaN(jobId)) {
      res.status(400).json({
        message: "Invalid job ID",
      });
      return;
    }

    const tasks = await db.getTasksByJobId(jobId);

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a task for a job
 */
export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);
    const { url } = req.body;

    if (isNaN(jobId)) {
      res.status(400).json({
        message: "Invalid job ID",
      });
      return;
    }

    if (!url) {
      res.status(400).json({
        message: "Missing required field: url",
      });
      return;
    }

    // Verify the job exists
    await db.getJobById(jobId);

    // Create the task
    const task = await db.addTaskToJob(jobId, url);

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    if (error.message === "Job not found") {
      res.status(404).json({
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

/**
 * Get task statistics for a job
 */
export const getJobTaskStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);

    if (isNaN(jobId)) {
      res.status(400).json({
        message: "Invalid job ID",
      });
      return;
    }

    // Check if job exists
    await db.getJobById(jobId);

    // Get task statistics
    const stats = await db.getTaskStats(jobId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    if (error.message === "Job not found") {
      res.status(404).json({
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

/**
 * Get the next available task for a job
 */
export const getNextAvailableTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);
    const userId = req.user?.id;

    if (isNaN(jobId)) {
      res.status(400).json({
        message: "Invalid job ID",
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    const task = await db.getNextAvailableTask(userId, jobId);

    if (!task) {
      res.status(404).json({
        message: "No available tasks found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific task by ID
 */
export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);
    const taskId = parseInt(req.params.taskId);

    if (isNaN(jobId) || isNaN(taskId)) {
      res.status(400).json({
        message: "Invalid job ID or task ID",
      });
      return;
    }

    // Get the task - first we need a function to get a task by ID in the db layer
    const task = await db.getTaskById(taskId);

    if (!task) {
      res.status(404).json({
        message: "Task not found",
      });
      return;
    }

    // Verify the task belongs to the job
    if (task.jobId !== jobId) {
      res.status(400).json({
        message: "Task does not belong to the specified job",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete a task
 */
export const completeTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);
    const taskId = parseInt(req.params.taskId);
    const userId = req.user?.id;

    if (isNaN(jobId) || isNaN(taskId)) {
      res.status(400).json({
        message: "Invalid job ID or task ID",
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    // Get the task to verify it exists and belongs to the job
    const task = await db.getTaskById(taskId);

    if (!task) {
      res.status(404).json({
        message: "Task not found",
      });
      return;
    }

    if (task.jobId !== jobId) {
      res.status(400).json({
        message: "Task does not belong to the specified job",
      });
      return;
    }

    // Check if task is assigned to this user
    if (task.assignedToId !== userId) {
      res.status(403).json({
        message: "Task is not assigned to you",
      });
      return;
    }

    // Complete the task
    const completedTask = await db.completeTask(taskId, userId);

    if (!completedTask) {
      res.status(500).json({
        message: "Failed to complete task",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: completedTask,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all tasks for a job with pagination (admin only)
 */
export const getAllJobTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const userId = req.user?.id;

    if (isNaN(jobId)) {
      res.status(400).json({
        message: "Invalid job ID",
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    // Get the job to check organization
    const job = await db.getJobById(jobId);

    // Check if user is an admin or superadmin
    const userOrgs = await db.getUserOrgs(userId);
    const isOrgAdmin = userOrgs.some(
      (org) => org.id === job.orgId && org.isAdmin
    );
    const isSuperAdmin = req.user?.superadmin === true;

    if (!isOrgAdmin && !isSuperAdmin) {
      res.status(403).json({
        message:
          "Permission denied. Only organization admins or superadmins can view all tasks.",
      });
      return;
    }

    // Get paginated tasks
    const result = await db.getPaginatedTasks(jobId, page, pageSize);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get labels for a specific job
 */
export const getJobLabels = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);

    if (isNaN(jobId)) {
      res.status(400).json({
        message: "Invalid job ID",
      });
      return;
    }

    const job = await db.getJobById(jobId);

    // Parse labels if they're a string
    let labels: string[] = [];
    try {
      if (typeof job.labels === "string") {
        labels = JSON.parse(job.labels);
      } else if (Array.isArray(job.labels)) {
        labels = job.labels;
      }
    } catch (e) {
      console.error("Error parsing job labels:", e);
    }

    res.status(200).json({
      success: true,
      data: {
        labels,
        tagType: job.tagType,
      },
    });
  } catch (error: any) {
    if (error.message === "Job not found") {
      res.status(404).json({
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

/**
 * Create a tag for a task
 */
export const createTagController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);
    const taskId = parseInt(req.params.taskId);
    const userId = req.user?.id;
    const { label, tagType: tagTypeValue, values } = req.body;

    if (isNaN(jobId) || isNaN(taskId)) {
      res.status(400).json({
        message: "Invalid job ID or task ID",
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    // Get the task to verify it exists and belongs to the job
    const task = await db.getTaskById(taskId);

    if (!task) {
      res.status(404).json({
        message: "Task not found",
      });
      return;
    }

    if (task.jobId !== jobId) {
      res.status(400).json({
        message: "Task does not belong to the specified job",
      });
      return;
    }

    // Validate tag type
    if (!tagTypeValue || !tagType.enumValues.includes(tagTypeValue)) {
      res.status(400).json({
        message: `Invalid tagType. Must be one of: ${tagType.enumValues.join(", ")}`,
      });
      return;
    }

    // Create the tag
    const tag = await db.createTag({
      taskId,
      createdById: userId,
      tagType: tagTypeValue,
      values,
    });

    res.status(201).json({
      success: true,
      data: tag,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tags for a task
 */
export const getTaskTagsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);
    const taskId = parseInt(req.params.taskId);

    if (isNaN(jobId) || isNaN(taskId)) {
      res.status(400).json({
        message: "Invalid job ID or task ID",
      });
      return;
    }

    // Get the task to verify it exists and belongs to the job
    const task = await db.getTaskById(taskId);

    if (!task) {
      res.status(404).json({
        message: "Task not found",
      });
      return;
    }

    if (task.jobId !== jobId) {
      res.status(400).json({
        message: "Task does not belong to the specified job",
      });
      return;
    }

    // Get the tags for the task
    const tags = await db.getTagsByTaskId(taskId);

    res.status(200).json({
      success: true,
      data: tags,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a tag
 */
export const deleteTagController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tagId = parseInt(req.params.tagId);
    const userId = req.user?.id;

    if (isNaN(tagId)) {
      res.status(400).json({
        message: "Invalid tag ID",
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
      });
      return;
    }

    // Delete the tag
    const deletedTag = await db.deleteTag(tagId, userId);

    if (!deletedTag) {
      res.status(404).json({
        message: "Tag not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: deletedTag,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

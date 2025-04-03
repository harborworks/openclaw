import { dataType, jobs, tagType } from "@sparrow-tags/schema";
import { NextFunction, Request, Response } from "express";
import * as db from "../db";

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

    // Collect all jobs from all user organizations
    const orgIds = userOrgs
      .map((org) => org.id)
      .filter((id): id is number => id !== null);
    let allJobs: (typeof jobs.$inferSelect)[] = [];

    for (const orgId of orgIds) {
      const orgJobs = await db.getJobsByOrgId(orgId);
      allJobs = [...allJobs, ...orgJobs];
    }

    res.status(200).json({
      success: true,
      data: allJobs,
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

    if (isNaN(jobId)) {
      res.status(400).json({
        message: "Invalid job ID",
      });
      return;
    }

    // Delete the job
    const deletedJob = await db.deleteJob(jobId);

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

import { Router } from "express";
import {
  completeTaskController,
  createJob,
  createTagController,
  createTask,
  deleteJob,
  deleteTagController,
  getAllJobs,
  getAllJobTasks,
  getJob,
  getJobLabels,
  getJobs,
  getJobTasks,
  getJobTaskStats,
  getNextAvailableTask,
  getTaskById,
  getTaskTagsController,
  updateJob,
} from "../controllers/jobController";
import { generatePresignedUrl } from "../services/s3Service";

const router = Router();

// GET /api/jobs - Get all jobs for the authenticated user
router.get("/jobs", getAllJobs);

// GET /api/orgs/:orgId/jobs - Get all jobs for an organization
router.get("/orgs/:orgId/jobs", getJobs);

// POST /api/orgs/:orgId/jobs - Create a new job for an organization
router.post("/orgs/:orgId/jobs", createJob);

// GET /api/jobs/:jobId - Get a specific job
router.get("/jobs/:jobId", getJob);

// GET /api/jobs/:jobId/labels - Get labels for a specific job
router.get("/jobs/:jobId/labels", getJobLabels);

// PUT /api/jobs/:jobId - Update a job
router.put("/jobs/:jobId", updateJob);

// DELETE /api/jobs/:jobId - Delete a job
router.delete("/jobs/:jobId", deleteJob);

// GET /api/jobs/:jobId/tasks - Get all tasks for a job
router.get("/jobs/:jobId/tasks", getJobTasks);

// GET /api/jobs/:jobId/all-tasks - Get all tasks for a job with pagination (admin only)
router.get("/jobs/:jobId/all-tasks", getAllJobTasks);

// GET /api/jobs/:jobId/stats - Get task statistics for a job
router.get("/jobs/:jobId/stats", getJobTaskStats);

// GET /api/jobs/:jobId/next-task - Get the next available task for a job
router.get("/jobs/:jobId/next-task", getNextAvailableTask);

// GET /api/jobs/:jobId/tasks/:taskId - Get a specific task
router.get("/jobs/:jobId/tasks/:taskId", getTaskById);

// POST /api/jobs/:jobId/tasks/:taskId/complete - Complete a task
router.post("/jobs/:jobId/tasks/:taskId/complete", completeTaskController);

// POST /api/jobs/:jobId/tasks - Create a new task for a job
router.post("/jobs/:jobId/tasks", createTask);

// GET /api/jobs/:jobId/tasks/:taskId/tags - Get all tags for a task
router.get("/jobs/:jobId/tasks/:taskId/tags", getTaskTagsController);

// POST /api/jobs/:jobId/tasks/:taskId/tags - Create a new tag for a task
router.post("/jobs/:jobId/tasks/:taskId/tags", createTagController);

// DELETE /api/tags/:tagId - Delete a tag
router.delete("/tags/:tagId", deleteTagController);

// GET /api/orgs/:orgId/jobs/:jobId/upload-url - Get a presigned URL for uploading a JSONL file
router.get("/orgs/:orgId/jobs/:jobId/upload-url", async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const orgId = parseInt(req.params.orgId);

    if (isNaN(jobId) || isNaN(orgId)) {
      res.status(400).json({
        message: "Invalid job ID or organization ID",
      });
      return;
    }

    const fileName = `tasks.jsonl`;
    const presignedUrl = await generatePresignedUrl(orgId, jobId, fileName);

    res.status(200).json({
      success: true,
      data: {
        url: presignedUrl,
        key: `orgs/${orgId}/jobs/${jobId}/${fileName}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

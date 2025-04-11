import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export interface Job {
  id: number;
  orgId: number;
  orgSlug: string;
  name: string;
  dataType: string;
  tagType: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  deletedById?: number | null;
  deletedAt?: string | null;
  totalTasks?: number;
  completedTasks?: number;
  inProgressTasks?: number;
}

export interface PresignedUrlResponse {
  url: string;
  key: string;
}

/**
 * Get all jobs
 * @param token JWT token
 */
export const getJobs = async (token: string): Promise<Job[]> => {
  const response = await axios.get<{ success: boolean; data: Job[] }>(
    `${API_URL}/api/jobs`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Get a specific job by ID
 * @param token JWT token
 * @param jobId ID of the job to retrieve
 */
export const getJob = async (token: string, jobId: number): Promise<Job> => {
  const response = await axios.get<{ success: boolean; data: Job }>(
    `${API_URL}/api/jobs/${jobId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Create a new job
 * @param token JWT token
 * @param jobData Job data to create
 */
export const createJob = async (
  token: string,
  jobData: Omit<Job, "id" | "createdAt" | "updatedAt">
): Promise<Job> => {
  const response = await axios.post<{ success: boolean; data: Job }>(
    `${API_URL}/api/jobs`,
    jobData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Create a new job for a specific organization
 * @param token JWT token
 * @param orgId Organization ID
 * @param jobData Job data to create
 */
export const createJobForOrg = async (
  token: string,
  orgId: number,
  jobData: Omit<Job, "id" | "createdAt" | "updatedAt" | "orgId" | "orgSlug">
): Promise<Job> => {
  const response = await axios.post<{ success: boolean; data: Job }>(
    `${API_URL}/api/orgs/${orgId}/jobs`,
    jobData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Update an existing job
 * @param token JWT token
 * @param jobId ID of the job to update
 * @param jobData Job data to update
 */
export const updateJob = async (
  token: string,
  jobId: number,
  jobData: Partial<Omit<Job, "id" | "createdAt" | "updatedAt">>
): Promise<Job> => {
  const response = await axios.patch<{ success: boolean; data: Job }>(
    `${API_URL}/api/jobs/${jobId}`,
    jobData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Delete a job
 * @param token JWT token
 * @param jobId ID of the job to delete
 */
export const deleteJob = async (
  token: string,
  jobId: number
): Promise<{ success: boolean; message: string; data: Job }> => {
  const response = await axios.delete<{
    success: boolean;
    message: string;
    data: Job;
  }>(`${API_URL}/api/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

/**
 * Get a presigned URL for uploading a JSONL file
 * @param token JWT token
 * @param jobId ID of the job
 * @param orgId Organization ID
 */
export const getJobUploadUrl = async (
  token: string,
  jobId: number,
  orgId: number
): Promise<PresignedUrlResponse> => {
  const response = await axios.get<{
    success: boolean;
    data: PresignedUrlResponse;
  }>(`${API_URL}/api/orgs/${orgId}/jobs/${jobId}/upload-url`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
};

/**
 * Upload a file to S3 using a presigned URL
 * @param url Presigned URL
 * @param file File to upload
 */
export const uploadFileToS3 = async (
  url: string,
  file: File | undefined
): Promise<void> => {
  if (!file) {
    throw new Error("No file provided");
  }

  await axios.put(url, file, {
    headers: {
      "Content-Type": "application/x-jsonlines",
    },
  });
};

/**
 * Create a new task for a job
 * @param token JWT token
 * @param jobId ID of the job
 * @param taskData Task data to create
 */
export const createTask = async (
  token: string,
  jobId: number,
  taskData: { url: string; s3Key: string }
): Promise<void> => {
  await axios.post(`${API_URL}/api/jobs/${jobId}/tasks`, taskData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Get task statistics for a job
 * @param token JWT token
 * @param jobId ID of the job to get statistics for
 */
export interface JobTaskStats {
  total: number;
  completed: number;
  in_progress: number;
}

export const getJobTaskStats = async (
  token: string,
  jobId: number
): Promise<JobTaskStats> => {
  const response = await axios.get<{ success: boolean; data: JobTaskStats }>(
    `${API_URL}/api/jobs/${jobId}/stats`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Interface for task data
 */
export interface Task {
  id: number;
  jobId: number;
  url: string;
  assignedToId: number | null;
  assignedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get the next available task for a job
 * @param token JWT token
 * @param jobId ID of the job
 * @returns The next available task or throws an error if none available
 */
export const getNextAvailableTask = async (
  token: string,
  jobId: number
): Promise<Task> => {
  const response = await axios.get<{ success: boolean; data: Task }>(
    `${API_URL}/api/jobs/${jobId}/next-task`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Get a specific task by ID
 * @param token JWT token
 * @param jobId ID of the job
 * @param taskId ID of the task
 * @returns The task or throws an error if not found
 */
export const getTask = async (
  token: string,
  jobId: number,
  taskId: number
): Promise<Task> => {
  const response = await axios.get<{ success: boolean; data: Task }>(
    `${API_URL}/api/jobs/${jobId}/tasks/${taskId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Complete a task
 * @param token JWT token
 * @param jobId ID of the job
 * @param taskId ID of the task to complete
 * @returns The completed task
 */
export const completeTask = async (
  token: string,
  jobId: number,
  taskId: number
): Promise<Task> => {
  const response = await axios.post<{ success: boolean; data: Task }>(
    `${API_URL}/api/jobs/${jobId}/tasks/${taskId}/complete`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Pagination interface
 */
export interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Get all tasks for a job with pagination (admin only)
 * @param token JWT token
 * @param jobId ID of the job
 * @param page Page number (1-indexed)
 * @param pageSize Number of tasks per page
 * @returns Paginated list of tasks and pagination info
 */
export const getAllJobTasks = async (
  token: string,
  jobId: number,
  page: number = 1,
  pageSize: number = 10
): Promise<{ tasks: Task[]; pagination: Pagination }> => {
  const response = await axios.get<{
    success: boolean;
    data: {
      tasks: Task[];
      pagination: Pagination;
    };
  }>(`${API_URL}/api/jobs/${jobId}/all-tasks`, {
    params: { page, pageSize },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
};

/**
 * Get job labels for a specific job
 * @param token JWT token
 * @param jobId ID of the job to get labels for
 */
export interface JobLabels {
  labels: string[];
  tagType: string;
}

export const getJobLabels = async (
  token: string,
  jobId: number
): Promise<JobLabels> => {
  const response = await axios.get<{ success: boolean; data: JobLabels }>(
    `${API_URL}/api/jobs/${jobId}/labels`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Tag interface for time segment tags
 */
export interface TimeSegmentTag {
  id?: number;
  taskId: number;
  createdById?: number;
  tagType: string;
  isPrediction?: boolean;
  values: {
    label: string;
    start: number;
    end: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create a tag for a task
 * @param token JWT token
 * @param jobId ID of the job
 * @param taskId ID of the task
 * @param tagData Tag data to create
 * @returns The created tag
 */
export const createTag = async (
  token: string,
  jobId: number,
  taskId: number,
  tagData: Omit<
    TimeSegmentTag,
    "id" | "taskId" | "createdById" | "createdAt" | "updatedAt"
  >
): Promise<TimeSegmentTag> => {
  const response = await axios.post<{ success: boolean; data: TimeSegmentTag }>(
    `${API_URL}/api/jobs/${jobId}/tasks/${taskId}/tags`,
    tagData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.data;
};

/**
 * Get all tags for a task
 * @param token JWT token
 * @param jobId ID of the job
 * @param taskId ID of the task
 * @returns Array of tags for the task
 */
export const getTaskTags = async (
  token: string,
  jobId: number,
  taskId: number
): Promise<TimeSegmentTag[]> => {
  const response = await axios.get<{
    success: boolean;
    data: TimeSegmentTag[];
  }>(`${API_URL}/api/jobs/${jobId}/tasks/${taskId}/tags`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
};

/**
 * Delete a tag
 * @param token JWT token
 * @param tagId ID of the tag to delete
 * @returns The deleted tag
 */
export const deleteTag = async (
  token: string,
  tagId: number
): Promise<TimeSegmentTag> => {
  const response = await axios.delete<{
    success: boolean;
    data: TimeSegmentTag;
    message: string;
  }>(`${API_URL}/api/tags/${tagId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.data;
};

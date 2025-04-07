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

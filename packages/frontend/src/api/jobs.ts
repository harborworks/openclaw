import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export interface Job {
  id: number;
  name: string;
  dataType: string;
  tagType: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
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

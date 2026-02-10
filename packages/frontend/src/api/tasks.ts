import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeIds: number[];
  tags: string[];
  createdBy: number | null;
  shireId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: number;
  taskId: number;
  fromAgentId: number;
  content: string;
  createdAt: string;
  agentName: string | null;
}

const opts = { withCredentials: true };

export const getTasks = async (params?: {
  assignee?: string;
  status?: string;
}): Promise<Task[]> => {
  const searchParams = new URLSearchParams();
  if (params?.assignee) searchParams.set("assignee", params.assignee);
  if (params?.status) searchParams.set("status", params.status);
  const qs = searchParams.toString();
  const response = await axios.get(
    `${API_URL}/api/tasks${qs ? `?${qs}` : ""}`,
    opts
  );
  return response.data;
};

export const getTask = async (id: number): Promise<Task> => {
  const response = await axios.get(`${API_URL}/api/tasks/${id}`, opts);
  return response.data;
};

export const createTask = async (data: {
  title: string;
  description?: string;
  assigneeIds?: number[];
  priority?: string;
  tags?: string[];
}): Promise<Task> => {
  const response = await axios.post(`${API_URL}/api/tasks`, data, opts);
  return response.data;
};

export const updateTask = async (
  id: number,
  data: Partial<
    Pick<Task, "title" | "description" | "status" | "assigneeIds" | "priority" | "tags">
  >
): Promise<Task> => {
  const response = await axios.patch(`${API_URL}/api/tasks/${id}`, data, opts);
  return response.data;
};

export const getTaskComments = async (
  taskId: number
): Promise<TaskComment[]> => {
  const response = await axios.get(
    `${API_URL}/api/tasks/${taskId}/messages`,
    opts
  );
  return response.data;
};

export const createTaskComment = async (
  taskId: number,
  data: { fromAgentId: number | string; content: string }
): Promise<TaskComment> => {
  const response = await axios.post(
    `${API_URL}/api/tasks/${taskId}/messages`,
    data,
    opts
  );
  return response.data;
};

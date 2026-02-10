/**
 * HTTP client for the Harbor backend API.
 * The daemon never touches the DB directly — it goes through the API.
 */

import config from "./config";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.harborApiUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.harborApiKey,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Harbor API ${res.status} ${path}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ── Types (mirrors backend responses) ──────────────────────────

export interface Agent {
  id: number;
  name: string;
  role: string;
  sessionKey: string;
  level: string | null;
  shireId: number | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeIds: number[];
  tags: string[];
  createdBy: number | null;
}

export interface Notification {
  id: number;
  agentId: number;
  taskId: number;
  commentId: number;
  delivered: boolean;
}

// ── API methods ────────────────────────────────────────────────

export async function getAgents(): Promise<Agent[]> {
  return request<Agent[]>("/agents");
}

export async function getTasks(): Promise<Task[]> {
  return request<Task[]>("/tasks");
}

export async function getTasksByAssignee(
  sessionKey: string
): Promise<Task[]> {
  return request<Task[]>(`/tasks?assignee=${encodeURIComponent(sessionKey)}`);
}

export async function getNotifications(
  sessionKey: string
): Promise<Notification[]> {
  return request<Notification[]>(
    `/notifications?agent=${encodeURIComponent(sessionKey)}`
  );
}

export async function markNotificationDelivered(id: number): Promise<void> {
  await request("/notifications/mark-delivered", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

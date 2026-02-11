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

export interface Notification {
  id: number;
  agentId: number;
  message: string;
  delivered: boolean;
}

// ── API methods ────────────────────────────────────────────────

export async function getAgents(): Promise<Agent[]> {
  return request<Agent[]>("/agents");
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

// ── Secrets ────────────────────────────────────────────────────

export interface PendingSecretsResponse {
  secrets: Array<{ id: number; name: string; value: string }>;
  count: number;
}

/**
 * Fetch pending secrets (decrypted by backend).
 * Calling this also marks them as synced on the backend.
 */
export async function getPendingSecrets(): Promise<PendingSecretsResponse> {
  return request<PendingSecretsResponse>("/secrets/pending");
}

export interface AllSecretsResponse {
  secrets: Array<{ id: number; name: string; value: string }>;
  count: number;
}

/** Fetch ALL secrets decrypted (for writing the full .env file). */
export async function getAllDecryptedSecrets(): Promise<AllSecretsResponse> {
  return request<AllSecretsResponse>("/secrets/all-decrypted");
}

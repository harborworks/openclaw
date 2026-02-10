/**
 * Client for the local OpenClaw gateway.
 * Used to wake agents, sync cron jobs, etc.
 */

import config from "./config";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.gatewayUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers as Record<string, string>,
  };
  if (config.gatewayToken) {
    headers["Authorization"] = `Bearer ${config.gatewayToken}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gateway ${res.status} ${path}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ── API methods ────────────────────────────────────────────────

export interface GatewaySession {
  key: string;
  status: string;
}

/**
 * Wake an agent session via the gateway.
 * Sends a system event that triggers the agent's heartbeat.
 */
export async function wakeAgent(
  sessionKey: string,
  message: string
): Promise<void> {
  // TODO: Confirm the actual gateway wake endpoint
  console.log(`[gateway] would wake ${sessionKey}: ${message}`);
}

/**
 * Get status of all sessions from the gateway.
 */
export async function getSessionStatus(): Promise<GatewaySession[]> {
  // TODO: Confirm the actual gateway status endpoint
  console.log("[gateway] would fetch session status");
  return [];
}

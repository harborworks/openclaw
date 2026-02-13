/**
 * Shared utilities for the Harbor daemon.
 */

import * as fs from "fs";
import * as path from "path";
import type { ConvexApiConfig } from "./secrets.js";

// --- File I/O ---

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// --- Convex HTTP ---

/** Make an authenticated request to the Convex HTTP API. */
export async function convexFetch(
  api: ConvexApiConfig,
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<Response> {
  const url = `${api.convexUrl}${path}`;
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${api.apiKey}`,
      "X-Harbor-ID": api.harborId,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!res.ok) {
    throw new Error(`Convex ${options.method ?? "GET"} ${path} failed: ${res.status}`);
  }
  return res;
}

/** GET JSON from Convex HTTP API. */
export async function convexGet<T>(api: ConvexApiConfig, path: string): Promise<T> {
  const res = await convexFetch(api, path);
  return res.json() as Promise<T>;
}

/** POST JSON to Convex HTTP API. */
export async function convexPost<T>(api: ConvexApiConfig, path: string, body: unknown): Promise<T> {
  const res = await convexFetch(api, path, { method: "POST", body });
  return res.json() as Promise<T>;
}

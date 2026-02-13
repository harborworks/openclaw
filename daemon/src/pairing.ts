/**
 * Pairing Sync — resolves admin-submitted codes against gateway pairing files.
 *
 * On each tick:
 * 1. Fetch pending codes from Convex (submitted by admin in UI)
 * 2. Try to approve each code against the gateway pairing file
 * 3. Report results back to Convex (approved with sender info, or failed)
 */

import * as fs from "fs";
import * as path from "path";
import type { ConvexApiConfig } from "./secrets.js";

function log(msg: string) {
  console.log(`[pairing] ${new Date().toISOString()} ${msg}`);
}

// --- Types ---

interface PairingRequest {
  id: string;
  code: string;
  createdAt: string;
  lastSeenAt: string;
  meta?: Record<string, string>;
}

interface PairingStore {
  version: number;
  requests: PairingRequest[];
}

interface AllowFromStore {
  version: number;
  allowFrom: string[];
}

interface PendingCode {
  _id: string;
  code: string;
  channel: string;
}

// --- File helpers ---

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// --- Convex API ---

async function fetchPendingCodes(
  api: ConvexApiConfig,
  channel: string,
): Promise<PendingCode[]> {
  const url = `${api.convexUrl}/api/daemon/pairing/pending?channel=${channel}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${api.apiKey}`,
      "X-Harbor-ID": api.harborId,
    },
  });
  if (!res.ok) throw new Error(`Fetch pending codes failed: ${res.status}`);
  return res.json();
}

async function reportApproved(
  api: ConvexApiConfig,
  id: string,
  senderId: string,
  senderMeta?: Record<string, string>,
): Promise<void> {
  const url = `${api.convexUrl}/api/daemon/pairing/approved`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${api.apiKey}`,
      "X-Harbor-ID": api.harborId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, senderId, senderMeta }),
  });
  if (!res.ok) throw new Error(`Report approved failed: ${res.status}`);
}

async function reportFailed(api: ConvexApiConfig, id: string): Promise<void> {
  const url = `${api.convexUrl}/api/daemon/pairing/failed`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${api.apiKey}`,
      "X-Harbor-ID": api.harborId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`Report failed failed: ${res.status}`);
}

// --- Core logic ---

const PAIRING_TTL_MS = 60 * 60 * 1000; // 1 hour

function approveCode(
  code: string,
  pairingPath: string,
  allowFromPath: string,
): { senderId: string; meta?: Record<string, string> } | null {
  const store = readJsonFile<PairingStore>(pairingPath, { version: 1, requests: [] });
  const requests = store.requests || [];
  const now = Date.now();

  // Find matching non-expired request
  const idx = requests.findIndex((r) => {
    if (r.code.toUpperCase() !== code.toUpperCase()) return false;
    const created = new Date(r.createdAt).getTime();
    return now - created < PAIRING_TTL_MS;
  });

  if (idx < 0) return null;

  const entry = requests[idx];
  requests.splice(idx, 1);
  writeJsonFile(pairingPath, { version: 1, requests });

  // Add to allowFrom
  const allowStore = readJsonFile<AllowFromStore>(allowFromPath, {
    version: 1,
    allowFrom: [],
  });
  if (!allowStore.allowFrom.includes(entry.id)) {
    allowStore.allowFrom.push(entry.id);
    writeJsonFile(allowFromPath, allowStore);
  }

  return { senderId: entry.id, meta: entry.meta };
}

// --- Main sync ---

export async function syncPairing(
  api: ConvexApiConfig,
  credentialsDir: string,
): Promise<void> {
  const channels = ["telegram"];

  for (const channel of channels) {
    const pending = await fetchPendingCodes(api, channel);
    if (pending.length === 0) continue;

    const pairingPath = path.join(credentialsDir, `${channel}-pairing.json`);
    const allowFromPath = path.join(credentialsDir, `${channel}-allowFrom.json`);

    for (const req of pending) {
      const result = approveCode(req.code, pairingPath, allowFromPath);
      if (result) {
        await reportApproved(api, req._id, result.senderId, result.meta);
        log(`Approved ${channel} pairing code ${req.code} → sender ${result.senderId}`);
      } else {
        await reportFailed(api, req._id);
        log(`Pairing code ${req.code} not found or expired`);
      }
    }
  }
}

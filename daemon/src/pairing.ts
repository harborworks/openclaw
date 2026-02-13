/**
 * Pairing Sync — bridges gateway pairing files to Convex.
 *
 * On each tick:
 * 1. Reads pending pairing requests from gateway credential files
 * 2. Pushes them to Convex so the UI can display them
 * 3. Reads approved requests from Convex
 * 4. Writes approvals to the gateway allowFrom files
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

interface ApprovedRequest {
  _id: string;
  senderId: string;
  code: string;
  channel: string;
  accountId?: string;
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

async function pushPairingRequests(
  api: ConvexApiConfig,
  channel: string,
  requests: Array<{
    senderId: string;
    code: string;
    senderMeta?: unknown;
    createdAt: string;
    accountId?: string;
  }>,
): Promise<void> {
  const url = `${api.convexUrl}/api/daemon/pairing/sync`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${api.apiKey}`,
      "X-Harbor-ID": api.harborId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, requests }),
  });
  if (!res.ok) throw new Error(`Push pairing failed: ${res.status}`);
}

async function fetchApprovedRequests(
  api: ConvexApiConfig,
  channel: string,
): Promise<ApprovedRequest[]> {
  const url = `${api.convexUrl}/api/daemon/pairing/approved?channel=${channel}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${api.apiKey}`,
      "X-Harbor-ID": api.harborId,
    },
  });
  if (!res.ok) throw new Error(`Fetch approved failed: ${res.status}`);
  return res.json();
}

// --- Main sync ---

let lastPairingState = "";

export async function syncPairing(
  api: ConvexApiConfig,
  credentialsDir: string,
): Promise<void> {
  const channels = ["telegram"]; // Extend as we add more channels

  for (const channel of channels) {
    const pairingPath = path.join(credentialsDir, `${channel}-pairing.json`);
    const allowFromPath = path.join(credentialsDir, `${channel}-allowFrom.json`);

    // 1. Read pending requests from gateway file
    const store = readJsonFile<PairingStore>(pairingPath, { version: 1, requests: [] });
    const pending = store.requests || [];

    // Build fingerprint
    const fingerprint = JSON.stringify(pending.map((r) => r.code).sort());
    const changed = fingerprint !== lastPairingState;

    // 2. Push pending requests to Convex (always, to clean up expired)
    if (changed || pending.length > 0) {
      await pushPairingRequests(
        api,
        channel,
        pending.map((r) => ({
          senderId: r.id,
          code: r.code,
          senderMeta: r.meta,
          createdAt: r.createdAt,
        })),
      );
      lastPairingState = fingerprint;
    }

    // 3. Fetch approved requests from Convex
    const approved = await fetchApprovedRequests(api, channel);
    if (approved.length === 0) continue;

    // 4. Write approvals to allowFrom file
    const allowFromStore = readJsonFile<AllowFromStore>(allowFromPath, {
      version: 1,
      allowFrom: [],
    });
    const existingAllowFrom = new Set(allowFromStore.allowFrom);
    let added = 0;

    for (const req of approved) {
      if (!existingAllowFrom.has(req.senderId)) {
        allowFromStore.allowFrom.push(req.senderId);
        existingAllowFrom.add(req.senderId);
        added++;
      }
    }

    if (added > 0) {
      writeJsonFile(allowFromPath, allowFromStore);
      log(`Added ${added} approved sender(s) to ${channel} allowFrom`);

      // Also remove approved requests from the pairing file
      const approvedCodes = new Set(approved.map((r) => r.code));
      store.requests = store.requests.filter((r) => !approvedCodes.has(r.code));
      writeJsonFile(pairingPath, store);
    }
  }
}

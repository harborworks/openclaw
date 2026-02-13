/**
 * Pairing Sync — resolves admin-submitted codes against gateway pairing files.
 *
 * On each tick:
 * 1. Fetch pending codes from Convex (submitted by admin in UI)
 * 2. Try to approve each code against the gateway pairing file
 * 3. Report results back to Convex (approved with sender info, or failed)
 * 4. Reconcile allowFrom file with Convex-approved senders (handles revocations)
 */

import * as path from "path";
import type { ConvexApiConfig } from "./secrets.js";
import { readJsonFile, writeJsonFile, convexGet, convexPost } from "./utils.js";

function log(msg: string) {
  console.log(`[pairing] ${new Date().toISOString()} ${msg}`);
}

// --- Types ---

export interface PairingRequest {
  id: string;
  code: string;
  createdAt: string;
  lastSeenAt: string;
  meta?: Record<string, string>;
}

export interface PairingStore {
  version: number;
  requests: PairingRequest[];
}

export interface AllowFromStore {
  version: number;
  allowFrom: string[];
}

interface PendingCode {
  _id: string;
  code: string;
  channel: string;
}

// --- Pure logic (exported for testing) ---

export const PAIRING_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Find and approve a pairing code in the store.
 * Returns the matched sender info, or null if not found/expired.
 * Mutates the stores in place (caller is responsible for persistence).
 */
export function resolveCode(
  code: string,
  pairingStore: PairingStore,
  allowFromStore: AllowFromStore,
  nowMs: number = Date.now(),
): { senderId: string; meta?: Record<string, string> } | null {
  const requests = pairingStore.requests || [];
  const upperCode = code.toUpperCase();

  const idx = requests.findIndex((r) => {
    if (r.code.toUpperCase() !== upperCode) return false;
    const created = new Date(r.createdAt).getTime();
    return nowMs - created < PAIRING_TTL_MS;
  });

  if (idx < 0) return null;

  const entry = requests[idx];
  requests.splice(idx, 1);

  if (!allowFromStore.allowFrom.includes(entry.id)) {
    allowFromStore.allowFrom.push(entry.id);
  }

  return { senderId: entry.id, meta: entry.meta };
}

// --- File-backed operations ---

function approveCode(
  code: string,
  pairingPath: string,
  allowFromPath: string,
): { senderId: string; meta?: Record<string, string> } | null {
  const pairingStore = readJsonFile<PairingStore>(pairingPath, { version: 1, requests: [] });
  const allowFromStore = readJsonFile<AllowFromStore>(allowFromPath, { version: 1, allowFrom: [] });

  const result = resolveCode(code, pairingStore, allowFromStore);
  if (!result) return null;

  writeJsonFile(pairingPath, pairingStore);
  writeJsonFile(allowFromPath, allowFromStore);
  return result;
}

// --- Allow list reconciliation ---

let lastAllowFromState = "";

/** Reset the cached state (for testing). */
export function resetAllowFromCache(): void {
  lastAllowFromState = "";
}

function syncAllowFrom(
  approvedSenders: string[],
  allowFromPath: string,
): void {
  const fingerprint = JSON.stringify(approvedSenders.sort());
  if (fingerprint === lastAllowFromState) return;

  writeJsonFile(allowFromPath, { version: 1, allowFrom: approvedSenders } satisfies AllowFromStore);
  lastAllowFromState = fingerprint;
  log(`Synced allowFrom: ${approvedSenders.length} sender(s)`);
}

// --- Main sync ---

export async function syncPairing(
  api: ConvexApiConfig,
  credentialsDir: string,
): Promise<void> {
  const channels = ["telegram"];

  for (const channel of channels) {
    const pairingPath = path.join(credentialsDir, `${channel}-pairing.json`);
    const allowFromPath = path.join(credentialsDir, `${channel}-allowFrom.json`);

    // 1. Process any pending codes submitted by admins
    const pending = await convexGet<PendingCode[]>(
      api, `/api/daemon/pairing/pending?channel=${channel}`,
    );
    for (const req of pending) {
      const result = approveCode(req.code, pairingPath, allowFromPath);
      if (result) {
        await convexPost(api, "/api/daemon/pairing/approved", {
          id: req._id,
          senderId: result.senderId,
          senderMeta: result.meta,
        });
        log(`Approved ${channel} pairing code ${req.code} → sender ${result.senderId}`);
      } else {
        await convexPost(api, "/api/daemon/pairing/failed", { id: req._id });
        log(`Pairing code ${req.code} not found or expired`);
      }
    }

    // 2. Reconcile allowFrom file with Convex approved senders.
    // Handles revocations: if a record is deleted in the UI,
    // the sender is removed from allowFrom on the next tick.
    const approvedSenders = await convexGet<string[]>(
      api, `/api/daemon/pairing/senders?channel=${channel}`,
    );
    syncAllowFrom(approvedSenders, allowFromPath);
  }
}

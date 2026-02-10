/**
 * Secret Sync Job
 *
 * Polls the Harbor API for pending secrets. When there are pending changes,
 * fetches ALL secrets and writes the complete .env file.
 * Preserves any existing non-managed vars in the file.
 */

import * as fs from "fs";
import * as path from "path";
import * as harbor from "../harbor-client";

const ENV_FILE_PATH =
  process.env.ENV_FILE_PATH ||
  path.join(process.env.HOME ?? "/home/node", ".openclaw", ".env");

const MANAGED_HEADER = "# Managed by Harbor daemon — do not edit manually";

/** System vars that should never be overwritten by secrets. */
const SYSTEM_VAR_BLOCKLIST = new Set([
  "OPENCLAW_GATEWAY_PORT",
  "OPENCLAW_GATEWAY_TOKEN",
  "HOME",
  "PATH",
]);

export async function secretSync(): Promise<void> {
  // Check if there are any pending changes
  const { count } = await harbor.getPendingSecrets();

  if (count === 0) return;

  console.log(`[secret-sync] ${count} pending secret(s), rebuilding .env`);

  // Fetch ALL secrets to write the complete file
  const { secrets: allSecrets } = await harbor.getAllDecryptedSecrets();

  // Read existing env file to preserve non-managed vars
  const existingEnv = new Map<string, string>();
  let hasHeader = false;
  try {
    const content = fs.readFileSync(ENV_FILE_PATH, "utf-8");
    hasHeader = content.includes(MANAGED_HEADER);
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        existingEnv.set(trimmed.substring(0, eqIdx), trimmed.substring(eqIdx + 1));
      }
    }
  } catch {
    // File doesn't exist yet
  }

  // Build the set of managed secret names
  const managedNames = new Set(allSecrets.map((s) => s.name));

  // Start with existing non-managed vars (preserve them)
  const finalEnv = new Map<string, string>();
  for (const [key, val] of existingEnv) {
    if (!managedNames.has(key)) {
      finalEnv.set(key, val);
    }
  }

  // Apply all managed secrets (skip system vars)
  for (const secret of allSecrets) {
    if (SYSTEM_VAR_BLOCKLIST.has(secret.name)) {
      console.log(`[secret-sync] skipping system var: ${secret.name}`);
      continue;
    }
    finalEnv.set(secret.name, secret.value);
  }

  // Write env file
  const dir = path.dirname(ENV_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const lines = [MANAGED_HEADER];
  for (const [key, val] of [...finalEnv.entries()].sort()) {
    lines.push(`${key}=${val}`);
  }
  fs.writeFileSync(ENV_FILE_PATH, lines.join("\n") + "\n", { mode: 0o600 });

  console.log(
    `[secret-sync] wrote ${finalEnv.size} var(s) to ${ENV_FILE_PATH}`
  );
}

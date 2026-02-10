/**
 * Secret Sync Job
 *
 * Polls the Harbor API for pending secrets, then writes them
 * to the .env file in the OpenClaw config directory.
 */

import * as fs from "fs";
import * as path from "path";
import * as harbor from "../harbor-client";
import config from "../config";

const ENV_FILE_PATH =
  process.env.ENV_FILE_PATH ||
  path.join(process.env.HOME ?? "/home/node", ".openclaw", ".env");

/** System vars that should never be overwritten by secrets. */
const SYSTEM_VAR_BLOCKLIST = new Set([
  "OPENCLAW_GATEWAY_PORT",
  "OPENCLAW_GATEWAY_TOKEN",
  "HOME",
  "PATH",
]);

export async function secretSync(): Promise<void> {
  const { secrets, count } = await harbor.getPendingSecrets();

  if (count === 0) return;

  console.log(`[secret-sync] ${count} pending secret(s) to sync`);

  // Read existing env file
  const existingEnv = new Map<string, string>();
  try {
    const content = fs.readFileSync(ENV_FILE_PATH, "utf-8");
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

  // Apply new secrets
  for (const secret of secrets) {
    if (SYSTEM_VAR_BLOCKLIST.has(secret.name)) {
      console.log(`[secret-sync] skipping system var: ${secret.name}`);
      continue;
    }
    existingEnv.set(secret.name, secret.value);
    console.log(`[secret-sync] updated: ${secret.name}`);
  }

  // Write env file
  const dir = path.dirname(ENV_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const lines = ["# Managed by Harbor daemon — do not edit manually"];
  for (const [key, val] of [...existingEnv.entries()].sort()) {
    lines.push(`${key}=${val}`);
  }
  fs.writeFileSync(ENV_FILE_PATH, lines.join("\n") + "\n", { mode: 0o600 });

  console.log(
    `[secret-sync] wrote ${existingEnv.size} var(s) to ${ENV_FILE_PATH}`
  );
}

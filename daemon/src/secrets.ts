/**
 * Secrets sync: pull pending secrets from Convex HTTP API, decrypt, write to
 * env file, mark as consumed.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/** Env vars managed by the system — never overwrite. */
const SYSTEM_BLOCKLIST = new Set([
  "OPENCLAW_GATEWAY_PORT",
  "OPENCLAW_GATEWAY_TOKEN",
  "OPENCLAW_SYSTEMD_UNIT",
  "OPENCLAW_SERVICE_MARKER",
  "OPENCLAW_SERVICE_KIND",
  "OPENCLAW_SERVICE_VERSION",
  "CONVEX_URL",
  "VITE_CONVEX_URL",
  "CONVEX_DEPLOY_KEY",
  "HOME",
  "PATH",
]);

export type ConvexApiConfig = {
  convexUrl: string;
  harborId: string;
  apiKey: string;
};

let privateKey: crypto.KeyObject | null = null;
let lastSecretsHash = "";

/** Load or generate RSA-OAEP keypair. Returns public key as JWK JSON string. */
export function initKeypair(keyDir: string): string {
  const keyPath = path.join(keyDir, "secrets.key");

  if (fs.existsSync(keyPath)) {
    const pem = fs.readFileSync(keyPath, "utf-8");
    privateKey = crypto.createPrivateKey(pem);
    console.log("[secrets] Loaded existing keypair");
  } else {
    const { privateKey: priv } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    if (!fs.existsSync(keyDir)) fs.mkdirSync(keyDir, { recursive: true });
    fs.writeFileSync(keyPath, priv, { mode: 0o600 });
    privateKey = crypto.createPrivateKey(priv);
    console.log("[secrets] Generated new RSA-OAEP keypair");
  }

  const pubKey = crypto.createPublicKey(privateKey);
  return JSON.stringify(pubKey.export({ format: "jwk" }));
}

/** Decrypt a base64-encoded RSA-OAEP ciphertext. */
function decrypt(encryptedB64: string): string {
  if (!privateKey) throw new Error("Keypair not initialized");
  const buf = Buffer.from(encryptedB64, "base64");
  const decrypted = crypto.privateDecrypt(
    { key: privateKey, oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    buf,
  );
  return decrypted.toString("utf-8");
}

/** Try to decrypt; if it fails (e.g. plaintext from HTTP dev), return as-is. */
function decryptOrPassthrough(value: string): string {
  try {
    return decrypt(value);
  } catch {
    // Likely plaintext (insecure context / dev mode)
    return value;
  }
}

/** Read an existing env file into a Map. */
function readEnvFile(filePath: string): Map<string, string> {
  const env = new Map<string, string>();
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        let val = trimmed.substring(eqIdx + 1);
        // Strip surrounding double quotes and unescape
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        env.set(trimmed.substring(0, eqIdx), val);
      }
    }
  } catch {
    // File doesn't exist yet
  }
  return env;
}

/** Write env Map to file. */
function writeEnvFile(filePath: string, env: Map<string, string>): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const lines = ["# Managed by Harbor daemon — do not edit manually"];
  for (const [key, val] of [...env.entries()].sort()) {
    lines.push(`${key}="${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  }
  fs.writeFileSync(filePath, lines.join("\n") + "\n", { mode: 0o600 });
}

/** Make an authenticated request to Convex HTTP API. */
async function convexApi(
  api: ConvexApiConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const url = `${api.convexUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${api.apiKey}`,
      "X-Harbor-ID": api.harborId,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex API ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

/** Register the daemon's public key with Convex. */
export async function registerPublicKey(
  api: ConvexApiConfig,
  publicKeyJwk: string,
): Promise<void> {
  await convexApi(api, "POST", "/api/daemon/register", { publicKey: publicKeyJwk });
}

/**
 * Config patches for known secret keys.
 * When these secrets are set, the corresponding config is patched into the
 * gateway so it knows how to use the env var.
 */
export const CONFIG_PATCHES: Record<string, Record<string, unknown>> = {
  BRAVE_SEARCH_API_KEY: {
    tools: {
      web: {
        search: {
          apiKey: "${BRAVE_SEARCH_API_KEY}",
          provider: "brave",
        },
      },
    },
  },
  TELEGRAM_BOT_TOKEN: {
    channels: {
      telegram: {
        botToken: "${TELEGRAM_BOT_TOKEN}",
        enabled: true,
        dmPolicy: "pairing",
        groupPolicy: "allowlist",
        streamMode: "block",
      },
    },
    plugins: {
      entries: {
        telegram: {
          enabled: true,
        },
      },
    },
  },
};

/**
 * Config patches to REMOVE when a config-linked secret is deleted.
 * Sets the values to empty/disabled so the gateway doesn't crash on missing env vars.
 */
const CONFIG_REMOVALS: Record<string, Record<string, unknown>> = {
  BRAVE_SEARCH_API_KEY: {
    tools: {
      web: {
        search: {
          apiKey: "",
          provider: "",
        },
      },
    },
  },
  TELEGRAM_BOT_TOKEN: {
    channels: {
      telegram: {
        enabled: false,
      },
    },
    plugins: {
      entries: {
        telegram: {
          enabled: false,
        },
      },
    },
  },
};

/**
 * Poll Convex HTTP API for pending secrets, decrypt, write to env file,
 * mark consumed. Also handles pending deletions.
 * Returns names of secrets that were written.
 */
export async function syncSecrets(
  api: ConvexApiConfig,
  envFilePath: string,
  onRestart?: () => Promise<void>,
  onConfigPatch?: (patch: Record<string, unknown>) => Promise<void>,
): Promise<string[]> {
  const pendingSecrets = (await convexApi(api, "GET", "/api/daemon/secrets")) as Array<{
    _id: string;
    name: string;
    pendingValue: string;
  }>;

  const hash = JSON.stringify(pendingSecrets);
  if (hash === lastSecretsHash) return [];
  lastSecretsHash = hash;

  if (pendingSecrets.length === 0) return [];

  console.log(`[secrets] ${pendingSecrets.length} pending secret(s) detected`);

  const env = readEnvFile(envFilePath);
  const written: string[] = [];

  for (const secret of pendingSecrets) {
    if (SYSTEM_BLOCKLIST.has(secret.name)) {
      console.log(`[secrets]   Skipping system var: ${secret.name}`);
      continue;
    }
    const plaintext = decryptOrPassthrough(secret.pendingValue);
    env.set(secret.name, plaintext);
    written.push(secret.name);
    console.log(`[secrets]   Decrypted: ${secret.name}`);

    try {
      await convexApi(api, "POST", "/api/daemon/secrets/consumed", { id: secret._id });
      console.log(`[secrets]   Consumed: ${secret.name}`);
    } catch (err) {
      console.error(`[secrets]   Failed to mark consumed: ${secret.name}`, err);
    }
  }

  writeEnvFile(envFilePath, env);
  console.log(`[secrets] Env file updated: ${envFilePath} (${env.size} vars)`);

  // Apply config patches for config-linked secrets
  if (onConfigPatch) {
    const mergedPatch: Record<string, unknown> = {};
    for (const name of written) {
      const patch = CONFIG_PATCHES[name];
      if (patch) {
        console.log(`[secrets]   Config patch for: ${name}`);
        deepMerge(mergedPatch, patch);
      }
    }
    if (Object.keys(mergedPatch).length > 0) {
      try {
        await onConfigPatch(mergedPatch);
        console.log(`[secrets] Applied config patches for: ${written.filter((n) => CONFIG_PATCHES[n]).join(", ")}`);
      } catch (err) {
        console.error(`[secrets] Failed to apply config patches:`, err);
      }
    }
  }

  // Handle pending deletions
  const pendingDeletes = (await convexApi(api, "GET", "/api/daemon/secrets/deletes")) as Array<{
    _id: string;
    name: string;
  }>;

  if (pendingDeletes.length > 0) {
    console.log(`[secrets] ${pendingDeletes.length} pending deletion(s) detected`);
    const env = written.length > 0 ? readEnvFile(envFilePath) : readEnvFile(envFilePath);

    let envChanged = false;
    for (const del of pendingDeletes) {
      if (env.has(del.name)) {
        env.delete(del.name);
        envChanged = true;
        console.log(`[secrets]   Removed from env: ${del.name}`);
      }

      // Apply config removal patch if config-linked
      if (onConfigPatch && CONFIG_REMOVALS[del.name]) {
        try {
          await onConfigPatch(CONFIG_REMOVALS[del.name]);
          console.log(`[secrets]   Removed config for: ${del.name}`);
        } catch (err) {
          console.error(`[secrets]   Failed to remove config for: ${del.name}`, err);
        }
      }

      try {
        await convexApi(api, "POST", "/api/daemon/secrets/deleted", { id: del._id });
        console.log(`[secrets]   Deleted: ${del.name}`);
      } catch (err) {
        console.error(`[secrets]   Failed to confirm deletion: ${del.name}`, err);
      }
    }

    if (envChanged) {
      writeEnvFile(envFilePath, env);
      console.log(`[secrets] Env file updated: ${envFilePath} (${env.size} vars)`);
    }
  }

  const needsRestart = written.length > 0 || pendingDeletes.length > 0;
  if (needsRestart && onRestart) {
    await onRestart();
  }

  return written;
}

/** Deep merge source into target (mutates target). */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      target[key] = source[key];
    }
  }
}

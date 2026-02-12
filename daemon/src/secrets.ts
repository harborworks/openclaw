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
        env.set(trimmed.substring(0, eqIdx), trimmed.substring(eqIdx + 1));
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
    lines.push(`${key}=${val}`);
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
 * Poll Convex HTTP API for pending secrets, decrypt, write to env file,
 * mark consumed.
 */
export async function syncSecrets(
  api: ConvexApiConfig,
  envFilePath: string,
  onRestart?: () => Promise<void>,
): Promise<void> {
  const pendingSecrets = (await convexApi(api, "GET", "/api/daemon/secrets")) as Array<{
    _id: string;
    name: string;
    pendingValue: string;
  }>;

  const hash = JSON.stringify(pendingSecrets);
  if (hash === lastSecretsHash) return;
  lastSecretsHash = hash;

  if (pendingSecrets.length === 0) return;

  console.log(`[secrets] ${pendingSecrets.length} pending secret(s) detected`);

  const env = readEnvFile(envFilePath);

  for (const secret of pendingSecrets) {
    if (SYSTEM_BLOCKLIST.has(secret.name)) {
      console.log(`[secrets]   Skipping system var: ${secret.name}`);
      continue;
    }
    const plaintext = decryptOrPassthrough(secret.pendingValue);
    env.set(secret.name, plaintext);
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

  if (onRestart) {
    await onRestart();
  }
}

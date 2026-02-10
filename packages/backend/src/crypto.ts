/**
 * AES-256-GCM encryption for secrets at rest.
 * The encryption key is derived from the ENCRYPTION_KEY env var.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/** Derive a 32-byte key from the env var (SHA-256 hash). */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || "dev-encryption-key";
  return createHash("sha256").update(raw).digest();
}

export interface EncryptedData {
  encryptedValue: string; // base64
  iv: string; // base64
  authTag: string; // base64
}

export function encrypt(plaintext: string): EncryptedData {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf-8", "base64");
  encrypted += cipher.final("base64");

  return {
    encryptedValue: encrypted,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decrypt(data: EncryptedData): string {
  const key = getKey();
  const iv = Buffer.from(data.iv, "base64");
  const authTag = Buffer.from(data.authTag, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.encryptedValue, "base64", "utf-8");
  decrypted += decipher.final("utf-8");

  return decrypted;
}

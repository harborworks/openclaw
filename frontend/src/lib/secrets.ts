/** Reserved system env vars that cannot be set as secrets. */
const RESERVED_PREFIXES = ["OPENCLAW_", "CONVEX_", "VITE_CONVEX_", "GATEWAY_"];
const RESERVED_NAMES = new Set(["HOME", "PATH", "DOCKER_GID", "SANDBOX_UID", "SANDBOX_GID"]);

export function isReservedName(name: string): boolean {
  if (RESERVED_NAMES.has(name)) return true;
  return RESERVED_PREFIXES.some((p) => name.startsWith(p));
}

/** Required keys — nothing works without these. */
export const REQUIRED_KEYS: readonly { name: string; description: string }[] = [];

/** Recommended keys — unlock important capabilities. */
export const RECOMMENDED_KEYS = [
  { name: "BRAVE_SEARCH_API_KEY", description: "Brave Search API for web search" },
] as const;

export type SecretCategory = "required" | "recommended" | "custom";

export interface SecretInfo {
  _id: string;
  name: string;
  category: SecretCategory;
  description?: string;
  isSet: boolean;
  hasPending: boolean;
  updatedAt?: number;
}

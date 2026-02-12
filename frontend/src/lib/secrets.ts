/** Reserved system env vars that cannot be set as secrets. */
const RESERVED_PREFIXES = ["OPENCLAW_", "CONVEX_", "VITE_CONVEX_", "GATEWAY_"];
const RESERVED_NAMES = new Set(["HOME", "PATH", "DOCKER_GID", "SANDBOX_UID", "SANDBOX_GID"]);

export function isReservedName(name: string): boolean {
  if (RESERVED_NAMES.has(name)) return true;
  return RESERVED_PREFIXES.some((p) => name.startsWith(p));
}

/** Well-known required keys with descriptions. */
export const REQUIRED_KEYS = [
  { name: "ANTHROPIC_API_KEY", description: "Claude API key for agent reasoning" },
  { name: "BRAVE_SEARCH_API_KEY", description: "Brave Search API for web search" },
  { name: "OPENAI_API_KEY", description: "OpenAI API key (optional, for GPT models)" },
] as const;

export type SecretCategory = "required" | "custom";

export interface SecretInfo {
  _id: string;
  name: string;
  category: SecretCategory;
  description?: string;
  isSet: boolean;
  hasPending: boolean;
  updatedAt?: number;
}

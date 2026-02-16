import type { OpenClawConfig } from "./types.js";

export function collectConfigEnvVars(cfg?: OpenClawConfig): Record<string, string> {
  const envConfig = cfg?.env;
  if (!envConfig) {
    return {};
  }

  const entries: Record<string, string> = {};

  if (envConfig.vars) {
    for (const [key, value] of Object.entries(envConfig.vars)) {
      if (value === undefined || value === null) {
        continue;
      }
      // Include empty strings — they signal deletion
      entries[key] = value;
    }
  }

  for (const [key, value] of Object.entries(envConfig)) {
    if (key === "shellEnv" || key === "vars") {
      continue;
    }
    if (typeof value !== "string") {
      continue;
    }
    // Include empty strings — they signal deletion
    entries[key] = value;
  }

  return entries;
}

export function applyConfigEnvVars(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const entries = collectConfigEnvVars(cfg);
  for (const [key, value] of Object.entries(entries)) {
    if (!value.trim()) {
      // Empty value = delete the env var
      delete env[key];
      continue;
    }
    // Always apply config.env values (overwrite existing)
    env[key] = value;
  }
}

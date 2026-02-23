import type { OpenClawConfig } from "./types.js";
import { isDangerousHostEnvVarName, normalizeEnvVarKey } from "../infra/host-env-security.js";

function collectConfigEnvVarsByTarget(cfg?: OpenClawConfig): Record<string, string> {
  const envConfig = cfg?.env;
  if (!envConfig) {
    return {};
  }

  const entries: Record<string, string> = {};

  if (envConfig.vars) {
    for (const [rawKey, value] of Object.entries(envConfig.vars)) {
      if (!value) {
        continue;
      }
      const key = normalizeEnvVarKey(rawKey, { portable: true });
      if (!key) {
        continue;
      }
      if (isDangerousHostEnvVarName(key)) {
        continue;
      }
      entries[key] = value;
    }
  }

  for (const [rawKey, value] of Object.entries(envConfig)) {
    if (rawKey === "shellEnv" || rawKey === "vars") {
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      continue;
    }
    const key = normalizeEnvVarKey(rawKey, { portable: true });
    if (!key) {
      continue;
    }
    if (isDangerousHostEnvVarName(key)) {
      continue;
    }
    entries[key] = value;
  }

  return entries;
}

export function collectConfigRuntimeEnvVars(cfg?: OpenClawConfig): Record<string, string> {
  return collectConfigEnvVarsByTarget(cfg);
}

export function collectConfigServiceEnvVars(cfg?: OpenClawConfig): Record<string, string> {
  return collectConfigEnvVarsByTarget(cfg);
}

/** @deprecated Use `collectConfigRuntimeEnvVars` or `collectConfigServiceEnvVars`. */
export function collectConfigEnvVars(cfg?: OpenClawConfig): Record<string, string> {
  return collectConfigRuntimeEnvVars(cfg);
}

export function applyConfigEnvVars(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const envConfig = cfg?.env;
  if (!envConfig) {
    return;
  }

  const applyEntry = (rawKey: string, value: unknown) => {
    if (typeof value !== "string") {
      return;
    }
    const key = normalizeEnvVarKey(rawKey, { portable: true });
    if (!key || isDangerousHostEnvVarName(key)) {
      return;
    }
    // Empty string means explicit delete/unset.
    if (!value.trim()) {
      delete env[key];
      return;
    }
    // Overwrite existing values so config/env secret updates propagate.
    env[key] = value;
  };

  if (envConfig.vars) {
    for (const [rawKey, value] of Object.entries(envConfig.vars)) {
      applyEntry(rawKey, value);
    }
  }

  for (const [rawKey, value] of Object.entries(envConfig)) {
    if (rawKey === "shellEnv" || rawKey === "vars") {
      continue;
    }
    applyEntry(rawKey, value);
  }
}

import type { SecretInfo } from "../../lib/secrets";
import { StatusBadge } from "../StatusBadge";

interface SecretStatusProps {
  secret?: SecretInfo;
  /** Override labels. Defaults: unset="Not set", set="✓ Set", pending="⏳ Syncing…" */
  labels?: { unset?: string; set?: string; pending?: string };
}

export function SecretStatus({ secret, labels }: SecretStatusProps) {
  const unset = labels?.unset ?? "Not set";
  const set = labels?.set ?? "✓ Set";
  const pending = labels?.pending ?? "⏳ Syncing…";

  if (!secret) {
    return <StatusBadge label={unset} variant="unset" />;
  }
  if (secret.hasPending) {
    return <StatusBadge label={pending} variant="pending" />;
  }
  if (secret.isSet) {
    return <StatusBadge label={set} variant="set" />;
  }
  return <StatusBadge label={unset} variant="unset" />;
}

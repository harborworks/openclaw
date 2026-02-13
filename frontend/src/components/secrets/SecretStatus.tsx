import type { SecretInfo } from "../../lib/secrets";

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
    return <span className="secret-status secret-status-unset">{unset}</span>;
  }
  if (secret.hasPending) {
    return <span className="secret-status secret-status-pending">{pending}</span>;
  }
  if (secret.isSet) {
    return <span className="secret-status secret-status-set">{set}</span>;
  }
  return <span className="secret-status secret-status-unset">{unset}</span>;
}

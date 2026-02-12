import type { SecretInfo } from "../../lib/secrets";

interface SecretStatusProps {
  secret?: SecretInfo;
}

export function SecretStatus({ secret }: SecretStatusProps) {
  if (!secret) {
    return <span className="secret-status secret-status-unset">Not set</span>;
  }
  if (secret.hasPending) {
    return <span className="secret-status secret-status-pending">⏳ Syncing…</span>;
  }
  if (secret.isSet) {
    return <span className="secret-status secret-status-set">✓ Set</span>;
  }
  return <span className="secret-status secret-status-unset">Not set</span>;
}

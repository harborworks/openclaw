/**
 * Generic status badge — reusable pill for "Connected", "Not set", etc.
 * Uses the same styling as SecretStatus.
 */

type BadgeVariant = "set" | "unset" | "pending";

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span className={`secret-status secret-status-${variant}`}>
      {label}
    </span>
  );
}

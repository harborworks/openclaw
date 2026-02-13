import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

/** Allows superAdmin and staff users into admin pages. */
export function AdminRoute({ children }: { children: ReactNode }) {
  const dbUser = useCurrentUser();

  // Still loading
  if (dbUser === undefined) return null;

  // Must be superAdmin or staff
  if (!dbUser?.isSuperAdmin && !dbUser?.isStaff) return <Navigate to="/" replace />;

  return <>{children}</>;
}

/** Only allows superAdmin users (not staff). */
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const dbUser = useCurrentUser();

  if (dbUser === undefined) return null;
  if (!dbUser?.isSuperAdmin) return <Navigate to="/admin" replace />;

  return <>{children}</>;
}

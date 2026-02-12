import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

export function AdminRoute({ children }: { children: ReactNode }) {
  const dbUser = useCurrentUser();

  // Still loading
  if (dbUser === undefined) return null;

  // Not a super admin
  if (!dbUser?.isSuperAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}

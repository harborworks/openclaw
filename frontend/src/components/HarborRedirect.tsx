import { Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { useAuth } from "../auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orgsApi = (api as any).orgs;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const usersApi = (api as any).users;

/**
 * Redirects to the user's last visited org/harbor, or first available.
 */
export function HarborRedirect() {
  const { user } = useAuth();
  const cognitoSub = user?.userId;

  const dbUser = useQuery(
    usersApi.getByCognitoSub,
    cognitoSub ? { cognitoSub } : "skip",
  );

  const orgs = useQuery(
    orgsApi.listWithHarbors,
    cognitoSub ? { cognitoSub } : "skip",
  );

  if (orgs === undefined || dbUser === undefined) return null; // loading

  // Try last visited
  if (dbUser?.lastOrgSlug && dbUser?.lastHarborSlug) {
    const org = (orgs ?? []).find((o: { slug: string }) => o.slug === dbUser.lastOrgSlug);
    const harbor = org?.harbors?.find((h: { slug: string }) => h.slug === dbUser.lastHarborSlug);
    if (org && harbor) {
      return <Navigate to={`/${org.slug}/${harbor.slug}`} replace />;
    }
  }

  // Fallback to first org/harbor
  for (const org of orgs ?? []) {
    if (org.harbors.length > 0) {
      return <Navigate to={`/${org.slug}/${org.harbors[0].slug}`} replace />;
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 56px)" }}>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem" }}>
        No harbors found. Contact your admin to get started.
      </p>
    </div>
  );
}

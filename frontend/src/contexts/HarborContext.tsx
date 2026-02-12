import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/api";
import { useAuth } from "../auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orgsApi = (api as any).orgs;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const usersApi = (api as any).users;

interface HarborContextValue {
  orgSlug: string;
  harborSlug: string;
  orgId: string;
  harborId: string;
  orgName: string;
  harborName: string;
  publicKey: string | undefined;
  role: string;
  /** Base path for routes: /:orgSlug/:harborSlug */
  basePath: string;
}

const HarborContext = createContext<HarborContextValue | null>(null);

export function useHarborContext(): HarborContextValue {
  const ctx = useContext(HarborContext);
  if (!ctx) throw new Error("useHarborContext must be used within HarborProvider");
  return ctx;
}

/** Returns harbor context or null if outside HarborProvider. */
export function useOptionalHarborContext(): HarborContextValue | null {
  return useContext(HarborContext);
}

/**
 * Resolves org/harbor from URL params and provides context.
 * Renders children when resolved, redirects to / if invalid.
 */
export function HarborProvider({ children }: { children: ReactNode }) {
  const { orgSlug, harborSlug } = useParams<{ orgSlug: string; harborSlug: string }>();
  const { user } = useAuth();
  const cognitoSub = user?.userId;

  const setLastHarbor = useMutation(usersApi.setLastHarbor);

  const resolved = useQuery(
    orgsApi.resolveBySlug,
    cognitoSub && orgSlug && harborSlug
      ? { cognitoSub, orgSlug, harborSlug }
      : "skip",
  );

  // Save last visited org/harbor
  const savedRef = useRef("");
  useEffect(() => {
    if (!resolved || !cognitoSub) return;
    const key = `${resolved.org.slug}/${resolved.harbor.slug}`;
    if (savedRef.current !== key) {
      savedRef.current = key;
      setLastHarbor({ cognitoSub, orgSlug: resolved.org.slug, harborSlug: resolved.harbor.slug });
    }
  }, [resolved, cognitoSub, setLastHarbor]);

  // Still loading
  if (resolved === undefined) return null;

  // Invalid slugs or no access
  if (resolved === null) return <Navigate to="/" replace />;

  const value: HarborContextValue = {
    orgSlug: resolved.org.slug,
    harborSlug: resolved.harbor.slug,
    orgId: resolved.org._id,
    harborId: resolved.harbor._id,
    orgName: resolved.org.name,
    harborName: resolved.harbor.name,
    publicKey: resolved.harbor.publicKey,
    role: resolved.role,
    basePath: `/${resolved.org.slug}/${resolved.harbor.slug}`,
  };

  return (
    <HarborContext.Provider value={value}>
      {children}
    </HarborContext.Provider>
  );
}

import { useAuth } from "../auth";

/**
 * Returns the cognitoSub for use in admin queries/mutations.
 * Returns undefined if not authenticated.
 */
export function useAdminAuth() {
  const { user } = useAuth();
  return user?.userId;
}

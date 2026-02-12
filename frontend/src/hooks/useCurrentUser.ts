import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { useAuth } from "../auth";

export function useCurrentUser() {
  const { user } = useAuth();
  const dbUser = useQuery(
    api.users.getByCognitoSub,
    user ? { cognitoSub: user.userId } : "skip"
  );
  return dbUser;
}

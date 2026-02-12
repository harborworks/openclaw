import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { useAuth } from "../auth";

export function useHarbors() {
  const { user } = useAuth();
  const cognitoSub = user?.userId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const harborsApi = (api as any).harbors;
  const harbors = useQuery(
    harborsApi.listForUser,
    cognitoSub ? { cognitoSub } : "skip",
  );
  return harbors;
}

import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Verify the caller is a superAdmin. Throws if not.
 * Pass the cognitoSub from the client.
 */
export async function requireSuperAdmin(
  ctx: QueryCtx | MutationCtx,
  cognitoSub: string
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_cognito_sub", (q) => q.eq("cognitoSub", cognitoSub))
    .unique();
  if (!user || !user.isSuperAdmin) {
    throw new Error("Forbidden: superAdmin required");
  }
  return user;
}

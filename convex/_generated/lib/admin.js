/**
 * Verify the caller is a superAdmin. Throws if not.
 * Pass the cognitoSub from the client.
 */
export async function requireSuperAdmin(ctx, cognitoSub) {
    const user = await ctx.db
        .query("users")
        .withIndex("by_cognito_sub", (q) => q.eq("cognitoSub", cognitoSub))
        .unique();
    if (!user || !user.isSuperAdmin) {
        throw new Error("Forbidden: superAdmin required");
    }
    return user;
}

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
/**
 * Verify the caller is a superAdmin or staff. Throws if not.
 */
export async function requireAdmin(ctx, cognitoSub) {
    const user = await ctx.db
        .query("users")
        .withIndex("by_cognito_sub", (q) => q.eq("cognitoSub", cognitoSub))
        .unique();
    if (!user || (!user.isSuperAdmin && !user.isStaff)) {
        throw new Error("Forbidden: admin access required");
    }
    return user;
}

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
export const getByCognitoSub = query({
    args: { cognitoSub: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_cognito_sub", (q) => q.eq("cognitoSub", args.cognitoSub))
            .unique();
    },
});
/** Update the last org/harbor the user visited. */
export const setLastHarbor = mutation({
    args: {
        cognitoSub: v.string(),
        orgSlug: v.string(),
        harborSlug: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_cognito_sub", (q) => q.eq("cognitoSub", args.cognitoSub))
            .unique();
        if (!user)
            return;
        await ctx.db.patch(user._id, {
            lastOrgSlug: args.orgSlug,
            lastHarborSlug: args.harborSlug,
        });
    },
});

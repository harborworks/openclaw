import { query } from "./_generated/server";
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

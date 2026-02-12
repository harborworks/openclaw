import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    email: v.string(),
    cognitoSub: v.string(),
    isSuperAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_cognito_sub", (q) => q.eq("cognitoSub", args.cognitoSub))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("users", args);
  },
});

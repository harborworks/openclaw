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

/** Create a test task assigned to an agent. Callable from dashboard. */
export const createTestTask = mutation({
  args: {
    assigneeId: v.id("agents"),
    harborId: v.id("harbors"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      title: args.title ?? "Test task: say hello",
      description:
        args.description ??
        "This is a test task. Post a message on this task saying 'Hello from [your name]!' to confirm the task API is working.",
      status: "to_do",
      assigneeId: args.assigneeId,
      reviewerIds: [],
      priority: "medium",
      harborId: args.harborId,
    });
  },
});

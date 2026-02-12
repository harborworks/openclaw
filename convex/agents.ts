import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { harborId: v.id("harbors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
      .collect();
  },
});

export const create = mutation({
  args: {
    harborId: v.id("harbors"),
    name: v.string(),
    sessionKey: v.string(),
    role: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
      .collect();
    if (existing.some((a) => a.sessionKey === args.sessionKey)) {
      throw new Error("An agent with this session key already exists in this harbor");
    }

    return await ctx.db.insert("agents", {
      name: args.name,
      sessionKey: args.sessionKey,
      role: args.role,
      model: args.model,
      status: "idle",
      harborId: args.harborId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("agents"),
    name: v.optional(v.string()),
    sessionKey: v.optional(v.string()),
    role: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");

    if (args.sessionKey && args.sessionKey !== agent.sessionKey) {
      const siblings = await ctx.db
        .query("agents")
        .withIndex("by_harbor", (q) => q.eq("harborId", agent.harborId))
        .collect();
      if (siblings.some((a) => a._id !== args.id && a.sessionKey === args.sessionKey)) {
        throw new Error("An agent with this session key already exists in this harbor");
      }
    }

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.sessionKey !== undefined) patch.sessionKey = args.sessionKey;
    if (args.role !== undefined) patch.role = args.role;
    if (args.model !== undefined) patch.model = args.model;
    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

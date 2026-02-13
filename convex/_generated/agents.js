import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
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
        role: v.optional(v.string()),
        model: v.optional(v.string()),
        roleDescription: v.optional(v.string()),
        additionalInstructions: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const agent = await ctx.db.get(args.id);
        if (!agent)
            throw new Error("Agent not found");
        const patch = {};
        if (args.name !== undefined)
            patch.name = args.name;
        if (args.role !== undefined)
            patch.role = args.role;
        if (args.model !== undefined)
            patch.model = args.model;
        if (args.roleDescription !== undefined)
            patch.roleDescription = args.roleDescription;
        if (args.additionalInstructions !== undefined)
            patch.additionalInstructions = args.additionalInstructions;
        await ctx.db.patch(args.id, patch);
    },
});
export const remove = mutation({
    args: { id: v.id("agents") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
// ── Internal (for HTTP API / daemon) ─────────────────────────────────
/** Internal: List all agents for a harbor (used by daemon sync). */
export const listInternal = internalQuery({
    args: { harborId: v.id("harbors") },
    handler: async (ctx, args) => {
        const agents = await ctx.db
            .query("agents")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .collect();
        return agents.map((a) => ({
            _id: a._id,
            name: a.name,
            sessionKey: a.sessionKey,
            role: a.role,
            model: a.model,
            status: a.status,
            roleDescription: a.roleDescription,
            additionalInstructions: a.additionalInstructions,
        }));
    },
});

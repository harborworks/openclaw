import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
export const list = query({
    args: { harborId: v.id("harbors") },
    handler: async (ctx, args) => {
        const secrets = await ctx.db
            .query("secrets")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .collect();
        return secrets.map((s) => ({
            _id: s._id,
            _creationTime: s._creationTime,
            name: s.name,
            category: s.category,
            description: s.description,
            isSet: s.isSet,
            hasPending: !!s.pendingValue,
            updatedAt: s.updatedAt,
            harborId: s.harborId,
        }));
    },
});
export const set = mutation({
    args: {
        harborId: v.id("harbors"),
        name: v.string(),
        value: v.string(),
        category: v.optional(v.union(v.literal("required"), v.literal("custom"))),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("secrets")
            .withIndex("by_harbor_name", (q) => q.eq("harborId", args.harborId).eq("name", args.name))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                pendingValue: args.value,
                updatedAt: Date.now(),
            });
            return existing._id;
        }
        return await ctx.db.insert("secrets", {
            name: args.name,
            category: args.category ?? "custom",
            description: args.description,
            pendingValue: args.value,
            isSet: false,
            updatedAt: Date.now(),
            harborId: args.harborId,
        });
    },
});
export const remove = mutation({
    args: { id: v.id("secrets") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
/** Internal: Daemon reads pending secrets via HTTP API. */
export const listPendingInternal = internalQuery({
    args: { harborId: v.id("harbors") },
    handler: async (ctx, args) => {
        const all = await ctx.db
            .query("secrets")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .collect();
        return all
            .filter((s) => s.pendingValue)
            .map((s) => ({
            _id: s._id,
            name: s.name,
            pendingValue: s.pendingValue,
        }));
    },
});
/** Internal: Daemon marks a secret consumed via HTTP API. */
export const markConsumedInternal = internalMutation({
    args: { id: v.id("secrets") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            pendingValue: undefined,
            isSet: true,
        });
    },
});

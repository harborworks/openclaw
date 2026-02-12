import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireSuperAdmin } from "../lib/admin";
export const list = query({
    args: {
        cognitoSub: v.string(),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        return await ctx.db
            .query("orgs")
            .order("desc")
            .paginate(args.paginationOpts);
    },
});
export const getById = query({
    args: { cognitoSub: v.string(), id: v.id("orgs") },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        return await ctx.db.get(args.id);
    },
});
export const create = mutation({
    args: {
        cognitoSub: v.string(),
        name: v.string(),
        slug: v.string(),
        plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
    },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        const existing = await ctx.db
            .query("orgs")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .unique();
        if (existing)
            throw new Error("Slug already taken");
        return await ctx.db.insert("orgs", {
            name: args.name,
            slug: args.slug,
            plan: args.plan,
        });
    },
});
export const update = mutation({
    args: {
        cognitoSub: v.string(),
        id: v.id("orgs"),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        plan: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise"))),
    },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        const { cognitoSub, id, ...fields } = args;
        const patch = {};
        if (fields.name !== undefined)
            patch.name = fields.name;
        if (fields.slug !== undefined) {
            const slug = fields.slug;
            const existing = await ctx.db
                .query("orgs")
                .withIndex("by_slug", (q) => q.eq("slug", slug))
                .unique();
            if (existing && existing._id !== id)
                throw new Error("Slug already taken");
            patch.slug = slug;
        }
        if (fields.plan !== undefined)
            patch.plan = fields.plan;
        await ctx.db.patch(id, patch);
    },
});
export const remove = mutation({
    args: { cognitoSub: v.string(), id: v.id("orgs") },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        await ctx.db.delete(args.id);
    },
});

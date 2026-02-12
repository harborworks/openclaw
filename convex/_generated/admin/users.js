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
            .query("users")
            .order("desc")
            .paginate(args.paginationOpts);
    },
});
export const getById = query({
    args: { cognitoSub: v.string(), id: v.id("users") },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        return await ctx.db.get(args.id);
    },
});
export const create = mutation({
    args: {
        cognitoSub: v.string(),
        name: v.string(),
        email: v.string(),
        userCognitoSub: v.string(),
        isSuperAdmin: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        return await ctx.db.insert("users", {
            name: args.name,
            email: args.email,
            cognitoSub: args.userCognitoSub,
            isSuperAdmin: args.isSuperAdmin,
        });
    },
});
export const update = mutation({
    args: {
        cognitoSub: v.string(),
        id: v.id("users"),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        isSuperAdmin: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        const { cognitoSub, id, ...fields } = args;
        const patch = {};
        if (fields.name !== undefined)
            patch.name = fields.name;
        if (fields.email !== undefined)
            patch.email = fields.email;
        if (fields.isSuperAdmin !== undefined)
            patch.isSuperAdmin = fields.isSuperAdmin;
        await ctx.db.patch(id, patch);
    },
});
export const remove = mutation({
    args: { cognitoSub: v.string(), id: v.id("users") },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        await ctx.db.delete(args.id);
    },
});

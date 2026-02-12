import { query, mutation, internalMutation, internalQuery } from "../_generated/server";
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
// Internal helpers used by the invite action
export const verifySuperAdmin = internalQuery({
    args: { cognitoSub: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_cognito_sub", (q) => q.eq("cognitoSub", args.cognitoSub))
            .unique();
        return user?.isSuperAdmin === true;
    },
});
export const getByIdInternal = internalQuery({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
export const insertUser = internalMutation({
    args: {
        email: v.string(),
        cognitoSub: v.string(),
        isSuperAdmin: v.boolean(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("users", {
            email: args.email,
            cognitoSub: args.cognitoSub,
            isSuperAdmin: args.isSuperAdmin || undefined,
        });
    },
});
export const update = mutation({
    args: {
        cognitoSub: v.string(),
        id: v.id("users"),
        email: v.optional(v.string()),
        isSuperAdmin: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const caller = await requireSuperAdmin(ctx, args.cognitoSub);
        const target = await ctx.db.get(args.id);
        if (!target)
            throw new Error("User not found");
        // Prevent removing own superAdmin
        if (target._id === caller._id && args.isSuperAdmin === false) {
            throw new Error("Cannot remove your own superAdmin status");
        }
        const patch = {};
        if (args.email !== undefined)
            patch.email = args.email;
        if (args.isSuperAdmin !== undefined)
            patch.isSuperAdmin = args.isSuperAdmin;
        await ctx.db.patch(args.id, patch);
    },
});
export const deleteUser = internalMutation({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

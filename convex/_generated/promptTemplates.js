import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { requireSuperAdmin } from "./lib/admin";
/** List all prompt templates (super admin). */
export const list = query({
    args: { cognitoSub: v.string() },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        return await ctx.db.query("promptTemplates").collect();
    },
});
/** Get a single template by fileKey (super admin). */
export const getByFileKey = query({
    args: { cognitoSub: v.string(), fileKey: v.string() },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        return await ctx.db
            .query("promptTemplates")
            .withIndex("by_file", (q) => q.eq("fileKey", args.fileKey))
            .unique();
    },
});
/** Update a template (super admin). Bumps version. */
export const update = mutation({
    args: {
        cognitoSub: v.string(),
        fileKey: v.string(),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        const existing = await ctx.db
            .query("promptTemplates")
            .withIndex("by_file", (q) => q.eq("fileKey", args.fileKey))
            .unique();
        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content,
                version: existing.version + 1,
                updatedBy: args.cognitoSub,
                updatedAt: Date.now(),
            });
            return existing._id;
        }
        else {
            return await ctx.db.insert("promptTemplates", {
                fileKey: args.fileKey,
                content: args.content,
                version: 1,
                updatedBy: args.cognitoSub,
                updatedAt: Date.now(),
            });
        }
    },
});
// ── Internal (for daemon HTTP API) ───────────────────────────────────
/** Internal: Get all templates for daemon sync. */
export const listInternal = internalQuery({
    args: {},
    handler: async (ctx) => {
        const templates = await ctx.db.query("promptTemplates").collect();
        return templates.map((t) => ({
            fileKey: t.fileKey,
            content: t.content,
            version: t.version,
        }));
    },
});

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
        const result = await ctx.db
            .query("harbors")
            .order("desc")
            .paginate(args.paginationOpts);
        const enriched = await Promise.all(result.page.map(async (h) => {
            const org = await ctx.db.get(h.orgId);
            return { ...h, orgName: org?.name ?? "Unknown" };
        }));
        return { ...result, page: enriched };
    },
});
export const create = mutation({
    args: {
        cognitoSub: v.string(),
        name: v.string(),
        slug: v.string(),
        orgId: v.id("orgs"),
    },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        const existing = await ctx.db
            .query("harbors")
            .withIndex("by_org_slug", (q) => q.eq("orgId", args.orgId).eq("slug", args.slug))
            .unique();
        if (existing)
            throw new Error("Slug already taken for this org");
        return await ctx.db.insert("harbors", {
            name: args.name,
            slug: args.slug,
            orgId: args.orgId,
        });
    },
});
export const update = mutation({
    args: {
        cognitoSub: v.string(),
        id: v.id("harbors"),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        orgId: v.optional(v.id("orgs")),
    },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        const harbor = await ctx.db.get(args.id);
        if (!harbor)
            throw new Error("Harbor not found");
        const patch = {};
        if (args.name !== undefined)
            patch.name = args.name;
        if (args.orgId !== undefined)
            patch.orgId = args.orgId;
        if (args.slug !== undefined) {
            const orgId = args.orgId ?? harbor.orgId;
            const slug = args.slug;
            const existing = await ctx.db
                .query("harbors")
                .withIndex("by_org_slug", (q) => q.eq("orgId", orgId).eq("slug", slug))
                .unique();
            if (existing && existing._id !== args.id)
                throw new Error("Slug already taken for this org");
            patch.slug = slug;
        }
        await ctx.db.patch(args.id, patch);
    },
});
export const remove = mutation({
    args: { cognitoSub: v.string(), id: v.id("harbors") },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        await ctx.db.delete(args.id);
    },
});

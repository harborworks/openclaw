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
            .query("memberships")
            .order("desc")
            .paginate(args.paginationOpts);
        const enriched = await Promise.all(result.page.map(async (m) => {
            const user = await ctx.db.get(m.userId);
            const org = await ctx.db.get(m.orgId);
            return {
                ...m,
                userName: user?.name ?? "Unknown",
                userEmail: user?.email ?? "",
                orgName: org?.name ?? "Unknown",
            };
        }));
        return { ...result, page: enriched };
    },
});
export const create = mutation({
    args: {
        cognitoSub: v.string(),
        userId: v.id("users"),
        orgId: v.id("orgs"),
        role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        const existing = await ctx.db
            .query("memberships")
            .withIndex("by_user_org", (q) => q.eq("userId", args.userId).eq("orgId", args.orgId))
            .unique();
        if (existing)
            throw new Error("Membership already exists");
        return await ctx.db.insert("memberships", {
            userId: args.userId,
            orgId: args.orgId,
            role: args.role,
        });
    },
});
export const update = mutation({
    args: {
        cognitoSub: v.string(),
        id: v.id("memberships"),
        role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        await ctx.db.patch(args.id, { role: args.role });
    },
});
export const remove = mutation({
    args: { cognitoSub: v.string(), id: v.id("memberships") },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        await ctx.db.delete(args.id);
    },
});

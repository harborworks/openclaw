import { v } from "convex/values";
import { query } from "./_generated/server";
/** List orgs (with their harbors) that the current user belongs to. */
export const listWithHarbors = query({
    args: { cognitoSub: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_cognito_sub", (q) => q.eq("cognitoSub", args.cognitoSub))
            .unique();
        if (!user)
            return [];
        const memberships = await ctx.db
            .query("memberships")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();
        const results = [];
        for (const m of memberships) {
            const org = await ctx.db.get(m.orgId);
            if (!org)
                continue;
            const harbors = await ctx.db
                .query("harbors")
                .withIndex("by_org", (q) => q.eq("orgId", org._id))
                .collect();
            results.push({
                _id: org._id,
                name: org.name,
                slug: org.slug,
                role: m.role,
                harbors: harbors.map((h) => ({
                    _id: h._id,
                    name: h.name,
                    slug: h.slug,
                    publicKey: h.publicKey,
                })),
            });
        }
        return results;
    },
});
/** Resolve a single org + harbor by their slugs. Returns null if not found or user lacks access. */
export const resolveBySlug = query({
    args: {
        cognitoSub: v.string(),
        orgSlug: v.string(),
        harborSlug: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_cognito_sub", (q) => q.eq("cognitoSub", args.cognitoSub))
            .unique();
        if (!user)
            return null;
        const org = await ctx.db
            .query("orgs")
            .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
            .unique();
        if (!org)
            return null;
        // Check membership
        const membership = await ctx.db
            .query("memberships")
            .withIndex("by_user_org", (q) => q.eq("userId", user._id).eq("orgId", org._id))
            .unique();
        if (!membership)
            return null;
        const harbor = await ctx.db
            .query("harbors")
            .withIndex("by_org_slug", (q) => q.eq("orgId", org._id).eq("slug", args.harborSlug))
            .unique();
        if (!harbor)
            return null;
        return {
            org: { _id: org._id, name: org.name, slug: org.slug },
            harbor: {
                _id: harbor._id,
                name: harbor.name,
                slug: harbor.slug,
                publicKey: harbor.publicKey,
            },
            role: membership.role,
        };
    },
});

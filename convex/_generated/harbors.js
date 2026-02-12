import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
/** List harbors the current user has access to (via org membership). */
export const listForUser = query({
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
        const harbors = [];
        for (const m of memberships) {
            const orgHarbors = await ctx.db
                .query("harbors")
                .withIndex("by_org", (q) => q.eq("orgId", m.orgId))
                .collect();
            harbors.push(...orgHarbors);
        }
        return harbors.map((h) => ({
            _id: h._id,
            name: h.name,
            slug: h.slug,
            orgId: h.orgId,
            publicKey: h.publicKey,
        }));
    },
});
/** Set the public key on a harbor (used by daemon on startup). */
export const setPublicKey = mutation({
    args: {
        id: v.id("harbors"),
        publicKey: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { publicKey: args.publicKey });
    },
});
// ── Internal (for HTTP API) ──────────────────────────────────────────
/** Internal: Get harbor by ID (used by HTTP auth). */
export const getById = internalQuery({
    args: { id: v.id("harbors") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
/** Internal: Set public key via HTTP API. */
export const setPublicKeyInternal = internalMutation({
    args: {
        id: v.id("harbors"),
        publicKey: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { publicKey: args.publicKey });
    },
});
/** Generate API key for a harbor. Returns plaintext key (shown once). Stores SHA-256 hash. */
export const generateApiKey = mutation({
    args: { id: v.id("harbors") },
    handler: async (ctx, args) => {
        const harbor = await ctx.db.get(args.id);
        if (!harbor)
            throw new Error("Harbor not found");
        // Generate a random 32-byte key as hex
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        const apiKey = Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        // Hash it with SHA-256
        const encoded = new TextEncoder().encode(apiKey);
        const digest = await crypto.subtle.digest("SHA-256", encoded);
        const hash = Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        await ctx.db.patch(args.id, { apiKeyHash: hash });
        return apiKey;
    },
});

import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
/**
 * Pairing — simple code-based approval flow.
 *
 * 1. User DMs the bot → gets a pairing code
 * 2. Admin pastes the code into the Harbor UI
 * 3. Daemon picks up pending approvals and writes to gateway allowFrom files
 * 4. Daemon reports back the result (approved sender info)
 */
/** List pairing entries for a harbor (frontend). */
export const list = query({
    args: { harborId: v.id("harbors") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("pairingRequests")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .collect();
    },
});
/** Submit a pairing code for approval (frontend). */
export const submitCode = mutation({
    args: {
        harborId: v.id("harbors"),
        channel: v.string(),
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const code = args.code.trim().toUpperCase();
        if (!code)
            throw new Error("Code is required");
        // Check for duplicate pending codes
        const existing = await ctx.db
            .query("pairingRequests")
            .withIndex("by_harbor_channel", (q) => q.eq("harborId", args.harborId).eq("channel", args.channel))
            .collect();
        if (existing.some((r) => r.code === code && r.status === "pending")) {
            throw new Error("This code is already pending approval");
        }
        return await ctx.db.insert("pairingRequests", {
            channel: args.channel,
            senderId: "", // filled by daemon after approval
            code,
            status: "pending",
            createdAt: new Date().toISOString(),
            harborId: args.harborId,
        });
    },
});
/** Remove a pairing entry (frontend). */
export const remove = mutation({
    args: { id: v.id("pairingRequests") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
// ── Internal (daemon) ────────────────────────────────────────────────
/** Get pending codes for the daemon to approve against gateway files. */
export const listPendingInternal = internalQuery({
    args: {
        harborId: v.id("harbors"),
        channel: v.string(),
    },
    handler: async (ctx, args) => {
        const all = await ctx.db
            .query("pairingRequests")
            .withIndex("by_harbor_channel", (q) => q.eq("harborId", args.harborId).eq("channel", args.channel))
            .collect();
        return all.filter((r) => r.status === "pending");
    },
});
/** Daemon marks a code as approved (with resolved sender info). */
export const markApprovedInternal = internalMutation({
    args: {
        id: v.id("pairingRequests"),
        senderId: v.string(),
        senderMeta: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            status: "approved",
            senderId: args.senderId,
            senderMeta: args.senderMeta,
            resolvedAt: Date.now(),
        });
    },
});
/** Get all approved sender IDs for a channel (daemon writes allowFrom). */
export const listApprovedSendersInternal = internalQuery({
    args: {
        harborId: v.id("harbors"),
        channel: v.string(),
    },
    handler: async (ctx, args) => {
        const all = await ctx.db
            .query("pairingRequests")
            .withIndex("by_harbor_channel", (q) => q.eq("harborId", args.harborId).eq("channel", args.channel))
            .collect();
        return all
            .filter((r) => r.status === "approved" && r.senderId)
            .map((r) => r.senderId);
    },
});
/** Daemon marks a code as failed (not found or expired). */
export const markFailedInternal = internalMutation({
    args: {
        id: v.id("pairingRequests"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            status: "rejected",
            resolvedAt: Date.now(),
        });
    },
});

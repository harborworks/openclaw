import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
/** List pairing requests for a harbor (frontend). */
export const list = query({
    args: {
        harborId: v.id("harbors"),
        channel: v.optional(v.string()),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let requests = await ctx.db
            .query("pairingRequests")
            .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
            .collect();
        if (args.channel) {
            requests = requests.filter((r) => r.channel === args.channel);
        }
        if (args.status) {
            requests = requests.filter((r) => r.status === args.status);
        }
        return requests;
    },
});
/** Approve a pairing request (frontend action). */
export const approve = mutation({
    args: { id: v.id("pairingRequests") },
    handler: async (ctx, args) => {
        const req = await ctx.db.get(args.id);
        if (!req)
            throw new Error("Pairing request not found");
        if (req.status !== "pending")
            throw new Error("Request is not pending");
        await ctx.db.patch(args.id, {
            status: "approved",
            resolvedAt: Date.now(),
        });
    },
});
/** Reject a pairing request (frontend action). */
export const reject = mutation({
    args: { id: v.id("pairingRequests") },
    handler: async (ctx, args) => {
        const req = await ctx.db.get(args.id);
        if (!req)
            throw new Error("Pairing request not found");
        if (req.status !== "pending")
            throw new Error("Request is not pending");
        await ctx.db.patch(args.id, {
            status: "rejected",
            resolvedAt: Date.now(),
        });
    },
});
// ── Internal (daemon sync) ───────────────────────────────────────────
/** Daemon pushes pending pairing requests from gateway files. */
export const syncFromDaemon = internalMutation({
    args: {
        harborId: v.id("harbors"),
        channel: v.string(),
        requests: v.array(v.object({
            senderId: v.string(),
            code: v.string(),
            senderMeta: v.optional(v.any()),
            createdAt: v.string(),
            accountId: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        // Get existing pending requests for this channel
        const existing = await ctx.db
            .query("pairingRequests")
            .withIndex("by_harbor_channel", (q) => q.eq("harborId", args.harborId).eq("channel", args.channel))
            .collect();
        const existingPending = existing.filter((r) => r.status === "pending");
        const existingCodes = new Set(existingPending.map((r) => r.code));
        const incomingCodes = new Set(args.requests.map((r) => r.code));
        // Add new requests
        for (const req of args.requests) {
            if (!existingCodes.has(req.code)) {
                await ctx.db.insert("pairingRequests", {
                    channel: args.channel,
                    senderId: req.senderId,
                    code: req.code,
                    senderMeta: req.senderMeta,
                    status: "pending",
                    createdAt: req.createdAt,
                    harborId: args.harborId,
                    accountId: req.accountId,
                });
            }
        }
        // Remove stale pending requests (expired in gateway)
        for (const req of existingPending) {
            if (!incomingCodes.has(req.code)) {
                await ctx.db.delete(req._id);
            }
        }
    },
});
/** Daemon reads approved requests to write to allowFrom files. */
export const listApprovedInternal = internalQuery({
    args: {
        harborId: v.id("harbors"),
        channel: v.string(),
    },
    handler: async (ctx, args) => {
        const requests = await ctx.db
            .query("pairingRequests")
            .withIndex("by_harbor_channel", (q) => q.eq("harborId", args.harborId).eq("channel", args.channel))
            .collect();
        return requests.filter((r) => r.status === "approved");
    },
});
/** Daemon marks an approved request as fully consumed (written to allowFrom). */
export const markConsumedInternal = internalMutation({
    args: { id: v.id("pairingRequests") },
    handler: async (ctx, args) => {
        // Keep the record but could delete if we want cleanup
        // For now just leave it as approved — it won't be re-synced
    },
});

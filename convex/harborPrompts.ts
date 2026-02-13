import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";

const sectionsValidator = v.object({
  principles: v.optional(v.string()),
  rules: v.optional(v.string()),
  tone: v.optional(v.string()),
  userInfo: v.optional(v.string()),
  toolNotes: v.optional(v.string()),
});

/** Get harbor prompt sections. */
export const get = query({
  args: { harborId: v.id("harbors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("harborPrompts")
      .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
      .unique();
  },
});

/** Update harbor prompt sections (upsert). */
export const update = mutation({
  args: {
    harborId: v.id("harbors"),
    sections: sectionsValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("harborPrompts")
      .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sections: args.sections,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("harborPrompts", {
        harborId: args.harborId,
        sections: args.sections,
        updatedAt: Date.now(),
      });
    }
  },
});

// ── Internal (for daemon HTTP API) ───────────────────────────────────

/** Internal: Get harbor prompts for daemon sync. */
export const getInternal = internalQuery({
  args: { harborId: v.id("harbors") },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("harborPrompts")
      .withIndex("by_harbor", (q) => q.eq("harborId", args.harborId))
      .unique();
    return doc
      ? { sections: doc.sections, updatedAt: doc.updatedAt }
      : { sections: {}, updatedAt: 0 };
  },
});

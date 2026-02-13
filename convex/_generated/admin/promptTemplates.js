import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireSuperAdmin } from "../lib/admin";
import { DEFAULT_TEMPLATES, MANAGED_FILES } from "../lib/defaultTemplates";
/** Seed default templates (creates any that don't exist yet). */
export const seed = mutation({
    args: { cognitoSub: v.string() },
    handler: async (ctx, args) => {
        await requireSuperAdmin(ctx, args.cognitoSub);
        let created = 0;
        for (const fileKey of MANAGED_FILES) {
            const existing = await ctx.db
                .query("promptTemplates")
                .withIndex("by_file", (q) => q.eq("fileKey", fileKey))
                .unique();
            if (!existing) {
                const content = DEFAULT_TEMPLATES[fileKey];
                if (!content)
                    continue;
                await ctx.db.insert("promptTemplates", {
                    fileKey,
                    content,
                    version: 1,
                    updatedBy: args.cognitoSub,
                    updatedAt: Date.now(),
                });
                created++;
            }
        }
        return { created, total: MANAGED_FILES.length };
    },
});

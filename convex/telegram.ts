import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Validate a Telegram bot token by calling the Telegram Bot API getMe endpoint.
 * Returns the bot info if valid, or an error message if not.
 */
export const validateToken = action({
  args: { botToken: v.string() },
  handler: async (_ctx, args) => {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${args.botToken}/getMe`,
        { signal: AbortSignal.timeout(10_000) },
      );
      const data = await res.json() as { ok: boolean; result?: { id: number; username: string; first_name: string }; description?: string };
      if (data.ok && data.result) {
        return {
          valid: true,
          bot: {
            id: data.result.id,
            username: data.result.username,
            firstName: data.result.first_name,
          },
        };
      }
      return { valid: false, error: data.description || "Invalid token" };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  },
});

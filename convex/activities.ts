import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("activities")
      .order("desc")
      .take(args.limit ?? 20);
  },
});

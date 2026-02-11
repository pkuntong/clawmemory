import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { limit: v.optional(v.number()), workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, args) => {
    if (args.workspaceId) {
      return ctx.db
        .query("activities")
        .withIndex("by_workspace_created", (q) =>
          q.eq("workspaceId", args.workspaceId!)
        )
        .order("desc")
        .take(args.limit ?? 20);
    }
    return ctx.db
      .query("activities")
      .order("desc")
      .take(args.limit ?? 20);
  },
});

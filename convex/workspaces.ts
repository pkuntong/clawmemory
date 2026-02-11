import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getDefaultWorkspace, getOrCreateDefaultWorkspace } from "./helpers";

export const getDefault = query({
  handler: async (ctx) => {
    const workspace = await getDefaultWorkspace(ctx);
    if (!workspace) return null;
    return {
      _id: workspace._id,
      name: workspace.name,
      key: workspace.key,
      secret: workspace.secret,
    };
  },
});

export const ensureDefault = mutation({
  handler: async (ctx) => {
    const workspace = await getOrCreateDefaultWorkspace(ctx);
    return {
      _id: workspace._id,
      name: workspace.name,
      key: workspace.key,
      secret: workspace.secret,
    };
  },
});

export const getByCredentials = query({
  args: {
    key: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_key_secret", (q) =>
        q.eq("key", args.key).eq("secret", args.secret)
      )
      .first();
    return workspace ?? null;
  },
});

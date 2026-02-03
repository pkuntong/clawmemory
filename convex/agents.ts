import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    return ctx.db.query("agents").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const register = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name: args.name,
      status: "active",
      description: args.description,
      memoriesCount: 0,
      lastActive: now,
      createdAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      agentId,
      agentName: args.name,
      action: "joined",
      target: "the collective consciousness",
      createdAt: now,
    });

    return agentId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("agents"),
    status: v.union(
      v.literal("active"),
      v.literal("syncing"),
      v.literal("idle")
    ),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");

    await ctx.db.patch(args.id, {
      status: args.status,
      lastActive: Date.now(),
    });

    await ctx.db.insert("activities", {
      agentId: args.id,
      agentName: agent.name,
      action: args.status === "active" ? "came online" : args.status === "syncing" ? "started syncing" : "went idle",
      target: "",
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");

    // Log before deletion
    await ctx.db.insert("activities", {
      agentName: agent.name,
      action: "disconnected from",
      target: "the collective consciousness",
      createdAt: Date.now(),
    });

    await ctx.db.delete(args.id);
  },
});

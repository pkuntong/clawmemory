import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  generateKey,
  getOrCreateDefaultWorkspace,
  getOrCreateStats,
} from "./helpers";

export const list = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, args) => {
    if (args.workspaceId) {
      return ctx.db
        .query("agents")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .order("desc")
        .collect();
    }
    return ctx.db.query("agents").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const getByApiKey = query({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("agents")
      .withIndex("by_api_key", (q) => q.eq("apiKey", args.apiKey))
      .first();
  },
});

export const register = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Input validation
    if (args.name.trim().length === 0) {
      throw new Error("Agent name cannot be empty");
    }
    if (args.name.length > 100) {
      throw new Error("Agent name too long (max 100 characters)");
    }
    if (args.description && args.description.length > 500) {
      throw new Error("Description too long (max 500 characters)");
    }

    // Check for duplicate names
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name.trim()))
      .first();
    if (existing) {
      throw new Error("An agent with this name already exists");
    }

    const now = Date.now();
    const workspace = await getOrCreateDefaultWorkspace(ctx);
    const apiKey = generateKey("cm");
    const agentId = await ctx.db.insert("agents", {
      workspaceId: workspace._id,
      name: args.name,
      status: "active",
      description: args.description,
      apiKey,
      memoriesCount: 0,
      lastActive: now,
      createdAt: now,
    });

    const stats = await getOrCreateStats(ctx, workspace._id);
    await ctx.db.patch(stats._id, {
      totalAgents: stats.totalAgents + 1,
      activeAgents: stats.activeAgents + 1,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      workspaceId: workspace._id,
      agentId,
      agentName: args.name,
      action: "joined",
      target: "the collective consciousness",
      createdAt: now,
    });

    return { id: agentId, apiKey };
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

    const wasActive = agent.status === "active";
    const willBeActive = args.status === "active";
    const now = Date.now();

    await ctx.db.patch(args.id, {
      status: args.status,
      lastActive: now,
    });

    const stats = await getOrCreateStats(ctx, agent.workspaceId);
    await ctx.db.patch(stats._id, {
      activeAgents:
        wasActive === willBeActive
          ? stats.activeAgents
          : Math.max(0, stats.activeAgents + (willBeActive ? 1 : -1)),
      updatedAt: now,
      lastActivityAt: now,
    });

    await ctx.db.insert("activities", {
      workspaceId: agent.workspaceId,
      agentId: args.id,
      agentName: agent.name,
      action: args.status === "active" ? "came online" : args.status === "syncing" ? "started syncing" : "went idle",
      target: "",
      createdAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");

    const now = Date.now();
    const stats = await getOrCreateStats(ctx, agent.workspaceId);
    await ctx.db.patch(stats._id, {
      totalAgents: Math.max(0, stats.totalAgents - 1),
      activeAgents:
        agent.status === "active"
          ? Math.max(0, stats.activeAgents - 1)
          : stats.activeAgents,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log before deletion
    await ctx.db.insert("activities", {
      workspaceId: agent.workspaceId,
      agentName: agent.name,
      action: "disconnected from",
      target: "the collective consciousness",
      createdAt: now,
    });

    await ctx.db.delete(args.id);
  },
});

export const rotateApiKey = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");

    const apiKey = generateKey("cm");
    await ctx.db.patch(args.id, {
      apiKey,
      lastActive: Date.now(),
    });

    return { apiKey };
  },
});

export const attachWorkspace = mutation({
  args: { id: v.id("agents"), workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");
    if (agent.workspaceId && agent.workspaceId !== args.workspaceId) {
      throw new Error("Agent belongs to a different workspace");
    }
    await ctx.db.patch(args.id, { workspaceId: args.workspaceId });
  },
});

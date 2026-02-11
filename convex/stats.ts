import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { dateKeyFromTimestamp, getDailyMemoryCount, getStatsDoc } from "./helpers";

export const get = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, args) => {
    const stats = await getStatsDoc(ctx, args.workspaceId);
    if (!stats) {
      return null;
    }

    const todayKey = dateKeyFromTimestamp(Date.now());
    const daily = await getDailyMemoryCount(ctx, todayKey, stats.workspaceId);
    const memoriesToday = daily?.count ?? 0;

    const avgConnections =
      stats.totalMemories > 0
        ? (stats.totalConnections * 2) / stats.totalMemories
        : 0;

    const lastSyncSeconds =
      stats.lastActivityAt != null
        ? Math.round((Date.now() - stats.lastActivityAt) / 1000)
        : null;

    return {
      totalMemories: stats.totalMemories,
      memoriesToday,
      totalAgents: stats.totalAgents,
      activeAgents: stats.activeAgents,
      uptimePercent:
        stats.totalAgents > 0
          ? Math.round((stats.activeAgents / stats.totalAgents) * 100)
          : 0,
      totalConnections: stats.totalConnections,
      avgConnectionsPerMemory: Math.round(avgConnections * 10) / 10,
      lastSyncSeconds,
    };
  },
});

export const ensure = mutation({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, args) => {
    const existing = await getStatsDoc(ctx, args.workspaceId);
    if (existing) {
      return { status: "ok" as const };
    }

    const now = Date.now();
    let allMemories = await ctx.db.query("memories").collect();
    let allAgents = await ctx.db.query("agents").collect();
    let allConnections = await ctx.db.query("connections").collect();
    let allActivities = await ctx.db.query("activities").collect();

    if (args.workspaceId) {
      allMemories = await ctx.db
        .query("memories")
        .withIndex("by_workspace_created", (q) =>
          q.eq("workspaceId", args.workspaceId!)
        )
        .collect();
      allAgents = await ctx.db
        .query("agents")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();
      allConnections = await ctx.db
        .query("connections")
        .withIndex("by_workspace_created", (q) =>
          q.eq("workspaceId", args.workspaceId!)
        )
        .collect();
      allActivities = await ctx.db
        .query("activities")
        .withIndex("by_workspace_created", (q) =>
          q.eq("workspaceId", args.workspaceId!)
        )
        .collect();
    }

    const activeAgents = allAgents.filter((a) => a.status === "active").length;

    const lastActivity = allActivities
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    const statsId = await ctx.db.insert("stats", {
      key: args.workspaceId ? `ws:${args.workspaceId}` : "global",
      workspaceId: args.workspaceId ?? undefined,
      totalMemories: allMemories.length,
      totalAgents: allAgents.length,
      activeAgents,
      totalConnections: allConnections.length,
      lastActivityAt: lastActivity?.createdAt ?? now,
      createdAt: now,
      updatedAt: now,
    });

    const todayKey = dateKeyFromTimestamp(now);
    const memoriesToday = allMemories.filter(
      (m) => dateKeyFromTimestamp(m.createdAt) === todayKey
    ).length;

    await ctx.db.insert("dailyMemoryCounts", {
      workspaceId: args.workspaceId ?? undefined,
      date: todayKey,
      count: memoriesToday,
      createdAt: now,
      updatedAt: now,
    });

    return { status: "initialized" as const, statsId };
  },
});

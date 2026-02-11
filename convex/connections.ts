import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getOrCreateStats } from "./helpers";

export const list = query({
  args: { limit: v.optional(v.number()), workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, args) => {
    let query = ctx.db.query("connections").order("desc");
    if (args.workspaceId) {
      query = ctx.db
        .query("connections")
        .withIndex("by_workspace_created", (q) =>
          q.eq("workspaceId", args.workspaceId!)
        )
        .order("desc");
    }
    const connections = await query.take(args.limit ?? 100);

    // Enrich with memory info for visualization
    const enriched = await Promise.all(
      connections.map(async (conn) => {
        const source = await ctx.db.get(conn.sourceMemoryId);
        const target = await ctx.db.get(conn.targetMemoryId);
        return {
          ...conn,
          sourceLabel: source?.content.slice(0, 30) ?? "Unknown",
          sourceType: source?.type ?? "insight",
          targetLabel: target?.content.slice(0, 30) ?? "Unknown",
          targetType: target?.type ?? "insight",
        };
      })
    );

    return enriched;
  },
});

export const getForMemory = query({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    const asSource = await ctx.db
      .query("connections")
      .withIndex("by_source", (q) => q.eq("sourceMemoryId", args.memoryId))
      .collect();
    const asTarget = await ctx.db
      .query("connections")
      .withIndex("by_target", (q) => q.eq("targetMemoryId", args.memoryId))
      .collect();
    return [...asSource, ...asTarget];
  },
});

export const create = mutation({
  args: {
    sourceMemoryId: v.id("memories"),
    targetMemoryId: v.id("memories"),
    strength: v.optional(v.number()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Input validation
    if (args.sourceMemoryId === args.targetMemoryId) {
      throw new Error("Cannot connect a memory to itself");
    }
    if (args.strength !== undefined && (args.strength < 0 || args.strength > 1)) {
      throw new Error("Strength must be between 0 and 1");
    }
    if (args.label && args.label.length > 100) {
      throw new Error("Label too long (max 100 characters)");
    }

    const source = await ctx.db.get(args.sourceMemoryId);
    const target = await ctx.db.get(args.targetMemoryId);
    if (!source || !target) throw new Error("Memory not found");
    if (
      source.workspaceId &&
      target.workspaceId &&
      source.workspaceId !== target.workspaceId
    ) {
      throw new Error("Cannot connect memories across workspaces");
    }

    const now = Date.now();
    const workspaceId = source.workspaceId ?? target.workspaceId;
    const connId = await ctx.db.insert("connections", {
      workspaceId,
      sourceMemoryId: args.sourceMemoryId,
      targetMemoryId: args.targetMemoryId,
      strength: args.strength ?? 1,
      label: args.label,
      createdAt: now,
    });

    await ctx.db.patch(args.sourceMemoryId, {
      connectionCount: (source.connectionCount ?? 0) + 1,
    });
    await ctx.db.patch(args.targetMemoryId, {
      connectionCount: (target.connectionCount ?? 0) + 1,
    });

    const stats = await getOrCreateStats(ctx, workspaceId);
    await ctx.db.patch(stats._id, {
      totalConnections: stats.totalConnections + 1,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      workspaceId,
      agentName: source.agentName,
      action: "connected",
      target: `"${source.content.slice(0, 30)}..." ↔ "${target.content.slice(0, 30)}..."`,
      createdAt: now,
    });

    return connId;
  },
});

export const remove = mutation({
  args: { id: v.id("connections") },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.id);
    if (!connection) return;

    const source = await ctx.db.get(connection.sourceMemoryId);
    const target = await ctx.db.get(connection.targetMemoryId);
    if (source) {
      await ctx.db.patch(connection.sourceMemoryId, {
        connectionCount: Math.max(0, (source.connectionCount ?? 0) - 1),
      });
    }
    if (target) {
      await ctx.db.patch(connection.targetMemoryId, {
        connectionCount: Math.max(0, (target.connectionCount ?? 0) - 1),
      });
    }

    const stats = await getOrCreateStats(ctx, connection.workspaceId);
    await ctx.db.patch(stats._id, {
      totalConnections: Math.max(0, stats.totalConnections - 1),
      updatedAt: Date.now(),
    });

    await ctx.db.delete(args.id);
  },
});

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("connections")
      .order("desc")
      .take(args.limit ?? 100);

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
    const source = await ctx.db.get(args.sourceMemoryId);
    const target = await ctx.db.get(args.targetMemoryId);
    if (!source || !target) throw new Error("Memory not found");

    const connId = await ctx.db.insert("connections", {
      sourceMemoryId: args.sourceMemoryId,
      targetMemoryId: args.targetMemoryId,
      strength: args.strength ?? 1,
      label: args.label,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      agentName: source.agentName,
      action: "connected",
      target: `"${source.content.slice(0, 30)}..." ↔ "${target.content.slice(0, 30)}..."`,
      createdAt: Date.now(),
    });

    return connId;
  },
});

export const remove = mutation({
  args: { id: v.id("connections") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

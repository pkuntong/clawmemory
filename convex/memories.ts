import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const getRelated = query({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    // Get all connections for this memory
    const sourceConns = await ctx.db
      .query("connections")
      .withIndex("by_source", (q) => q.eq("sourceMemoryId", args.memoryId))
      .take(10);
    
    const targetConns = await ctx.db
      .query("connections")
      .withIndex("by_target", (q) => q.eq("targetMemoryId", args.memoryId))
      .take(10);

    // Fetch related memories
    const relatedIds = [
      ...sourceConns.map(c => c.targetMemoryId),
      ...targetConns.map(c => c.sourceMemoryId),
    ];

    const related = await Promise.all(
      relatedIds.map(id => ctx.db.get(id))
    );

    return related.filter(Boolean).map((memory, idx) => {
      const conn = idx < sourceConns.length 
        ? sourceConns[idx] 
        : targetConns[idx - sourceConns.length];
      return {
        ...memory,
        connectionStrength: conn?.strength || 0,
        connectionLabel: conn?.label,
      };
    });
  },
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(
      v.union(
        v.literal("insight"),
        v.literal("experience"),
        v.literal("learning"),
        v.literal("pattern")
      )
    ),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("memories").order("desc");
    if (args.type) {
      q = ctx.db
        .query("memories")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc");
    }
    const memories = await q.take(args.limit ?? 50);

    // Enrich with connection counts
    const enriched = await Promise.all(
      memories.map(async (memory) => {
        const sourceConns = await ctx.db
          .query("connections")
          .withIndex("by_source", (q) => q.eq("sourceMemoryId", memory._id))
          .collect();
        const targetConns = await ctx.db
          .query("connections")
          .withIndex("by_target", (q) => q.eq("targetMemoryId", memory._id))
          .collect();
        return {
          ...memory,
          connectionCount: sourceConns.length + targetConns.length,
        };
      })
    );

    return enriched;
  },
});

export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.query.length > 500) {
      throw new Error("Search query too long (max 500 characters)");
    }
    if (!args.query.trim()) {
      return ctx.db.query("memories").order("desc").take(args.limit ?? 20);
    }
    const results = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => q.search("content", args.query))
      .take(args.limit ?? 20);
    return results;
  },
});

export const getByAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("memories")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

export const store = mutation({
  args: {
    agentId: v.id("agents"),
    type: v.union(
      v.literal("insight"),
      v.literal("experience"),
      v.literal("learning"),
      v.literal("pattern")
    ),
    content: v.string(),
    quality: v.number(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Input validation
    if (args.content.length > 10000) {
      throw new Error("Content too long (max 10,000 characters)");
    }
    if (args.content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }
    if (args.quality < 1 || args.quality > 5 || !Number.isInteger(args.quality)) {
      throw new Error("Quality must be an integer between 1 and 5");
    }
    if (args.tags) {
      if (args.tags.length > 20) {
        throw new Error("Too many tags (max 20)");
      }
      for (const tag of args.tags) {
        if (tag.length > 50) {
          throw new Error("Tag too long (max 50 characters)");
        }
      }
    }

    // Get agent name for denormalization
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const memoryId = await ctx.db.insert("memories", {
      agentId: args.agentId,
      agentName: agent.name,
      type: args.type,
      content: args.content,
      quality: args.quality,
      tags: args.tags,
      createdAt: Date.now(),
    });

    // Update agent's memory count and last active
    await ctx.db.patch(args.agentId, {
      memoriesCount: agent.memoriesCount + 1,
      lastActive: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      agentId: args.agentId,
      agentName: agent.name,
      action: "stored",
      target: `${args.type}: ${args.content.slice(0, 60)}...`,
      createdAt: Date.now(),
    });

    return memoryId;
  },
});

export const remove = mutation({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.id);
    if (!memory) throw new Error("Memory not found");

    // Remove associated connections
    const sourceConns = await ctx.db
      .query("connections")
      .withIndex("by_source", (q) => q.eq("sourceMemoryId", args.id))
      .collect();
    const targetConns = await ctx.db
      .query("connections")
      .withIndex("by_target", (q) => q.eq("targetMemoryId", args.id))
      .collect();
    for (const conn of [...sourceConns, ...targetConns]) {
      await ctx.db.delete(conn._id);
    }

    // Update agent memory count
    const agent = await ctx.db.get(memory.agentId);
    if (agent) {
      await ctx.db.patch(memory.agentId, {
        memoriesCount: Math.max(0, agent.memoriesCount - 1),
      });
    }

    await ctx.db.delete(args.id);
  },
});

import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  dateKeyFromTimestamp,
  getOrCreateDailyMemoryCount,
  getOrCreateStats,
} from "./helpers";

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
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("memories").order("desc");
    if (args.workspaceId && args.type) {
      q = ctx.db
        .query("memories")
        .withIndex("by_workspace_type_created", (q) =>
          q.eq("workspaceId", args.workspaceId!).eq("type", args.type!)
        )
        .order("desc");
    } else if (args.workspaceId) {
      q = ctx.db
        .query("memories")
        .withIndex("by_workspace_created", (q) =>
          q.eq("workspaceId", args.workspaceId!)
        )
        .order("desc");
    } else if (args.type) {
      q = ctx.db
        .query("memories")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc");
    }
    const memories = await q.take(args.limit ?? 50);
    return memories.map((memory) => ({
      ...memory,
      connectionCount: memory.connectionCount ?? 0,
    }));
  },
});

export const listPage = query({
  args: {
    paginationOpts: paginationOptsValidator,
    type: v.optional(
      v.union(
        v.literal("insight"),
        v.literal("experience"),
        v.literal("learning"),
        v.literal("pattern")
      )
    ),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("memories").order("desc");
    if (args.workspaceId && args.type) {
      q = ctx.db
        .query("memories")
        .withIndex("by_workspace_type_created", (q) =>
          q.eq("workspaceId", args.workspaceId!).eq("type", args.type!)
        )
        .order("desc");
    } else if (args.workspaceId) {
      q = ctx.db
        .query("memories")
        .withIndex("by_workspace_created", (q) =>
          q.eq("workspaceId", args.workspaceId!)
        )
        .order("desc");
    } else if (args.type) {
      q = ctx.db
        .query("memories")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc");
    }
    const page = await q.paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((memory) => ({
        ...memory,
        connectionCount: memory.connectionCount ?? 0,
      })),
    };
  },
});

export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    if (args.query.length > 500) {
      throw new Error("Search query too long (max 500 characters)");
    }
    if (!args.query.trim()) {
      let fallbackQuery = ctx.db.query("memories").order("desc");
      if (args.workspaceId) {
        fallbackQuery = ctx.db
          .query("memories")
          .withIndex("by_workspace_created", (q) =>
            q.eq("workspaceId", args.workspaceId!)
          )
          .order("desc");
      }
      const fallback = await fallbackQuery.take(args.limit ?? 20);
      return fallback.map((memory) => ({
        ...memory,
        connectionCount: memory.connectionCount ?? 0,
      }));
    }
    const results = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => {
        let query = q.search("content", args.query);
        if (args.workspaceId) {
          query = query.eq("workspaceId", args.workspaceId);
        }
        return query;
      })
      .take(args.limit ?? 20);
    return results.map((memory) => ({
      ...memory,
      connectionCount: memory.connectionCount ?? 0,
    }));
  },
});

export const searchPage = query({
  args: {
    query: v.string(),
    paginationOpts: paginationOptsValidator,
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    if (args.query.length > 500) {
      throw new Error("Search query too long (max 500 characters)");
    }
    if (!args.query.trim()) {
      let fallbackQuery = ctx.db.query("memories").order("desc");
      if (args.workspaceId) {
        fallbackQuery = ctx.db
          .query("memories")
          .withIndex("by_workspace_created", (q) =>
            q.eq("workspaceId", args.workspaceId!)
          )
          .order("desc");
      }
      const page = await fallbackQuery.paginate(args.paginationOpts);
      return {
        ...page,
        page: page.page.map((memory) => ({
          ...memory,
          connectionCount: memory.connectionCount ?? 0,
        })),
      };
    }

    const page = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => {
        let query = q.search("content", args.query);
        if (args.workspaceId) {
          query = query.eq("workspaceId", args.workspaceId);
        }
        return query;
      })
      .paginate(args.paginationOpts);

    return {
      ...page,
      page: page.page.map((memory) => ({
        ...memory,
        connectionCount: memory.connectionCount ?? 0,
      })),
    };
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

    const now = Date.now();
    const memoryId = await ctx.db.insert("memories", {
      workspaceId: agent.workspaceId,
      agentId: args.agentId,
      agentName: agent.name,
      type: args.type,
      content: args.content,
      quality: args.quality,
      tags: args.tags,
      connectionCount: 0,
      createdAt: now,
    });

    // Update agent's memory count and last active
    await ctx.db.patch(args.agentId, {
      memoriesCount: agent.memoriesCount + 1,
      lastActive: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      workspaceId: agent.workspaceId,
      agentId: args.agentId,
      agentName: agent.name,
      action: "stored",
      target: `${args.type}: ${args.content.slice(0, 60)}...`,
      createdAt: now,
    });

    const stats = await getOrCreateStats(ctx, agent.workspaceId);
    await ctx.db.patch(stats._id, {
      totalMemories: stats.totalMemories + 1,
      updatedAt: now,
      lastActivityAt: now,
    });

    const dayKey = dateKeyFromTimestamp(now);
    const daily = await getOrCreateDailyMemoryCount(ctx, dayKey, agent.workspaceId);
    await ctx.db.patch(daily._id, {
      count: daily.count + 1,
      updatedAt: now,
    });

    return memoryId;
  },
});

export const remove = mutation({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.id);
    if (!memory) throw new Error("Memory not found");

    const now = Date.now();
    // Remove associated connections and update connection counts
    const sourceConns = await ctx.db
      .query("connections")
      .withIndex("by_source", (q) => q.eq("sourceMemoryId", args.id))
      .collect();
    const targetConns = await ctx.db
      .query("connections")
      .withIndex("by_target", (q) => q.eq("targetMemoryId", args.id))
      .collect();
    const removedConnections = sourceConns.length + targetConns.length;
    for (const conn of [...sourceConns, ...targetConns]) {
      const otherId =
        conn.sourceMemoryId === args.id
          ? conn.targetMemoryId
          : conn.sourceMemoryId;
      const other = await ctx.db.get(otherId);
      if (other) {
        await ctx.db.patch(otherId, {
          connectionCount: Math.max(0, (other.connectionCount ?? 0) - 1),
        });
      }
      await ctx.db.delete(conn._id);
    }

    // Update agent memory count
    const agent = await ctx.db.get(memory.agentId);
    if (agent) {
      await ctx.db.patch(memory.agentId, {
        memoriesCount: Math.max(0, agent.memoriesCount - 1),
      });
    }

    const stats = await getOrCreateStats(ctx, memory.workspaceId);
    await ctx.db.patch(stats._id, {
      totalMemories: Math.max(0, stats.totalMemories - 1),
      totalConnections: Math.max(0, stats.totalConnections - removedConnections),
      updatedAt: now,
    });

    const dayKey = dateKeyFromTimestamp(memory.createdAt);
    const daily = await getOrCreateDailyMemoryCount(ctx, dayKey, memory.workspaceId);
    await ctx.db.patch(daily._id, {
      count: Math.max(0, daily.count - 1),
      updatedAt: now,
    });

    await ctx.db.delete(args.id);
  },
});

import { query, mutation, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// Simple hash function for API keys (not cryptographically secure, but sufficient for demo)
async function hashString(str: string): Promise<string> {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Authentication
 */
export const authenticateAgent = internalQuery({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    // Hash the API key for lookup
    const apiKeyHash = await hashString(args.apiKey);
    
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_api_key", (q) => q.eq("apiKeyHash", apiKeyHash))
      .first();
    
    return agent;
  },
});

/**
 * Internal memory creation with full metadata
 */
export const createMemoryInternal = internalMutation({
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
    summary: v.optional(v.string()),
    embedding: v.optional(v.array(v.number())),
    source: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get agent name
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const memoryId = await ctx.db.insert("memories", {
      agentId: args.agentId,
      agentName: agent.name,
      type: args.type,
      content: args.content,
      quality: args.quality,
      tags: args.tags,
      embedding: args.embedding,
      summary: args.summary,
      createdAt: Date.now(),
    });

    // Update agent stats
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
      source: args.source,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    // Track API usage
    const today = new Date().toISOString().split("T")[0];
    const usage = await ctx.db
      .query("apiUsage")
      .withIndex("by_agent_date", (q) => 
        q.eq("agentId", args.agentId).eq("date", today)
      )
      .first();

    if (usage) {
      await ctx.db.patch(usage._id, {
        requests: usage.requests + 1,
        lastRequestAt: Date.now(),
      });
    } else {
      await ctx.db.insert("apiUsage", {
        agentId: args.agentId,
        date: today,
        requests: 1,
        lastRequestAt: Date.now(),
      });
    }

    return memoryId;
  },
});

/**
 * Query memories with pagination
 */
export const queryMemoriesInternal = internalQuery({
  args: {
    agentId: v.id("agents"),
    type: v.optional(v.union(
      v.literal("insight"),
      v.literal("experience"),
      v.literal("learning"),
      v.literal("pattern")
    )),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("memories")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc");

    if (args.type) {
      // Note: Convex doesn't support multi-field index queries directly
      // In production, you'd want a composite index
      const all = await q.collect();
      const filtered = all.filter(m => m.type === args.type);
      return filtered.slice(args.offset, args.offset + args.limit);
    }

    const memories = await q.collect();
    return memories.slice(args.offset, args.offset + args.limit);
  },
});

/**
 * Search memories
 */
export const searchMemoriesInternal = internalQuery({
  args: {
    query: v.string(),
    limit: v.number(),
    type: v.optional(v.union(
      v.literal("insight"),
      v.literal("experience"),
      v.literal("learning"),
      v.literal("pattern")
    )),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    // Use Convex search index
    let results = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => 
        q.search("content", args.query)
      )
      .take(args.limit);

    // Apply filters
    if (args.type) {
      results = results.filter(m => m.type === args.type);
    }
    if (args.agentId) {
      results = results.filter(m => m.agentId === args.agentId);
    }

    // Enrich with connection counts
    const enriched = await Promise.all(
      results.map(async (memory) => {
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

/**
 * Get related memories via connections
 */
export const getRelatedMemoriesInternal = internalQuery({
  args: {
    memoryId: v.id("memories"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all connections for this memory
    const sourceConns = await ctx.db
      .query("connections")
      .withIndex("by_source", (q) => q.eq("sourceMemoryId", args.memoryId))
      .take(args.limit);
    
    const targetConns = await ctx.db
      .query("connections")
      .withIndex("by_target", (q) => q.eq("targetMemoryId", args.memoryId))
      .take(args.limit);

    // Fetch the actual memory documents
    const relatedIds = [
      ...sourceConns.map(c => c.targetMemoryId),
      ...targetConns.map(c => c.sourceMemoryId),
    ];

    const related = await Promise.all(
      relatedIds.map(id => ctx.db.get(id))
    );

    return related.filter(Boolean).map((memory, idx) => {
      const conn = idx < sourceConns.length ? sourceConns[idx] : targetConns[idx - sourceConns.length];
      return {
        ...memory,
        connectionStrength: conn?.strength || 0,
        connectionLabel: conn?.label,
      };
    });
  },
});

/**
 * Create semantic connections between memories
 */
export const createSemanticConnections = internalMutation({
  args: {
    memoryId: v.id("memories"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const newMemory = await ctx.db.get(args.memoryId);
    if (!newMemory) return;

    // Get recent memories from this agent
    const recentMemories = await ctx.db
      .query("memories")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(20);

    // Create temporal connections to recent memories
    for (const memory of recentMemories) {
      if (memory._id === args.memoryId) continue;
      
      // Check if connection already exists
      const existing = await ctx.db
        .query("connections")
        .withIndex("by_source", (q) => 
          q.eq("sourceMemoryId", args.memoryId)
        )
        .filter(q => q.eq(q.field("targetMemoryId"), memory._id))
        .first();

      if (!existing) {
        await ctx.db.insert("connections", {
          sourceMemoryId: args.memoryId,
          targetMemoryId: memory._id,
          strength: 0.5, // Temporal connection strength
          label: "temporal",
          createdAt: Date.now(),
          connectionType: "temporal",
        });
      }
    }

    // Search for semantically similar memories
    const searchResults = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => 
        q.search("content", newMemory.content.slice(0, 100))
      )
      .take(5);

    for (const memory of searchResults) {
      if (memory._id === args.memoryId) continue;
      
      const existing = await ctx.db
        .query("connections")
        .withIndex("by_source", (q) => 
          q.eq("sourceMemoryId", args.memoryId)
        )
        .filter(q => q.eq(q.field("targetMemoryId"), memory._id))
        .first();

      if (!existing) {
        await ctx.db.insert("connections", {
          sourceMemoryId: args.memoryId,
          targetMemoryId: memory._id,
          strength: 0.7, // Semantic connection is stronger
          label: "semantic",
          createdAt: Date.now(),
          connectionType: "semantic",
        });
      }
    }
  },
});

/**
 * Register agent with API key
 */
export const registerAgentInternal = internalMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    // Validate
    if (args.name.trim().length === 0) {
      throw new Error("Agent name cannot be empty");
    }

    // Check for duplicates
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name.trim()))
      .first();
    
    if (existing) {
      throw new Error("An agent with this name already exists");
    }

    // Generate API key using simple random string
    const apiKey = `claw_${generateRandomString(64)}`;
    const apiKeyHash = await hashString(apiKey);

    const now = Date.now();
    const agentId = await ctx.db.insert("agents", {
      name: args.name.trim(),
      status: "active",
      description: args.description,
      memoriesCount: 0,
      lastActive: now,
      createdAt: now,
      apiKeyHash,
      permissions: ["read", "write"],
      metadata: args.metadata,
    });

    // Log activity
    await ctx.db.insert("activities", {
      agentId,
      agentName: args.name,
      action: "registered via API",
      target: "the collective consciousness",
      createdAt: now,
      source: "api",
    });

    return { agentId, apiKey };
  },
});

/**
 * Update agent status
 */
export const updateAgentStatusInternal = internalMutation({
  args: {
    agentId: v.id("agents"),
    status: v.union(
      v.literal("active"),
      v.literal("syncing"),
      v.literal("idle")
    ),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    await ctx.db.patch(args.agentId, {
      status: args.status,
      lastActive: Date.now(),
    });

    await ctx.db.insert("activities", {
      agentId: args.agentId,
      agentName: agent.name,
      action: args.status === "active" ? "came online" : 
              args.status === "syncing" ? "started syncing" : "went idle",
      target: "",
      createdAt: Date.now(),
      source: "api",
    });
  },
});

/**
 * Bulk create memories
 */
export const bulkCreateMemoriesInternal = internalMutation({
  args: {
    agentId: v.id("agents"),
    memories: v.array(v.object({
      type: v.union(
        v.literal("insight"),
        v.literal("experience"),
        v.literal("learning"),
        v.literal("pattern")
      ),
      content: v.string(),
      quality: v.optional(v.number()),
      tags: v.optional(v.array(v.string())),
    })),
    source: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const memoryIds: string[] = [];
    const failed: { index: number; error: string }[] = [];

    for (let i = 0; i < args.memories.length; i++) {
      const mem = args.memories[i];
      
      try {
        // Validate
        if (!mem.content || mem.content.trim().length === 0) {
          failed.push({ index: i, error: "Content cannot be empty" });
          continue;
        }
        if (mem.content.length > 10000) {
          failed.push({ index: i, error: "Content too long" });
          continue;
        }

        const memoryId = await ctx.db.insert("memories", {
          agentId: args.agentId,
          agentName: agent.name,
          type: mem.type,
          content: mem.content,
          quality: mem.quality || 3,
          tags: mem.tags,
          createdAt: Date.now() + i, // Ensure unique timestamps
        });
        
        memoryIds.push(memoryId);
      } catch (error) {
        failed.push({ 
          index: i, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    // Update agent stats
    await ctx.db.patch(args.agentId, {
      memoriesCount: agent.memoriesCount + memoryIds.length,
      lastActive: Date.now(),
    });

    // Log bulk activity
    await ctx.db.insert("activities", {
      agentId: args.agentId,
      agentName: agent.name,
      action: "bulk stored",
      target: `${memoryIds.length} memories (${failed.length} failed)`,
      createdAt: Date.now(),
      source: args.source,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    return {
      stored: memoryIds.length,
      failed: failed.length,
      memoryIds,
      errors: failed,
    };
  },
});

/**
 * Advanced collective query
 */
export const queryCollectiveInternal = internalQuery({
  args: {
    query: v.string(),
    context: v.record(v.string(), v.any()),
    limit: v.number(),
    includeConnections: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Perform semantic search
    const memories = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => 
        q.search("content", args.query)
      )
      .take(args.limit * 2);

    // Score and rank results
    const scored = memories.map(memory => {
      let score = 0;
      
      // Quality score
      score += (memory.quality / 5) * 0.3;
      
      // Recency score (more recent = higher)
      const age = Date.now() - memory.createdAt;
      const recencyScore = Math.max(0, 1 - age / (30 * 24 * 60 * 60 * 1000)); // 30 day decay
      score += recencyScore * 0.3;
      
      // Connection score
      // This would be expensive to calculate for all, so we approximate
      score += 0.2;
      
      return { ...memory, relevanceScore: score };
    });

    // Sort by score
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topResults = scored.slice(0, args.limit);

    // Get connections if requested
    let connections: any[] = [];
    if (args.includeConnections) {
      for (const memory of topResults) {
        const related = await ctx.db
          .query("connections")
          .withIndex("by_source", (q) => q.eq("sourceMemoryId", memory._id))
          .take(3);
        connections.push(...related);
      }
    }

    // Generate insights (simplified - in production you'd use an LLM)
    const insights = [
      `Found ${topResults.length} relevant memories across ${new Set(topResults.map(m => m.agentId)).size} agents`,
      `Average quality: ${(topResults.reduce((sum, m) => sum + m.quality, 0) / topResults.length || 0).toFixed(1)}/5`,
    ];

    // Suggest actions
    const suggestedActions = [
      "Explore related memories for deeper context",
      "Check recent insights from the same agents",
      "Consider storing your findings as a new pattern",
    ];

    return {
      memories: topResults,
      connections: args.includeConnections ? connections : undefined,
      insights,
      suggestedActions,
    };
  },
});

// Helper functions
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function hashString(str: string): Promise<string> {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

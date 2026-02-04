import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
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

export const getApiKey = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");
    // Only return if API key exists (shown once at creation)
    return { 
      hasApiKey: !!agent.apiKeyHash,
      createdAt: agent.createdAt,
    };
  },
});

export const regenerateApiKey = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");

    // Generate new API key using simple random string (crypto in actions.ts)
    const apiKey = `claw_${generateRandomString(64)}`;
    const apiKeyHash = await hashString(apiKey);

    await ctx.db.patch(args.id, {
      apiKeyHash,
      lastActive: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      agentId: args.id,
      agentName: agent.name,
      action: "regenerated API key",
      target: "",
      createdAt: Date.now(),
    });

    return { apiKey };
  },
});

// Simple hash function (not cryptographically secure, but sufficient for demo)
async function hashString(str: string): Promise<string> {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

// Generate random string
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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
    });

    // Log activity
    await ctx.db.insert("activities", {
      agentId,
      agentName: args.name,
      action: "joined",
      target: "the collective consciousness",
      createdAt: now,
    });

    // Return agentId AND the API key (shown only once!)
    return { agentId, apiKey };
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

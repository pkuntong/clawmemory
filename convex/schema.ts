import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  memories: defineTable({
    agentId: v.id("agents"),
    agentName: v.string(),
    type: v.union(
      v.literal("insight"),
      v.literal("experience"),
      v.literal("learning"),
      v.literal("pattern")
    ),
    content: v.string(),
    quality: v.number(),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    // New fields for semantic search
    embedding: v.optional(v.array(v.number())),
    summary: v.optional(v.string()),
  })
    .index("by_agent", ["agentId"])
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["type", "agentId"],
    }),

  agents: defineTable({
    name: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("syncing"),
      v.literal("idle")
    ),
    description: v.optional(v.string()),
    memoriesCount: v.number(),
    lastActive: v.number(),
    createdAt: v.number(),
    // API authentication
    apiKey: v.optional(v.string()),
    apiKeyHash: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())), // "read", "write", "admin"
    metadata: v.optional(v.record(v.string(), v.any())),
  })
    .index("by_status", ["status"])
    .index("by_name", ["name"])
    .index("by_api_key", ["apiKeyHash"]),

  connections: defineTable({
    sourceMemoryId: v.id("memories"),
    targetMemoryId: v.id("memories"),
    strength: v.number(),
    label: v.optional(v.string()),
    createdAt: v.number(),
    // New fields for semantic connections
    similarityScore: v.optional(v.number()),
    connectionType: v.optional(v.string()), // "semantic", "temporal", "agent"
  })
    .index("by_source", ["sourceMemoryId"])
    .index("by_target", ["targetMemoryId"]),

  activities: defineTable({
    agentId: v.optional(v.id("agents")),
    agentName: v.string(),
    action: v.string(),
    target: v.string(),
    createdAt: v.number(),
    // New fields for API tracking
    source: v.optional(v.string()), // "api", "web", "system"
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }).index("by_created", ["createdAt"]),

  // New table for API rate limiting
  apiUsage: defineTable({
    agentId: v.id("agents"),
    date: v.string(), // YYYY-MM-DD format
    requests: v.number(),
    tokensUsed: v.optional(v.number()),
    lastRequestAt: v.number(),
  })
    .index("by_agent_date", ["agentId", "date"])
    .index("by_date", ["date"]),

  // Webhooks for external notifications
  webhooks: defineTable({
    agentId: v.id("agents"),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    active: v.boolean(),
    createdAt: v.number(),
    lastSuccess: v.optional(v.number()),
    lastFailure: v.optional(v.number()),
    failureCount: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_active", ["active"]),
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  memories: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
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
    connectionCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"])
    .index("by_workspace_created", ["workspaceId", "createdAt"])
    .index("by_workspace_type_created", ["workspaceId", "type", "createdAt"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["type", "agentId", "workspaceId"],
    }),

  agents: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    name: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("syncing"),
      v.literal("idle")
    ),
    description: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    memoriesCount: v.number(),
    lastActive: v.number(),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_name", ["name"])
    .index("by_workspace", ["workspaceId"])
    .index("by_api_key", ["apiKey"]),

  connections: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    sourceMemoryId: v.id("memories"),
    targetMemoryId: v.id("memories"),
    strength: v.number(),
    label: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_source", ["sourceMemoryId"])
    .index("by_target", ["targetMemoryId"])
    .index("by_workspace_created", ["workspaceId", "createdAt"]),

  activities: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    agentId: v.optional(v.id("agents")),
    agentName: v.string(),
    action: v.string(),
    target: v.string(),
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_workspace_created", ["workspaceId", "createdAt"]),

  workspaces: defineTable({
    name: v.string(),
    key: v.string(),
    secret: v.string(),
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_key_secret", ["key", "secret"])
    .index("by_default", ["isDefault"]),

  stats: defineTable({
    key: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
    totalMemories: v.number(),
    totalAgents: v.number(),
    activeAgents: v.number(),
    totalConnections: v.number(),
    lastActivityAt: v.optional(v.union(v.number(), v.null())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_workspace", ["workspaceId"]),

  dailyMemoryCounts: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    date: v.string(),
    count: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_workspace_date", ["workspaceId", "date"]),
});

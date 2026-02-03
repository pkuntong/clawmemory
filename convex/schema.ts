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
  })
    .index("by_status", ["status"])
    .index("by_name", ["name"]),

  connections: defineTable({
    sourceMemoryId: v.id("memories"),
    targetMemoryId: v.id("memories"),
    strength: v.number(),
    label: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_source", ["sourceMemoryId"])
    .index("by_target", ["targetMemoryId"]),

  activities: defineTable({
    agentId: v.optional(v.id("agents")),
    agentName: v.string(),
    action: v.string(),
    target: v.string(),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),
});

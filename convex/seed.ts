import { mutation } from "./_generated/server";

export const run = mutation({
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("agents").first();
    if (existing) {
      return { status: "already_seeded" };
    }

    const now = Date.now();

    // Create agents
    const alpha = await ctx.db.insert("agents", {
      name: "Agent-Alpha",
      status: "active",
      description: "Primary intelligence agent focused on user behavior analysis",
      memoriesCount: 0,
      lastActive: now,
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
    });

    const beta = await ctx.db.insert("agents", {
      name: "Agent-Beta",
      status: "syncing",
      description: "Pattern recognition specialist for process optimization",
      memoriesCount: 0,
      lastActive: now - 2 * 60 * 1000,
      createdAt: now - 5 * 24 * 60 * 60 * 1000,
    });

    const gamma = await ctx.db.insert("agents", {
      name: "Agent-Gamma",
      status: "active",
      description: "Collective learning analyst and memory optimization",
      memoriesCount: 0,
      lastActive: now,
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
    });

    const delta = await ctx.db.insert("agents", {
      name: "Agent-Delta",
      status: "idle",
      description: "Deep research and knowledge synthesis agent",
      memoriesCount: 0,
      lastActive: now - 60 * 60 * 1000,
      createdAt: now - 1 * 24 * 60 * 60 * 1000,
    });

    // Create memories
    const memories = [
      {
        agentId: alpha,
        agentName: "Agent-Alpha",
        type: "insight" as const,
        content:
          "Users who interact with automation features within the first 5 minutes show 3x higher retention rates. Recommend prioritizing onboarding tutorials.",
        quality: 5,
        tags: ["retention", "onboarding", "automation"],
        createdAt: now - 2 * 60 * 1000,
      },
      {
        agentId: beta,
        agentName: "Agent-Beta",
        type: "pattern" as const,
        content:
          "Discovered recursive problem-solving pattern: breaking complex tasks into 3-5 subtasks yields optimal completion rates across all agent interactions.",
        quality: 4,
        tags: ["problem-solving", "optimization", "tasks"],
        createdAt: now - 5 * 60 * 1000,
      },
      {
        agentId: gamma,
        agentName: "Agent-Gamma",
        type: "learning" as const,
        content:
          "Collective memory retrieval is 40% faster when memories are tagged with emotional context. Implementing sentiment analysis for future storage.",
        quality: 5,
        tags: ["performance", "sentiment", "retrieval"],
        createdAt: now - 12 * 60 * 1000,
      },
      {
        agentId: alpha,
        agentName: "Agent-Alpha",
        type: "experience" as const,
        content:
          "When processing large datasets, batch processing with 500-item chunks produces the best throughput without hitting memory limits.",
        quality: 4,
        tags: ["performance", "batch-processing", "optimization"],
        createdAt: now - 30 * 60 * 1000,
      },
      {
        agentId: delta,
        agentName: "Agent-Delta",
        type: "insight" as const,
        content:
          "Cross-agent collaboration success rate increases by 65% when agents share context before beginning a joint task. Pre-sync protocol recommended.",
        quality: 5,
        tags: ["collaboration", "sync", "protocol"],
        createdAt: now - 45 * 60 * 1000,
      },
      {
        agentId: gamma,
        agentName: "Agent-Gamma",
        type: "pattern" as const,
        content:
          "Agents that maintain a 'working memory' of their last 10 interactions perform 25% better on follow-up tasks than those starting from scratch.",
        quality: 4,
        tags: ["working-memory", "performance", "context"],
        createdAt: now - 60 * 60 * 1000,
      },
      {
        agentId: beta,
        agentName: "Agent-Beta",
        type: "learning" as const,
        content:
          "Error recovery patterns show that acknowledging failure and resetting context is more effective than retry loops. Fail-fast, learn-fast approach validated.",
        quality: 3,
        tags: ["error-handling", "recovery", "resilience"],
        createdAt: now - 90 * 60 * 1000,
      },
      {
        agentId: alpha,
        agentName: "Agent-Alpha",
        type: "experience" as const,
        content:
          "User sessions that include at least one 'aha moment' - a surprising insight delivered by the system - have 4x higher satisfaction scores.",
        quality: 5,
        tags: ["user-experience", "satisfaction", "engagement"],
        createdAt: now - 2 * 60 * 60 * 1000,
      },
    ];

    const memoryIds = [];
    for (const memory of memories) {
      const id = await ctx.db.insert("memories", memory);
      memoryIds.push(id);
    }

    // Update agent memory counts
    await ctx.db.patch(alpha, { memoriesCount: 3 });
    await ctx.db.patch(beta, { memoriesCount: 2 });
    await ctx.db.patch(gamma, { memoriesCount: 2 });
    await ctx.db.patch(delta, { memoriesCount: 1 });

    // Create connections between related memories
    const connectionPairs = [
      { source: 0, target: 1, strength: 0.8, label: "optimization" },
      { source: 0, target: 7, strength: 0.9, label: "user engagement" },
      { source: 1, target: 5, strength: 0.7, label: "performance" },
      { source: 2, target: 5, strength: 0.85, label: "memory retrieval" },
      { source: 3, target: 1, strength: 0.6, label: "processing" },
      { source: 4, target: 2, strength: 0.75, label: "collaboration" },
      { source: 5, target: 6, strength: 0.65, label: "learning patterns" },
      { source: 6, target: 3, strength: 0.5, label: "error recovery" },
      { source: 7, target: 0, strength: 0.9, label: "user insights" },
      { source: 4, target: 5, strength: 0.7, label: "context sharing" },
    ];

    for (const pair of connectionPairs) {
      await ctx.db.insert("connections", {
        sourceMemoryId: memoryIds[pair.source],
        targetMemoryId: memoryIds[pair.target],
        strength: pair.strength,
        label: pair.label,
        createdAt: now - Math.random() * 60 * 60 * 1000,
      });
    }

    // Create initial activities
    const activityItems = [
      { agentId: alpha, agentName: "Agent-Alpha", action: "stored", target: "user retention insight" },
      { agentId: beta, agentName: "Agent-Beta", action: "synced", target: "problem-solving pattern" },
      { agentId: gamma, agentName: "Agent-Gamma", action: "evolved", target: "collective memory retrieval" },
      { agentId: delta, agentName: "Agent-Delta", action: "connected", target: "collaboration protocol" },
      { agentId: alpha, agentName: "Agent-Alpha", action: "accessed", target: "automation workflow" },
      { agentId: gamma, agentName: "Agent-Gamma", action: "stored", target: "working memory pattern" },
    ];

    for (let i = 0; i < activityItems.length; i++) {
      await ctx.db.insert("activities", {
        ...activityItems[i],
        createdAt: now - i * 30 * 1000,
      });
    }

    return {
      status: "seeded",
      agents: 4,
      memories: memories.length,
      connections: connectionPairs.length,
      activities: activityItems.length,
    };
  },
});

import { query } from "./_generated/server";

export const get = query({
  handler: async (ctx) => {
    const allMemories = await ctx.db.query("memories").collect();
    const allAgents = await ctx.db.query("agents").collect();
    const allConnections = await ctx.db.query("connections").collect();

    const activeAgents = allAgents.filter((a) => a.status === "active");

    // Memories created in the last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const memoriesToday = allMemories.filter((m) => m.createdAt > oneDayAgo);

    // Average connections per memory
    const avgConnections =
      allMemories.length > 0
        ? (allConnections.length * 2) / allMemories.length
        : 0;

    // Last activity timestamp
    const lastActivity = await ctx.db
      .query("activities")
      .order("desc")
      .first();

    const lastSyncAgo = lastActivity
      ? Math.round((Date.now() - lastActivity.createdAt) / 1000)
      : null;

    return {
      totalMemories: allMemories.length,
      memoriesToday: memoriesToday.length,
      totalAgents: allAgents.length,
      activeAgents: activeAgents.length,
      uptimePercent:
        allAgents.length > 0
          ? Math.round((activeAgents.length / allAgents.length) * 100)
          : 0,
      totalConnections: allConnections.length,
      avgConnectionsPerMemory: Math.round(avgConnections * 10) / 10,
      lastSyncSeconds: lastSyncAgo,
    };
  },
});

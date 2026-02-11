export function generateKey(prefix: string): string {
  const uuid =
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "")
      : `${Math.random().toString(36).slice(2)}${Math.random()
          .toString(36)
          .slice(2)}`;
  return `${prefix}_${uuid}`;
}

export function dateKeyFromTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export async function getStatsDoc(
  ctx: { db: any },
  workspaceId?: string | null
) {
  if (workspaceId) {
    return ctx.db
      .query("stats")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", workspaceId))
      .first();
  }

  return ctx.db
    .query("stats")
    .withIndex("by_key", (q: any) => q.eq("key", "global"))
    .first();
}

export async function getOrCreateStats(
  ctx: { db: any },
  workspaceId?: string | null
) {
  const existing = await getStatsDoc(ctx, workspaceId);
  if (existing) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("stats", {
    key: workspaceId ? `ws:${workspaceId}` : "global",
    workspaceId: workspaceId ?? undefined,
    totalMemories: 0,
    totalAgents: 0,
    activeAgents: 0,
    totalConnections: 0,
    lastActivityAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return ctx.db.get(id);
}

export async function getDailyMemoryCount(
  ctx: { db: any },
  date: string,
  workspaceId?: string | null
) {
  if (workspaceId) {
    return ctx.db
      .query("dailyMemoryCounts")
      .withIndex("by_workspace_date", (q: any) =>
        q.eq("workspaceId", workspaceId).eq("date", date)
      )
      .first();
  }

  return ctx.db
    .query("dailyMemoryCounts")
    .withIndex("by_date", (q: any) => q.eq("date", date))
    .first();
}

export async function getOrCreateDailyMemoryCount(
  ctx: { db: any },
  date: string,
  workspaceId?: string | null
) {
  const existing = await getDailyMemoryCount(ctx, date, workspaceId);
  if (existing) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("dailyMemoryCounts", {
    workspaceId: workspaceId ?? undefined,
    date,
    count: 0,
    createdAt: now,
    updatedAt: now,
  });
  return ctx.db.get(id);
}

export async function getDefaultWorkspace(ctx: { db: any }) {
  return ctx.db
    .query("workspaces")
    .withIndex("by_default", (q: any) => q.eq("isDefault", true))
    .first();
}

export async function getOrCreateDefaultWorkspace(ctx: { db: any }) {
  const existing = await getDefaultWorkspace(ctx);
  if (existing) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("workspaces", {
    name: "Default Workspace",
    key: generateKey("ws"),
    secret: generateKey("wss"),
    isDefault: true,
    createdAt: now,
  });
  return ctx.db.get(id);
}

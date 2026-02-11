import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Agent-Key, X-Workspace-Key, X-Workspace-Secret",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function decodeBase64(value: string): string {
  if (typeof atob === "function") {
    return atob(value);
  }
  const buffer = (globalThis as any).Buffer;
  if (buffer?.from) {
    return buffer.from(value, "base64").toString("utf-8");
  }
  throw new Error("Base64 decoder unavailable");
}

function parseBasicAuth(header: string | null): { key: string; secret: string } | null {
  if (!header || !header.startsWith("Basic ")) return null;
  const encoded = header.slice(6).trim();
  if (!encoded) return null;
  const decoded = decodeBase64(encoded);
  const [key, ...rest] = decoded.split(":");
  const secret = rest.join(":");
  if (!key || !secret) return null;
  return { key, secret };
}

async function authenticateWorkspace(ctx: any, request: Request) {
  const headerAuth = request.headers.get("authorization");
  let basic: { key: string; secret: string } | null = null;
  try {
    basic = parseBasicAuth(headerAuth);
  } catch {
    basic = null;
  }
  const headerKey = request.headers.get("x-workspace-key");
  const headerSecret = request.headers.get("x-workspace-secret");
  const creds =
    basic ??
    (headerKey && headerSecret ? { key: headerKey, secret: headerSecret } : null);

  if (!creds) return null;
  return ctx.runQuery(api.workspaces.getByCredentials, creds);
}

http.route({
  path: "/api/memories",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/memories",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let payload: Record<string, unknown>;
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const workspace = await authenticateWorkspace(ctx, request);
    if (!workspace) {
      return jsonResponse({ error: "Missing or invalid workspace credentials." }, 401);
    }

    const auth = request.headers.get("authorization") ?? "";
    const apiKey =
      request.headers.get("x-agent-key") ??
      (payload.apiKey as string | undefined) ??
      (auth.startsWith("Bearer ") ? auth.slice(7) : undefined);
    if (!apiKey) {
      return jsonResponse({ error: "Missing API key." }, 401);
    }

    const agent = await ctx.runQuery(api.agents.getByApiKey, { apiKey });
    if (!agent) {
      return jsonResponse({ error: "Invalid API key." }, 403);
    }
    if (agent.workspaceId && agent.workspaceId !== workspace._id) {
      return jsonResponse({ error: "Agent does not belong to this workspace." }, 403);
    }
    if (!agent.workspaceId) {
      await ctx.runMutation(api.agents.attachWorkspace, {
        id: agent._id,
        workspaceId: workspace._id,
      });
    }

    const type = (payload.type as string | undefined) ?? "insight";
    const allowedTypes = new Set(["insight", "experience", "learning", "pattern"]);
    if (!allowedTypes.has(type)) {
      return jsonResponse({ error: "Invalid memory type." }, 400);
    }

    const content = typeof payload.content === "string" ? payload.content : "";
    if (!content.trim()) {
      return jsonResponse({ error: "Content is required." }, 400);
    }

    const quality =
      typeof payload.quality === "number" && Number.isInteger(payload.quality)
        ? (payload.quality as number)
        : 4;
    const tags = Array.isArray(payload.tags) ? (payload.tags as string[]) : undefined;

    const id = await ctx.runMutation(api.memories.store, {
      agentId: agent._id,
      type: type as "insight" | "experience" | "learning" | "pattern",
      content,
      quality,
      tags,
    });

    return jsonResponse({ id, workspaceId: workspace._id });
  }),
});

http.route({
  path: "/api/memories/search",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/memories/search",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let payload: Record<string, unknown>;
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const workspace = await authenticateWorkspace(ctx, request);
    if (!workspace) {
      return jsonResponse({ error: "Missing or invalid workspace credentials." }, 401);
    }

    const query = typeof payload.query === "string" ? payload.query : "";
    const limit = typeof payload.limit === "number" ? payload.limit : 20;

    const results = await ctx.runQuery(api.memories.search, {
      query,
      limit,
      workspaceId: workspace._id,
    });

    return jsonResponse({ results });
  }),
});

export default http;

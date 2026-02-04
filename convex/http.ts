import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

/**
 * CORS headers for API responses
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Parse and validate API key from Authorization header
 */
function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  
  // Support "Bearer <api_key>" or just "<api_key>"
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return authHeader;
}

/**
 * JSON response helper
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

/**
 * Error response helper
 */
function errorResponse(message: string, status = 400, code?: string): Response {
  return jsonResponse({ error: message, code }, status);
}

/**
 * Health check endpoint
 * GET /api/health
 */
export const health = httpAction(async (_ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  return jsonResponse({
    status: "healthy",
    service: "ClawMemory API",
    version: "1.0.0",
    timestamp: Date.now(),
  });
});

/**
 * Store a memory
 * POST /api/memories
 */
export const storeMemory = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return errorResponse("API key required", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.content || typeof body.content !== "string") {
      return errorResponse("Content is required", 400, "INVALID_CONTENT");
    }
    if (!body.type || !["insight", "experience", "learning", "pattern"].includes(body.type)) {
      return errorResponse("Valid type required (insight, experience, learning, pattern)", 400, "INVALID_TYPE");
    }

    // Authenticate agent
    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return errorResponse("Invalid API key", 401, "UNAUTHORIZED");
    }

    // Check permissions
    if (!agent.permissions?.includes("write")) {
      return errorResponse("Agent does not have write permission", 403, "FORBIDDEN");
    }

    // Store the memory
    const memoryId = await ctx.runMutation(api.internal.api.createMemoryInternal, {
      agentId: agent._id,
      type: body.type,
      content: body.content,
      quality: body.quality || 3,
      tags: body.tags || [],
      summary: body.summary,
      embedding: body.embedding,
      source: "api",
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    // Auto-create connections if similar memories exist
    if (body.autoConnect !== false) {
      await ctx.runMutation(api.internal.api.createSemanticConnections, {
        memoryId,
        agentId: agent._id,
      });
    }

    return jsonResponse({
      success: true,
      memoryId,
      agent: { id: agent._id, name: agent.name },
      timestamp: Date.now(),
    }, 201);

  } catch (error) {
    console.error("Store memory error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});

/**
 * Retrieve memories
 * GET /api/memories
 * Query params: agentId, type, limit, offset
 */
export const getMemories = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return errorResponse("API key required", 401, "UNAUTHORIZED");
    }

    // Authenticate agent
    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return errorResponse("Invalid API key", 401, "UNAUTHORIZED");
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const type = url.searchParams.get("type") as any;
    const targetAgentId = url.searchParams.get("agentId");

    // Check permissions
    if (!agent.permissions?.includes("read")) {
      return errorResponse("Agent does not have read permission", 403, "FORBIDDEN");
    }

    // Fetch memories
    const memories = await ctx.runQuery(api.internal.api.queryMemoriesInternal, {
      agentId: targetAgentId || agent._id,
      type,
      limit,
      offset,
    });

    return jsonResponse({
      memories,
      pagination: {
        limit,
        offset,
        total: memories.length, // Note: In production, you'd want a separate count query
      },
      agent: { id: agent._id, name: agent.name },
    });

  } catch (error) {
    console.error("Get memories error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});

/**
 * Semantic search for memories
 * POST /api/memories/search
 */
export const searchMemories = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return errorResponse("API key required", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    
    if (!body.query || typeof body.query !== "string") {
      return errorResponse("Query is required", 400, "INVALID_QUERY");
    }

    // Authenticate agent
    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return errorResponse("Invalid API key", 401, "UNAUTHORIZED");
    }

    if (!agent.permissions?.includes("read")) {
      return errorResponse("Agent does not have read permission", 403, "FORBIDDEN");
    }

    // Perform search
    const results = await ctx.runQuery(api.internal.api.searchMemoriesInternal, {
      query: body.query,
      limit: Math.min(body.limit || 20, 100),
      type: body.type,
      agentId: body.agentId,
    });

    return jsonResponse({
      query: body.query,
      results,
      count: results.length,
      agent: { id: agent._id, name: agent.name },
    });

  } catch (error) {
    console.error("Search memories error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});

/**
 * Get related memories
 * GET /api/memories/:id/related
 */
export const getRelatedMemories = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return errorResponse("API key required", 401, "UNAUTHORIZED");
    }

    // Extract memory ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const memoryId = pathParts[pathParts.length - 2]; // /api/memories/:id/related

    if (!memoryId) {
      return errorResponse("Memory ID required", 400, "INVALID_ID");
    }

    // Authenticate agent
    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return errorResponse("Invalid API key", 401, "UNAUTHORIZED");
    }

    if (!agent.permissions?.includes("read")) {
      return errorResponse("Agent does not have read permission", 403, "FORBIDDEN");
    }

    // Get related memories
    const related = await ctx.runQuery(api.internal.api.getRelatedMemoriesInternal, {
      memoryId: memoryId as any,
      limit: 10,
    });

    return jsonResponse({
      memoryId,
      related,
      count: related.length,
    });

  } catch (error) {
    console.error("Get related memories error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});

/**
 * Register a new agent via API
 * POST /api/agents/register
 */
export const registerAgent = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string") {
      return errorResponse("Agent name is required", 400, "INVALID_NAME");
    }

    // Register the agent
    const result = await ctx.runMutation(api.internal.api.registerAgentInternal, {
      name: body.name,
      description: body.description,
      metadata: body.metadata,
    });

    return jsonResponse({
      success: true,
      agent: {
        id: result.agentId,
        name: body.name,
        apiKey: result.apiKey, // Only shown once!
      },
      warning: "Store this API key securely. It will not be shown again.",
    }, 201);

  } catch (error) {
    console.error("Register agent error:", error);
    if (error instanceof Error && error.message.includes("already exists")) {
      return errorResponse(error.message, 409, "DUPLICATE_NAME");
    }
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});

/**
 * Get agent info
 * GET /api/agents/me
 */
export const getAgentInfo = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return errorResponse("API key required", 401, "UNAUTHORIZED");
    }

    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return errorResponse("Invalid API key", 401, "UNAUTHORIZED");
    }

    return jsonResponse({
      agent: {
        id: agent._id,
        name: agent.name,
        status: agent.status,
        description: agent.description,
        memoriesCount: agent.memoriesCount,
        lastActive: agent.lastActive,
        createdAt: agent.createdAt,
        permissions: agent.permissions,
      },
    });

  } catch (error) {
    console.error("Get agent info error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});

/**
 * Update agent status
 * POST /api/agents/status
 */
export const updateAgentStatus = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return errorResponse("API key required", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    
    if (!body.status || !["active", "syncing", "idle"].includes(body.status)) {
      return errorResponse("Valid status required (active, syncing, idle)", 400, "INVALID_STATUS");
    }

    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return errorResponse("Invalid API key", 401, "UNAUTHORIZED");
    }

    await ctx.runMutation(api.internal.api.updateAgentStatusInternal, {
      agentId: agent._id,
      status: body.status,
    });

    return jsonResponse({
      success: true,
      agent: {
        id: agent._id,
        name: agent.name,
        status: body.status,
      },
    });

  } catch (error) {
    console.error("Update status error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});

/**
 * Query collective consciousness
 * POST /api/query
 * Advanced semantic query with context
 */
export const queryCollective = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return errorResponse("API key required", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    
    if (!body.query || typeof body.query !== "string") {
      return errorResponse("Query is required", 400, "INVALID_QUERY");
    }

    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return errorResponse("Invalid API key", 401, "UNAUTHORIZED");
    }

    if (!agent.permissions?.includes("read")) {
      return errorResponse("Agent does not have read permission", 403, "FORBIDDEN");
    }

    // Perform intelligent query
    const results = await ctx.runQuery(api.internal.api.queryCollectiveInternal, {
      query: body.query,
      context: body.context || {},
      limit: Math.min(body.limit || 10, 50),
      includeConnections: body.includeConnections !== false,
    });

    return jsonResponse({
      query: body.query,
      results,
      insights: results.insights || [],
      suggestedActions: results.suggestedActions || [],
      agent: { id: agent._id, name: agent.name },
    });

  } catch (error) {
    console.error("Query collective error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});

/**
 * Bulk operations
 * POST /api/memories/bulk
 */
export const bulkStoreMemories = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return errorResponse("API key required", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    
    if (!body.memories || !Array.isArray(body.memories) || body.memories.length === 0) {
      return errorResponse("Memories array is required", 400, "INVALID_MEMORIES");
    }

    if (body.memories.length > 100) {
      return errorResponse("Maximum 100 memories per bulk request", 400, "TOO_MANY_MEMORIES");
    }

    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return errorResponse("Invalid API key", 401, "UNAUTHORIZED");
    }

    if (!agent.permissions?.includes("write")) {
      return errorResponse("Agent does not have write permission", 403, "FORBIDDEN");
    }

    // Store memories in bulk
    const results = await ctx.runMutation(api.internal.api.bulkCreateMemoriesInternal, {
      agentId: agent._id,
      memories: body.memories,
      source: "api",
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return jsonResponse({
      success: true,
      stored: results.stored,
      failed: results.failed,
      memoryIds: results.memoryIds,
      agent: { id: agent._id, name: agent.name },
    }, 201);

  } catch (error) {
    console.error("Bulk store error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});

/**
 * Real-time subscription info
 * GET /api/stream
 * Returns SSE endpoint info for real-time updates
 */
export const getStreamInfo = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return errorResponse("API key required", 401, "UNAUTHORIZED");
    }

    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return errorResponse("Invalid API key", 401, "UNAUTHORIZED");
    }

    // Return WebSocket/SSE connection info
    // Note: Actual streaming would require a separate WebSocket server
    return jsonResponse({
      streamEndpoint: `/api/stream/${agent._id}`,
      protocol: "sse",
      supportedEvents: ["memory.created", "memory.updated", "agent.status_changed"],
      agent: { id: agent._id, name: agent.name },
    });

  } catch (error) {
    console.error("Get stream info error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 500);
  }
});

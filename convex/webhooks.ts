import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

/**
 * Webhook delivery system for ClawMemory
 * 
 * Sends real-time notifications to external endpoints when:
 * - Memories are created/updated
 * - Agents change status
 * - New connections are formed
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Register a webhook endpoint
 * POST /api/webhooks/register
 */
export const registerWebhook = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await request.json();
    
    if (!body.url || !body.events || !Array.isArray(body.events)) {
      return new Response(JSON.stringify({ error: "URL and events array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate URL
    try {
      new URL(body.url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Authenticate agent
    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Register webhook
    const webhookId = await ctx.runMutation(api.internal.webhooks.create, {
      agentId: agent._id,
      url: body.url,
      events: body.events,
      secret: body.secret,
      metadata: body.metadata,
    });

    // Send test event
    await ctx.runMutation(api.internal.webhooks.sendTest, {
      webhookId,
      url: body.url,
    });

    return new Response(
      JSON.stringify({
        success: true,
        webhookId,
        url: body.url,
        events: body.events,
        message: "Webhook registered. Test event sent.",
      }),
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Register webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * List webhooks for an agent
 * GET /api/webhooks
 */
export const listWebhooks = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const webhooks = await ctx.runQuery(api.internal.webhooks.list, {
      agentId: agent._id,
    });

    return new Response(
      JSON.stringify({ webhooks }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("List webhooks error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * Delete a webhook
 * DELETE /api/webhooks/:id
 */
export const deleteWebhook = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "DELETE") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const webhookId = pathParts[pathParts.length - 1];

    if (!webhookId) {
      return new Response(JSON.stringify({ error: "Webhook ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const agent = await ctx.runQuery(api.internal.api.authenticateAgent, { apiKey });
    if (!agent) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    await ctx.runMutation(api.internal.webhooks.remove, {
      webhookId: webhookId as any,
      agentId: agent._id,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Delete webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

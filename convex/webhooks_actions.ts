"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

/**
 * Action to deliver webhooks via HTTP POST
 * 
 * Actions can make external HTTP requests, unlike queries/mutations.
 * This file uses "use node" to access Node.js built-in modules.
 */

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Simple HMAC (not cryptographically secure, but sufficient for demo)
function generateSignature(payload: string, secret: string): string {
  let hash = 0;
  const data = payload + secret;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

export const deliverWebhook = action({
  args: {
    webhookId: v.id("webhooks"),
    event: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    // Get webhook details
    const webhook = await ctx.runQuery(api.internal.webhooks_internal.getById, {
      webhookId: args.webhookId,
    });

    if (!webhook || !webhook.active) {
      console.log(`Webhook ${args.webhookId} not found or inactive`);
      return { success: false, error: "Webhook not found or inactive" };
    }

    // Check if webhook is subscribed to this event
    if (!webhook.events.includes(args.event) && !webhook.events.includes("*")) {
      return { success: true, skipped: true };
    }

    // Prepare payload
    const payload = {
      event: args.event,
      timestamp: Date.now(),
      data: args.payload,
    };

    const payloadString = JSON.stringify(payload);

    // Generate signature if secret is configured
    let signature: string | undefined;
    if (webhook.secret) {
      signature = generateSignature(payloadString, webhook.secret);
    }

    try {
      // Make HTTP request
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ClawMemory-Webhook/1.0",
          "X-ClawMemory-Event": args.event,
          "X-ClawMemory-Delivery": generateUUID(),
          ...(signature && { "X-ClawMemory-Signature": signature }),
        },
        body: payloadString,
      });

      // Update webhook status
      if (response.ok) {
        await ctx.runMutation(api.internal.webhooks_internal.updateStatus, {
          webhookId: args.webhookId,
          success: true,
        });

        return {
          success: true,
          statusCode: response.status,
        };
      } else {
        // Track failure
        await ctx.runMutation(api.internal.webhooks_internal.updateStatus, {
          webhookId: args.webhookId,
          success: false,
          error: `HTTP ${response.status}`,
        });

        return {
          success: false,
          error: `HTTP ${response.status}`,
          statusCode: response.status,
        };
      }
    } catch (error) {
      // Network error or other exception
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      await ctx.runMutation(api.internal.webhooks_internal.updateStatus, {
        webhookId: args.webhookId,
        success: false,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});

/**
 * Schedule webhook deliveries for an event
 */
export const scheduleWebhooks = action({
  args: {
    event: v.string(),
    payload: v.any(),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    // Get all webhooks for this event
    const webhooks = await ctx.runQuery(api.internal.webhooks_internal.getForEvent, {
      event: args.event,
      agentId: args.agentId,
    });

    const results = [];

    for (const webhook of webhooks) {
      // Schedule webhook delivery
      const result = await ctx.runAction(api.webhooks_actions.deliverWebhook, {
        webhookId: webhook._id,
        event: args.event,
        payload: args.payload,
      });

      results.push({
        webhookId: webhook._id,
        url: webhook.url,
        ...result,
      });
    }

    return {
      triggered: webhooks.length,
      results,
    };
  },
});

import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Internal webhook management functions
 */

export const create = internalMutation({
  args: {
    agentId: v.id("agents"),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const webhookId = await ctx.db.insert("webhooks", {
      agentId: args.agentId,
      url: args.url,
      events: args.events,
      secret: args.secret,
      metadata: args.metadata,
      active: true,
      createdAt: Date.now(),
      lastSuccess: undefined,
      lastFailure: undefined,
      failureCount: 0,
    });

    return webhookId;
  },
});

export const list = internalQuery({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("webhooks")
      .filter(q => q.eq(q.field("agentId"), args.agentId))
      .collect();
  },
});

export const remove = internalMutation({
  args: {
    webhookId: v.id("webhooks"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook || webhook.agentId !== args.agentId) {
      throw new Error("Webhook not found or access denied");
    }
    await ctx.db.delete(args.webhookId);
  },
});

export const sendTest = internalMutation({
  args: {
    webhookId: v.id("webhooks"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would schedule an action to POST to the URL
    // For now, we just log it
    console.log(`Test webhook would be sent to ${args.url}`);
    
    // Update last success
    await ctx.db.patch(args.webhookId, {
      lastSuccess: Date.now(),
    });
  },
});

/**
 * Get webhook by ID
 */
export const getById = internalQuery({
  args: {
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.webhookId);
  },
});

/**
 * Get webhooks for a specific event
 */
export const getForEvent = internalQuery({
  args: {
    event: v.string(),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const allWebhooks = await ctx.db
      .query("webhooks")
      .withIndex("by_active", q => q.eq("active", true))
      .collect();

    return allWebhooks.filter(w => {
      // Check if webhook is subscribed to this event
      const eventMatch = w.events.includes(args.event) || w.events.includes("*");
      
      // Filter by agent if specified
      const agentMatch = !args.agentId || w.agentId === args.agentId;
      
      return eventMatch && agentMatch;
    });
  },
});

/**
 * Update webhook status after delivery attempt
 */
export const updateStatus = internalMutation({
  args: {
    webhookId: v.id("webhooks"),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) return;

    if (args.success) {
      await ctx.db.patch(args.webhookId, {
        lastSuccess: Date.now(),
        failureCount: 0,
      });
    } else {
      const newFailureCount = (webhook.failureCount || 0) + 1;
      const updates: any = {
        lastFailure: Date.now(),
        failureCount: newFailureCount,
      };

      // Deactivate webhook after 10 consecutive failures
      if (newFailureCount >= 10) {
        updates.active = false;
      }

      await ctx.db.patch(args.webhookId, updates);
    }
  },
});

/**
 * Trigger webhooks for an event - schedules action for delivery
 */
export const trigger = internalMutation({
  args: {
    event: v.string(),
    data: v.any(),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    // Schedule webhook delivery action
    await ctx.scheduler.runAfter(0, api.webhooks_actions.scheduleWebhooks, {
      event: args.event,
      payload: args.data,
      agentId: args.agentId,
    });
  },
});

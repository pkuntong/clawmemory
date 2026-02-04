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
 * Trigger webhooks for an event
 */
export const trigger = internalMutation({
  args: {
    event: v.string(),
    data: v.any(),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    // Find all webhooks subscribed to this event
    const allWebhooks = await ctx.db.query("webhooks").collect();
    const matchingWebhooks = allWebhooks.filter(
      w => w.active && w.events.includes(args.event)
    );

    // Filter by agent if specified
    const webhooks = args.agentId
      ? matchingWebhooks.filter(w => w.agentId === args.agentId)
      : matchingWebhooks;

    // Schedule webhook deliveries (in production, use an action for HTTP calls)
    for (const webhook of webhooks) {
      console.log(`Would trigger webhook ${webhook._id} for event ${args.event}`);
      // In production: schedule action to POST to webhook.url
    }
  },
});

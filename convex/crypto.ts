"use node";

/**
 * Node.js crypto utilities for ClawMemory
 * 
 * This file uses the "use node" directive to access Node.js built-in modules.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate a new API key
 */
export const generateApiKey = action({
  args: {},
  handler: async () => {
    const crypto = await import("crypto");
    const apiKey = `claw_${crypto.randomBytes(32).toString("hex")}`;
    const apiKeyHash = crypto
      .createHash("sha256")
      .update(apiKey)
      .digest("hex");
    
    return { apiKey, apiKeyHash };
  },
});

/**
 * Hash an API key for storage
 */
export const hashApiKey = action({
  args: { apiKey: v.string() },
  handler: async (_ctx, args) => {
    const crypto = await import("crypto");
    return crypto.createHash("sha256").update(args.apiKey).digest("hex");
  },
});

/**
 * Generate HMAC signature for webhooks
 */
export const generateWebhookSignature = action({
  args: {
    payload: v.string(),
    secret: v.string(),
  },
  handler: async (_ctx, args) => {
    const crypto = await import("crypto");
    return crypto
      .createHmac("sha256", args.secret)
      .update(args.payload)
      .digest("hex");
  },
});

/**
 * Generate UUID for webhook deliveries
 */
export const generateUUID = action({
  args: {},
  handler: async () => {
    const crypto = await import("crypto");
    return crypto.randomUUID();
  },
});

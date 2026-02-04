/**
 * Webhook client for ClawMemory
 * 
 * Manage webhook endpoints for real-time notifications.
 * 
 * @example
 * ```typescript
 * const webhooks = new ClawMemoryWebhooks({ apiKey: 'your_key' });
 * 
 * // Register a webhook
 * await webhooks.register({
 *   url: 'https://your-app.com/webhooks/clawmemory',
 *   events: ['memory.created', 'agent.status_changed'],
 * });
 * ```
 */

import { ClientOptions, WebhookEvent } from './types';
import { ClawMemoryError, AuthenticationError } from './errors';

export interface WebhookRegistration {
  url: string;
  events: string[];
  secret?: string;
  metadata?: Record<string, unknown>;
}

export interface Webhook {
  _id: string;
  agentId: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: number;
  lastSuccess?: number;
  lastFailure?: number;
  failureCount: number;
}

export class ClawMemoryWebhooks {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: ClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl?.replace(/\/$/, '') || 'http://localhost:5173';

    if (!this.apiKey) {
      throw new AuthenticationError('API key is required');
    }
  }

  /**
   * Register a new webhook endpoint
   */
  async register(options: WebhookRegistration): Promise<{ webhookId: string }> {
    const response = await fetch(`${this.baseUrl}/api/webhooks/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ClawMemoryError(
        error.error || 'Failed to register webhook',
        error.code,
        response.status
      );
    }

    return await response.json();
  }

  /**
   * List all webhooks for the authenticated agent
   */
  async list(): Promise<Webhook[]> {
    const response = await fetch(`${this.baseUrl}/api/webhooks`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ClawMemoryError(
        error.error || 'Failed to list webhooks',
        error.code,
        response.status
      );
    }

    const result = await response.json();
    return result.webhooks;
  }

  /**
   * Delete a webhook
   */
  async delete(webhookId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ClawMemoryError(
        error.error || 'Failed to delete webhook',
        error.code,
        response.status
      );
    }
  }

  /**
   * Verify a webhook signature (for receivers)
   * 
   * @example
   * ```typescript
   * // In your webhook handler
   * const isValid = ClawMemoryWebhooks.verifySignature(
   *   request.body,
   *   request.headers['x-clawmemory-signature'],
   *   'your_webhook_secret'
   * );
   * ```
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    // In production, implement HMAC verification
    // This is a simplified example
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }
}

export { WebhookEvent };

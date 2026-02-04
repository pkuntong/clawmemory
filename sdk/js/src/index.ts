/**
 * ClawMemory JavaScript/TypeScript SDK
 * 
 * The official client for ClawMemory - The AI Collective Consciousness
 * 
 * @example
 * ```typescript
 * import { ClawMemoryClient } from '@clawmemory/sdk';
 * 
 * const client = new ClawMemoryClient({ apiKey: 'your_api_key' });
 * 
 * // Store a memory
 * const memoryId = await client.storeMemory({
 *   content: 'Users prefer dark mode interfaces',
 *   type: 'insight',
 *   quality: 5,
 * });
 * 
 * // Query the collective
 * const results = await client.query('What do we know about users?');
 * ```
 */

export { ClawMemoryClient } from './client';
export { ClawMemoryRealtime } from './realtime';
export { ClawMemoryWebhooks } from './webhooks';
export { 
  ClawMemoryError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
} from './errors';
export type {
  Memory,
  Agent,
  Connection,
  QueryResult,
  MemoryType,
  AgentStatus,
  StoreMemoryOptions,
  QueryOptions,
  SearchOptions,
  ClientOptions,
  RealtimeOptions,
  WebhookEvent,
} from './types';

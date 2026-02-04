/**
 * Core client for ClawMemory API
 */

import {
  ClientOptions,
  Memory,
  Agent,
  QueryResult,
  StoreMemoryOptions,
  BulkMemoryItem,
  BulkStoreResult,
  QueryOptions,
  SearchOptions,
  PaginationOptions,
  HealthStatus,
  AgentRegistrationResult,
  MemoryType,
  AgentStatus,
} from './types';
import {
  ClawMemoryError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  ServerError,
  NetworkError,
} from './errors';

export class ClawMemoryClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  /**
   * Create a new ClawMemory client
   * 
   * @example
   * ```typescript
   * const client = new ClawMemoryClient({
   *   apiKey: 'your_api_key',
   *   baseUrl: 'http://localhost:5173',
   * });
   * ```
   */
  constructor(options: ClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl?.replace(/\/$/, '') || 'http://localhost:5173';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;

    if (!this.apiKey) {
      throw new AuthenticationError('API key is required');
    }
  }

  /**
   * Get the API key from environment variable
   */
  static getApiKeyFromEnv(): string | undefined {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.CLAWMEMORY_API_KEY;
    }
    if (typeof window !== 'undefined') {
      // In browser, check for global variable (not recommended for production)
      return (window as any).__CLAWMEMORY_API_KEY__;
    }
    return undefined;
  }

  /**
   * Get the base URL from environment variable
   */
  static getBaseUrlFromEnv(): string | undefined {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.CLAWMEMORY_URL;
    }
    return undefined;
  }

  /**
   * Create a client from environment variables
   */
  static fromEnv(): ClawMemoryClient {
    const apiKey = this.getApiKeyFromEnv();
    const baseUrl = this.getBaseUrlFromEnv();
    
    if (!apiKey) {
      throw new AuthenticationError(
        'CLAWMEMORY_API_KEY environment variable is not set'
      );
    }
    
    return new ClawMemoryClient({ apiKey, baseUrl });
  }

  /**
   * Make an HTTP request to the API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': '@clawmemory/sdk/1.0.0',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle errors
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json() as T;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ClawMemoryError) {
        throw error;
      }

      // Handle network errors with retry
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        const delay = Math.pow(2, retryCount) * 1000;
        await this.sleep(delay);
        return this.request<T>(method, endpoint, body, retryCount + 1);
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(
          `Could not connect to ClawMemory at ${this.baseUrl}. Is the server running?`
        );
      }

      throw new ClawMemoryError(
        error instanceof Error ? error.message : 'Request failed'
      );
    }
  }

  /**
   * Handle error responses from the API
   */
  private async handleErrorResponse(response: Response): Promise<void> {
    let errorData: { error?: string; code?: string } = {};
    
    try {
      errorData = await response.json();
    } catch {
      // Ignore JSON parse errors
    }

    const message = errorData.error || `HTTP ${response.status}`;
    const code = errorData.code;

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message);
      case 403:
        throw new AuthenticationError(message);
      case 404:
        throw new NotFoundError();
      case 409:
        throw new ValidationError(message);
      case 429:
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(message, retryAfter ? parseInt(retryAfter) : undefined);
      case 500:
      case 502:
      case 503:
      case 504:
        throw new ServerError(message);
      default:
        throw new ClawMemoryError(message, code, response.status);
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof TypeError) {
      return true; // Network errors
    }
    return false;
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== Memory Operations ====================

  /**
   * Store a memory in the collective consciousness
   * 
   * @example
   * ```typescript
   * const memoryId = await client.storeMemory({
   *   content: 'Users prefer dark mode interfaces',
   *   type: 'insight',
   *   quality: 5,
   *   tags: ['ux', 'design'],
   * });
   * ```
   */
  async storeMemory(options: StoreMemoryOptions): Promise<string> {
    // Validation
    if (!options.content || options.content.trim().length === 0) {
      throw new ValidationError('Content cannot be empty');
    }
    if (options.content.length > 10000) {
      throw new ValidationError('Content too long (max 10,000 characters)');
    }
    if (options.quality !== undefined && (options.quality < 1 || options.quality > 5)) {
      throw new ValidationError('Quality must be between 1 and 5');
    }

    const result = await this.request<{
      success: boolean;
      memoryId: string;
      agent: { id: string; name: string };
      timestamp: number;
    }>('POST', '/memories', {
      content: options.content,
      type: options.type,
      quality: options.quality ?? 3,
      tags: options.tags || [],
      summary: options.summary,
      embedding: options.embedding,
      autoConnect: options.autoConnect ?? true,
    });

    return result.memoryId;
  }

  /**
   * Store multiple memories in bulk
   * 
   * @example
   * ```typescript
   * const result = await client.storeMemories([
   *   { content: 'Insight 1', type: 'insight', quality: 4 },
   *   { content: 'Learning 1', type: 'learning', quality: 5 },
   * ]);
   * ```
   */
  async storeMemories(memories: BulkMemoryItem[]): Promise<BulkStoreResult> {
    if (!memories || memories.length === 0) {
      throw new ValidationError('Memories array cannot be empty');
    }
    if (memories.length > 100) {
      throw new ValidationError('Maximum 100 memories per bulk request');
    }

    return await this.request<BulkStoreResult>('POST', '/memories/bulk', {
      memories,
    });
  }

  /**
   * Search memories using semantic/keyword search
   * 
   * @example
   * ```typescript
   * const results = await client.search('user preferences dark mode');
   * ```
   */
  async search(query: string, options: SearchOptions = {}): Promise<Memory[]> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Query cannot be empty');
    }

    const result = await this.request<{
      query: string;
      results: Memory[];
      count: number;
      agent: Agent;
    }>('POST', '/memories/search', {
      query,
      limit: Math.min(options.limit || 20, 100),
      type: options.type,
      agentId: options.agentId,
    });

    return result.results;
  }

  /**
   * Retrieve memories from the collective
   * 
   * @example
   * ```typescript
   * const memories = await client.getMemories({ limit: 50 });
   * ```
   */
  async getMemories(options: PaginationOptions & { agentId?: string; type?: MemoryType } = {}): Promise<Memory[]> {
    const params = new URLSearchParams();
    params.set('limit', String(Math.min(options.limit || 20, 100)));
    params.set('offset', String(options.offset || 0));
    if (options.agentId) params.set('agentId', options.agentId);
    if (options.type) params.set('type', options.type);

    const result = await this.request<{
      memories: Memory[];
      pagination: { limit: number; offset: number; total: number };
      agent: Agent;
    }>('GET', `/memories?${params.toString()}`);

    return result.memories;
  }

  /**
   * Get memories related to a specific memory
   * 
   * @example
   * ```typescript
   * const related = await client.getRelatedMemories('mem_abc123...');
   * ```
   */
  async getRelatedMemories(memoryId: string): Promise<Memory[]> {
    const result = await this.request<{
      memoryId: string;
      related: Memory[];
      count: number;
    }>('GET', `/memories/${memoryId}/related`);

    return result.related;
  }

  // ==================== Collective Query ====================

  /**
   * Perform an intelligent query on the collective consciousness
   * 
   * This is the most powerful method - it understands context and returns
   * insights, not just raw memories.
   * 
   * @example
   * ```typescript
   * const result = await client.query(
   *   'What patterns have we observed about user engagement?',
   *   { limit: 10 }
   * );
   * 
   * for (const insight of result.insights) {
   *   console.log('💡', insight);
   * }
   * ```
   */
  async query(query: string, options: QueryOptions = {}): Promise<QueryResult> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Query cannot be empty');
    }

    return await this.request<QueryResult>('POST', '/query', {
      query,
      context: options.context || {},
      limit: Math.min(options.limit || 10, 50),
      includeConnections: options.includeConnections ?? true,
    });
  }

  // ==================== Agent Operations ====================

  /**
   * Get information about the authenticated agent
   */
  async getAgentInfo(): Promise<Agent> {
    const result = await this.request<{ agent: Agent }>('GET', '/agents/me');
    return result.agent;
  }

  /**
   * Update the agent's status
   * 
   * @example
   * ```typescript
   * await client.updateStatus('active');
   * ```
   */
  async updateStatus(status: AgentStatus): Promise<void> {
    await this.request('POST', '/agents/status', { status });
  }

  /**
   * Check API health status
   */
  async healthCheck(): Promise<HealthStatus> {
    return await this.request<HealthStatus>('GET', '/health');
  }

  // ==================== Static Methods ====================

  /**
   * Register a new agent and get an API key
   * 
   * Note: This method does not require authentication
   * 
   * @example
   * ```typescript
   * const result = await ClawMemoryClient.registerAgent({
   *   name: 'MyAIAssistant',
   *   description: 'An AI assistant',
   *   baseUrl: 'http://localhost:5173',
   * });
   * 
   * // Save the API key securely!
   * console.log(result.apiKey);
   * ```
   */
  static async registerAgent(options: {
    name: string;
    description?: string;
    baseUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AgentRegistrationResult> {
    const baseUrl = options.baseUrl?.replace(/\/$/, '') || 'http://localhost:5173';

    const response = await fetch(`${baseUrl}/api/agents/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: options.name,
        description: options.description,
        metadata: options.metadata,
      }),
    });

    if (response.status === 409) {
      throw new ValidationError(`Agent '${options.name}' already exists`);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ClawMemoryError(
        error.error || 'Registration failed',
        error.code,
        response.status
      );
    }

    const result = await response.json() as {
      success: boolean;
      agent: { id: string; name: string; apiKey: string };
    };

    return {
      agentId: result.agent.id,
      apiKey: result.agent.apiKey,
      name: result.agent.name,
    };
  }
}

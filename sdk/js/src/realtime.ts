/**
 * Real-time client for ClawMemory using Server-Sent Events
 * 
 * Provides live updates for:
 * - New memories from connected agents
 * - Status changes
 * - Memory connections
 * 
 * @example
 * ```typescript
 * import { ClawMemoryRealtime } from '@clawmemory/sdk';
 * 
 * const realtime = new ClawMemoryRealtime({
 *   apiKey: 'your_api_key',
 * });
 * 
 * realtime.on('memory.created', (event) => {
 *   console.log('New memory:', event.data);
 * });
 * 
 * realtime.connect();
 * ```
 */

import { EventEmitter } from 'eventemitter3';
import { RealtimeOptions, WebhookEvent, Memory, Agent } from './types';
import { AuthenticationError, NetworkError } from './errors';

export interface RealtimeEvent {
  type: string;
  timestamp: number;
  data: Memory | Agent | unknown;
}

type EventHandlers = {
  'memory.created': (event: { data: Memory }) => void;
  'memory.updated': (event: { data: Memory }) => void;
  'memory.connected': (event: { data: { source: Memory; target: Memory; strength: number } }) => void;
  'agent.status_changed': (event: { data: Agent }) => void;
  'connected': () => void;
  'disconnected': () => void;
  'error': (error: Error) => void;
};

export class ClawMemoryRealtime extends EventEmitter<EventHandlers> {
  private apiKey: string;
  private baseUrl: string;
  private autoReconnect: boolean;
  private reconnectInterval: number;
  private eventSource: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  /**
   * Create a new realtime connection
   */
  constructor(options: RealtimeOptions) {
    super();
    
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl?.replace(/\/$/, '') || 'http://localhost:5173';
    this.autoReconnect = options.autoReconnect ?? true;
    this.reconnectInterval = options.reconnectInterval || 5000;

    if (!this.apiKey) {
      throw new AuthenticationError('API key is required');
    }
  }

  /**
   * Connect to the realtime stream
   */
  connect(): void {
    if (this.isConnected) {
      console.warn('Already connected to realtime stream');
      return;
    }

    try {
      const url = `${this.baseUrl}/api/stream?apiKey=${encodeURIComponent(this.apiKey)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RealtimeEvent;
          this.handleEvent(data);
        } catch (error) {
          this.emit('error', error instanceof Error ? error : new Error('Failed to parse event'));
        }
      };

      this.eventSource.onerror = (error) => {
        this.emit('error', new NetworkError('Realtime connection error'));
        this.handleDisconnect();
      };

    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error('Failed to connect'));
      this.handleDisconnect();
    }
  }

  /**
   * Disconnect from the realtime stream
   */
  disconnect(): void {
    this.autoReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.isConnected) {
      this.isConnected = false;
      this.emit('disconnected');
    }
  }

  /**
   * Check if currently connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Handle incoming events
   */
  private handleEvent(event: RealtimeEvent): void {
    switch (event.type) {
      case 'memory.created':
        this.emit('memory.created', { data: event.data as Memory });
        break;
      case 'memory.updated':
        this.emit('memory.updated', { data: event.data as Memory });
        break;
      case 'memory.connected':
        this.emit('memory.connected', { 
          data: event.data as { source: Memory; target: Memory; strength: number }
        });
        break;
      case 'agent.status_changed':
        this.emit('agent.status_changed', { data: event.data as Agent });
        break;
      default:
        // Emit generic event for unknown types
        this.emit(event.type as any, event.data);
    }
  }

  /**
   * Handle disconnection and reconnect if enabled
   */
  private handleDisconnect(): void {
    this.isConnected = false;
    this.emit('disconnected');

    if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
        30000 // Max 30 seconds
      );
      
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  /**
   * Subscribe to specific memory types
   * 
   * @example
   * ```typescript
   * const unsubscribe = realtime.subscribeToType('insight', (memory) => {
   *   console.log('New insight:', memory.content);
   * });
   * 
   * // Later...
   * unsubscribe();
   * ```
   */
  subscribeToType<T extends Memory>(
    type: Memory['type'],
    callback: (memory: T) => void
  ): () => void {
    const handler = (event: { data: Memory }) => {
      if (event.data.type === type) {
        callback(event.data as T);
      }
    };

    this.on('memory.created', handler);
    
    return () => {
      this.off('memory.created', handler);
    };
  }

  /**
   * Subscribe to a specific agent's activities
   * 
   * @example
   * ```typescript
   * const unsubscribe = realtime.subscribeToAgent('agent_id', (memory) => {
   *   console.log('Agent activity:', memory);
   * });
   * ```
   */
  subscribeToAgent(
    agentId: string,
    callback: (memory: Memory) => void
  ): () => void {
    const handler = (event: { data: Memory }) => {
      if (event.data.agentId === agentId) {
        callback(event.data);
      }
    };

    this.on('memory.created', handler);
    
    return () => {
      this.off('memory.created', handler);
    };
  }

  /**
   * Wait for a specific event to occur
   * 
   * @example
   * ```typescript
   * const event = await realtime.waitFor('memory.created', 5000);
   * console.log('New memory:', event.data);
   * ```
   */
  waitFor<T extends keyof EventHandlers>(
    event: T,
    timeout?: number
  ): Promise<Parameters<EventHandlers[T]>[0]> {
    return new Promise((resolve, reject) => {
      const handler = ((data: any) => {
        clearTimeout(timer);
        this.off(event, handler);
        resolve(data);
      }) as EventHandlers[T];

      this.on(event, handler);

      const timer = timeout ? setTimeout(() => {
        this.off(event, handler);
        reject(new Error(`Timeout waiting for ${event}`));
      }, timeout) : undefined;
    });
  }
}

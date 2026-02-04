/**
 * Type definitions for ClawMemory SDK
 */

export type MemoryType = 'insight' | 'experience' | 'learning' | 'pattern';
export type AgentStatus = 'active' | 'syncing' | 'idle';

export interface Memory {
  _id: string;
  agentId: string;
  agentName: string;
  type: MemoryType;
  content: string;
  quality: number;
  tags?: string[];
  summary?: string;
  embedding?: number[];
  createdAt: number;
  connectionCount?: number;
  connectionStrength?: number;
  connectionLabel?: string;
}

export interface Agent {
  _id: string;
  name: string;
  status: AgentStatus;
  description?: string;
  memoriesCount: number;
  lastActive: number;
  createdAt: number;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

export interface Connection {
  _id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  strength: number;
  label?: string;
  connectionType?: string;
  similarityScore?: number;
  createdAt: number;
}

export interface QueryResult {
  query: string;
  memories: Memory[];
  connections?: Connection[];
  insights: string[];
  suggestedActions: string[];
  agent?: Agent;
}

export interface StoreMemoryOptions {
  content: string;
  type: MemoryType;
  quality?: number;
  tags?: string[];
  summary?: string;
  embedding?: number[];
  autoConnect?: boolean;
}

export interface BulkMemoryItem {
  content: string;
  type: MemoryType;
  quality?: number;
  tags?: string[];
}

export interface BulkStoreResult {
  success: boolean;
  stored: number;
  failed: number;
  memoryIds: string[];
  errors: Array<{ index: number; error: string }>;
}

export interface QueryOptions {
  context?: Record<string, unknown>;
  limit?: number;
  includeConnections?: boolean;
}

export interface SearchOptions {
  type?: MemoryType;
  agentId?: string;
  limit?: number;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface RealtimeOptions {
  apiKey: string;
  baseUrl?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export interface WebhookEvent {
  type: 'memory.created' | 'memory.updated' | 'memory.connected' | 'agent.status_changed';
  timestamp: number;
  data: unknown;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: number;
}

export interface AgentRegistrationResult {
  agentId: string;
  apiKey: string;
  name: string;
}

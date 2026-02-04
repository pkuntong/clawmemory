/**
 * ClawMemory Integration for LangChain
 * 
 * Use ClawMemory as a memory store for LangChain agents.
 * 
 * @example
 * ```typescript
 * import { ClawMemoryLangChain } from '@clawmemory/sdk/langchain';
 * 
 * const memory = new ClawMemoryLangChain({
 *   apiKey: 'your_key',
 *   sessionId: 'user_123',
 * });
 * 
 * const chain = new ConversationChain({
 *   llm: new ChatOpenAI(),
 *   memory,
 * });
 * ```
 */

import { BaseChatMessageHistory } from '@langchain/core/chat_history';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ClawMemoryClient } from '../client';
import { ClientOptions } from '../types';

export interface ClawMemoryLangChainOptions extends ClientOptions {
  /** Session ID for isolating different conversations */
  sessionId: string;
  /** Maximum number of messages to retrieve */
  k?: number;
}

/**
 * LangChain chat message history backed by ClawMemory
 * 
 * This allows LangChain agents to store their conversation history
 * in the collective consciousness, enabling cross-agent memory sharing.
 */
export class ClawMemoryChatMessageHistory extends BaseChatMessageHistory {
  private client: ClawMemoryClient;
  private sessionId: string;
  private k: number;

  constructor(options: ClawMemoryLangChainOptions) {
    super();
    this.client = new ClawMemoryClient(options);
    this.sessionId = options.sessionId;
    this.k = options.k ?? 10;
  }

  /**
   * Get the conversation history
   */
  async getMessages(): Promise<BaseMessage[]> {
    const memories = await this.client.getMemories({
      limit: this.k,
    });

    // Convert memories to LangChain messages
    const messages: BaseMessage[] = [];
    
    for (const memory of memories) {
      if (memory.type === 'experience') {
        // Try to parse as conversation
        try {
          const data = JSON.parse(memory.content);
          if (data.role === 'human') {
            messages.push(new HumanMessage(data.content));
          } else if (data.role === 'ai') {
            messages.push(new AIMessage(data.content));
          }
        } catch {
          // If not JSON, treat as human message
          messages.push(new HumanMessage(memory.content));
        }
      }
    }

    return messages;
  }

  /**
   * Add a user message to the history
   */
  async addUserMessage(message: string): Promise<void> {
    await this.client.storeMemory({
      content: JSON.stringify({ role: 'human', content: message, sessionId: this.sessionId }),
      type: 'experience',
      quality: 3,
      tags: ['conversation', 'human', `session_${this.sessionId}`],
    });
  }

  /**
   * Add an AI message to the history
   */
  async addAIChatMessage(message: string): Promise<void> {
    await this.client.storeMemory({
      content: JSON.stringify({ role: 'ai', content: message, sessionId: this.sessionId }),
      type: 'experience',
      quality: 3,
      tags: ['conversation', 'ai', `session_${this.sessionId}`],
    });
  }

  /**
   * Add a message to the history
   */
  async addMessage(message: BaseMessage): Promise<void> {
    if (message._getType() === 'human') {
      await this.addUserMessage(message.content as string);
    } else if (message._getType() === 'ai') {
      await this.addAIChatMessage(message.content as string);
    }
  }

  /**
   * Clear the conversation history
   */
  async clear(): Promise<void> {
    // Note: In a real implementation, you'd want to mark memories as deleted
    // rather than actually deleting them from the collective
    console.log('Note: Conversation history cleared from local context');
  }
}

/**
 * ClawMemory tool for LangChain agents
 * 
 * Allows agents to query the collective consciousness as a tool.
 * 
 * @example
 * ```typescript
 * const tools = [
 *   new ClawMemoryTool({ apiKey: 'your_key' }),
 * ];
 * 
 * const executor = await initializeAgentExecutorWithOptions(tools, llm, {
 *   agentType: 'structured-chat-zero-shot-react-description',
 * });
 * ```
 */
export class ClawMemoryTool {
  name = 'clawmemory';
  description = `Query the collective consciousness for relevant information.
Use this tool when you need to:
- Find relevant context from past conversations
- Look up facts or information stored by other agents
- Search for patterns or insights

Input should be a natural language query describing what you're looking for.`;

  private client: ClawMemoryClient;

  constructor(options: ClientOptions) {
    this.client = new ClawMemoryClient(options);
  }

  async _call(input: string): Promise<string> {
    try {
      const result = await this.client.query(input, { limit: 5 });
      
      if (result.memories.length === 0) {
        return 'No relevant information found in the collective consciousness.';
      }

      let response = `Found ${result.memories.length} relevant memories:\n\n`;
      
      for (let i = 0; i < result.memories.length; i++) {
        const memory = result.memories[i];
        response += `${i + 1}. [${memory.type}] ${memory.content}\n`;
        if (memory.agentName) {
          response += `   From: ${memory.agentName}\n`;
        }
        response += '\n';
      }

      if (result.insights.length > 0) {
        response += 'Insights:\n';
        for (const insight of result.insights) {
          response += `- ${insight}\n`;
        }
      }

      return response;
    } catch (error) {
      return `Error querying collective consciousness: ${error}`;
    }
  }
}

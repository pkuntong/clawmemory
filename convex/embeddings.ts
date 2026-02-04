import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Vector embedding and similarity search for semantic memory retrieval
 * 
 * Uses cosine similarity to find memories with similar semantic meaning.
 */

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Store embedding for a memory
 */
export const storeEmbedding = internalMutation({
  args: {
    memoryId: v.id("memories"),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memoryId, {
      embedding: args.embedding,
    });
  },
});

/**
 * Find similar memories using vector similarity
 */
export const findSimilar = internalQuery({
  args: {
    embedding: v.array(v.number()),
    limit: v.number(),
    threshold: v.optional(v.number()),
    excludeMemoryId: v.optional(v.id("memories")),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    // Get all memories with embeddings
    // Note: In production, you'd want to use a vector database like Pinecone
    // or pgvector for efficient similarity search
    const memories = await ctx.db
      .query("memories")
      .filter(q => q.neq(q.field("embedding"), undefined))
      .collect();

    // Calculate similarity scores
    const scored = memories
      .filter(m => m._id !== args.excludeMemoryId)
      .filter(m => !args.agentId || m.agentId === args.agentId)
      .map(memory => ({
        ...memory,
        similarity: cosineSimilarity(args.embedding, memory.embedding!),
      }))
      .filter(m => m.similarity >= (args.threshold ?? 0.7))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, args.limit);

    return scored;
  },
});

/**
 * Create semantic connections based on vector similarity
 */
export const createSemanticConnections = internalMutation({
  args: {
    memoryId: v.id("memories"),
    threshold: v.optional(v.number()),
    maxConnections: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);
    if (!memory || !memory.embedding) {
      return [];
    }

    // Find similar memories
    const similar = await ctx.runQuery(api.embeddings.findSimilar, {
      embedding: memory.embedding,
      limit: (args.maxConnections ?? 5) + 1, // +1 to account for self
      threshold: args.threshold ?? 0.75,
      excludeMemoryId: args.memoryId,
    });

    const connectionIds: string[] = [];

    for (const similarMemory of similar) {
      // Check if connection already exists
      const existing = await ctx.db
        .query("connections")
        .withIndex("by_source", (q) => 
          q.eq("sourceMemoryId", args.memoryId)
        )
        .filter(q => q.eq(q.field("targetMemoryId"), similarMemory._id))
        .first();

      if (!existing) {
        const connectionId = await ctx.db.insert("connections", {
          sourceMemoryId: args.memoryId,
          targetMemoryId: similarMemory._id,
          strength: similarMemory.similarity,
          label: "semantic",
          createdAt: Date.now(),
          connectionType: "semantic",
          similarityScore: similarMemory.similarity,
        });
        connectionIds.push(connectionId);
      }
    }

    return connectionIds;
  },
});

// Need to import api for the recursive call
import { api } from "../_generated/api";

/**
 * Generate embedding from text using external service
 * In production, this would call OpenAI, Cohere, or similar
 */
export const generateEmbedding = internalMutation({
  args: {
    memoryId: v.id("memories"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // This is a placeholder - in production you'd:
    // 1. Call OpenAI's embedding API or similar
    // 2. Store the result
    // 3. Create semantic connections

    // For now, we create a simple hash-based "embedding" for demo purposes
    // In production, replace with actual embedding generation
    const embedding = await createPlaceholderEmbedding(args.text);
    
    await ctx.db.patch(args.memoryId, {
      embedding,
    });

    // Create semantic connections
    await ctx.runMutation(api.embeddings.createSemanticConnections, {
      memoryId: args.memoryId,
    });

    return embedding;
  },
});

/**
 * Create a placeholder embedding for demo purposes
 * In production, use actual embedding model (OpenAI, Cohere, etc.)
 */
async function createPlaceholderEmbedding(text: string): Promise<number[]> {
  // Create a simple deterministic embedding based on text hash
  // This is NOT for production - replace with real embeddings!
  const hash = await hashString(text);
  const embedding: number[] = [];
  
  // Generate 384-dimensional vector (common embedding size)
  for (let i = 0; i < 384; i++) {
    // Use hash to generate pseudo-random but deterministic values
    const value = Math.sin(hash + i) * Math.cos(hash * (i + 1));
    embedding.push(value);
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return embedding.map(v => v / magnitude);
}

async function hashString(str: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.reduce((acc, byte, i) => acc + byte * Math.pow(256, i % 4), 0);
}

/**
 * Hybrid search combining text search with vector similarity
 */
export const hybridSearch = internalQuery({
  args: {
    query: v.string(),
    embedding: v.optional(v.array(v.number())),
    limit: v.number(),
    vectorWeight: v.optional(v.number()),
    textWeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get text search results
    const textResults = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => 
        q.search("content", args.query)
      )
      .take(args.limit * 2);

    // If we have an embedding, also do vector search
    let vectorResults: Array<typeof textResults[0] & { similarity: number }> = [];
    if (args.embedding) {
      vectorResults = await ctx.runQuery(api.embeddings.findSimilar, {
        embedding: args.embedding,
        limit: args.limit * 2,
        threshold: 0.6,
      });
    }

    // Combine and score results
    const textWeight = args.textWeight ?? 0.5;
    const vectorWeight = args.vectorWeight ?? 0.5;

    const combined = new Map<string, { memory: any; textScore: number; vectorScore: number }>();

    // Add text results
    textResults.forEach((memory, index) => {
      const score = 1 - (index / textResults.length); // Normalize to 0-1
      combined.set(memory._id, { memory, textScore: score, vectorScore: 0 });
    });

    // Add vector results
    vectorResults.forEach(memory => {
      const existing = combined.get(memory._id);
      if (existing) {
        existing.vectorScore = memory.similarity;
      } else {
        combined.set(memory._id, { memory, textScore: 0, vectorScore: memory.similarity });
      }
    });

    // Calculate combined scores
    const scored = Array.from(combined.values()).map(({ memory, textScore, vectorScore }) => ({
      ...memory,
      combinedScore: textScore * textWeight + vectorScore * vectorWeight,
      textScore,
      vectorScore,
    }));

    // Sort by combined score and return top results
    return scored
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, args.limit);
  },
});

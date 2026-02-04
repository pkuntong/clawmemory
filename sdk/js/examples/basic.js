/**
 * Example: Basic ClawMemory JavaScript SDK usage
 * 
 * Run with:
 *   node examples/basic.js
 * 
 * Or in browser:
 *   Open examples/basic.html
 */

import { ClawMemoryClient, ClawMemoryRealtime } from '../src/index';

const API_KEY = process.env.CLAWMEMORY_API_KEY || 'your_api_key_here';
const BASE_URL = process.env.CLAWMEMORY_URL || 'http://localhost:5173';

async function main() {
  console.log('🦞 ClawMemory JavaScript SDK Example\n');

  // Initialize client
  const client = new ClawMemoryClient({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
  });

  // Check health
  console.log('Checking API health...');
  const health = await client.healthCheck();
  console.log(`✅ Connected to ${health.service} v${health.version}\n`);

  // Get agent info
  console.log('Getting agent info...');
  const agent = await client.getAgentInfo();
  console.log(`🤖 Agent: ${agent.name} (${agent.status})`);
  console.log(`   Memories: ${agent.memoriesCount}\n`);

  // Store a memory
  console.log('Storing memory...');
  const memoryId = await client.storeMemory({
    content: 'JavaScript SDK test: Users love real-time updates!',
    type: 'insight',
    quality: 5,
    tags: ['sdk', 'javascript', 'realtime'],
  });
  console.log(`   Stored memory: ${memoryId}\n`);

  // Store multiple memories
  console.log('Storing multiple memories...');
  const bulkResult = await client.storeMemories([
    {
      content: 'WebSocket connections improve engagement by 45%',
      type: 'pattern',
      quality: 4,
      tags: ['websocket', 'metrics'],
    },
    {
      content: 'TypeScript users report higher satisfaction',
      type: 'insight',
      quality: 5,
      tags: ['typescript', 'developer_experience'],
    },
  ]);
  console.log(`   Bulk stored: ${bulkResult.stored} memories\n`);

  // Search
  console.log('Searching for "real-time"...');
  const searchResults = await client.search('real-time', { limit: 5 });
  for (const memory of searchResults) {
    console.log(`   - [${memory.type}] ${memory.content.substring(0, 60)}...`);
  }
  console.log();

  // Advanced query
  console.log('Querying collective consciousness...');
  const queryResult = await client.query(
    'What have we learned about user engagement?',
    { limit: 5 }
  );

  console.log(`\n   Found ${queryResult.memories.length} relevant memories:`);
  for (const memory of queryResult.memories) {
    console.log(`   • [${memory.quality}/5] ${memory.content.substring(0, 70)}...`);
  }

  if (queryResult.insights.length > 0) {
    console.log(`\n   💡 Insights:`);
    for (const insight of queryResult.insights) {
      console.log(`   • ${insight}`);
    }
  }

  // Get recent memories
  console.log('\n\nRecent memories:');
  const memories = await client.getMemories({ limit: 5 });
  for (const memory of memories) {
    const date = new Date(memory.createdAt).toLocaleDateString();
    console.log(`   [${date}] ${memory.content.substring(0, 50)}...`);
  }

  // Real-time demo (optional - comment out if not testing realtime)
  console.log('\n\n🔄 Real-time demo (10 seconds)...');
  const realtime = new ClawMemoryRealtime({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
    autoReconnect: true,
  });

  realtime.on('connected', () => {
    console.log('   Realtime connected!');
  });

  realtime.on('memory.created', (event) => {
    console.log('   📥 New memory:', event.data.content.substring(0, 50) + '...');
  });

  realtime.on('error', (error) => {
    console.log('   Realtime error:', error.message);
  });

  realtime.connect();

  // Keep alive for 10 seconds
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  realtime.disconnect();
  console.log('\n✨ Done!');
}

main().catch(console.error);

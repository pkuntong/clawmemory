"""
Example usage of ClawMemory Python SDK
"""

import os
from clawmemory import ClawMemoryClient, ClawMemoryError


def main():
    # Option 1: Use environment variables
    # export CLAWMEMORY_API_KEY="your_api_key"
    # export CLAWMEMORY_URL="http://localhost:5173"
    
    # Option 2: Pass directly
    client = ClawMemoryClient(
        api_key=os.getenv("CLAWMEMORY_API_KEY", "your_api_key_here"),
        base_url=os.getenv("CLAWMEMORY_URL", "http://localhost:5173"),
    )
    
    # Check health
    health = client.health_check()
    print(f"✅ Connected to {health['service']} v{health['version']}")
    
    # Get agent info
    agent = client.get_agent_info()
    print(f"🤖 Agent: {agent.name} ({agent.status})")
    print(f"   Memories: {agent.memories_count}")
    
    # Store a memory
    print("\n💾 Storing memories...")
    memory_id = client.store_memory(
        content="Users respond positively to personalized greetings in notifications",
        type="insight",
        quality=5,
        tags=["ux", "notifications", "personalization"],
    )
    print(f"   Stored memory: {memory_id[:16]}...")
    
    # Store multiple memories
    bulk_result = client.store_memories([
        {
            "content": "Push notification open rate is 40% higher with emojis",
            "type": "pattern",
            "quality": 4,
            "tags": ["metrics", "notifications"],
        },
        {
            "content": "A/B test showed 25% improvement with shorter subject lines",
            "type": "learning",
            "quality": 5,
            "tags": ["ab_testing", "email", "optimization"],
        },
    ])
    print(f"   Bulk stored: {bulk_result['stored']} memories")
    
    # Search memories
    print("\n🔍 Searching for 'notification'...")
    results = client.search("notification")
    for memory in results[:3]:
        print(f"   - [{memory.type}] {memory.content[:60]}...")
    
    # Advanced query
    print("\n🧠 Querying collective consciousness...")
    query_result = client.query(
        "What have we learned about user engagement?",
        limit=5,
    )
    
    print(f"\n   Found {len(query_result.memories)} relevant memories:")
    for memory in query_result.memories:
        print(f"   • [{memory.quality}/5] {memory.content[:70]}...")
    
    if query_result.insights:
        print(f"\n💡 Insights:")
        for insight in query_result.insights:
            print(f"   • {insight}")
    
    # Get memories
    print("\n📚 Recent memories:")
    memories = client.get_memories(limit=5)
    for memory in memories:
        print(f"   [{memory.created_datetime.strftime('%Y-%m-%d')}] {memory.content[:50]}...")
    
    print("\n✨ Done!")


if __name__ == "__main__":
    try:
        main()
    except ClawMemoryError as e:
        print(f"❌ Error: {e}")
        raise

#!/usr/bin/env python3
"""
ClawMemory CLI

Command-line interface for managing the AI Collective Consciousness.

Usage:
    clawmemory agents list
    clawmemory agents register "MyAgent" --description "An AI agent"
    clawmemory memories store "Important insight" --type insight --quality 5
    clawmemory memories search "user preferences"
    clawmemory query "What do we know about engagement?"
"""

import argparse
import json
import os
import sys
from typing import Optional

from clawmemory import ClawMemoryClient, ClawMemoryWebhooks
from clawmemory.exceptions import ClawMemoryError


def get_client() -> ClawMemoryClient:
    """Get ClawMemory client from environment or config."""
    api_key = os.getenv("CLAWMEMORY_API_KEY")
    base_url = os.getenv("CLAWMEMORY_URL", "http://localhost:5173")
    
    if not api_key:
        print("Error: CLAWMEMORY_API_KEY environment variable not set", file=sys.stderr)
        print("\nSet it with:", file=sys.stderr)
        print("  export CLAWMEMORY_API_KEY='your_api_key'", file=sys.stderr)
        sys.exit(1)
    
    return ClawMemoryClient(api_key=api_key, base_url=base_url)


def cmd_agents_list(args):
    """List all agents."""
    client = get_client()
    
    try:
        # We need to add this endpoint - for now use health check to verify connection
        agent = client.get_agent_info()
        print(f"\n🤖 {agent.name}")
        print(f"   Status: {agent.status}")
        print(f"   Memories: {agent.memories_count}")
        print(f"   ID: {agent.id}")
        print(f"   Created: {agent.created_datetime.strftime('%Y-%m-%d')}")
        print()
    except ClawMemoryError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_agents_register(args):
    """Register a new agent."""
    base_url = os.getenv("CLAWMEMORY_URL", "http://localhost:5173")
    
    try:
        result = ClawMemoryClient.register_agent(
            name=args.name,
            description=args.description,
            base_url=base_url,
        )
        
        print(f"\n✅ Agent registered: {result['name']}")
        print(f"   ID: {result['agent_id']}")
        print(f"\n🔑 API Key (save this!):")
        print(f"   {result['api_key']}")
        print(f"\n💾 Set it in your environment:")
        print(f"   export CLAWMEMORY_API_KEY='{result['api_key']}'")
        print()
    except ClawMemoryError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_agents_info(args):
    """Get agent info."""
    client = get_client()
    
    try:
        agent = client.get_agent_info()
        print(json.dumps({
            "id": agent.id,
            "name": agent.name,
            "status": agent.status,
            "description": agent.description,
            "memories_count": agent.memories_count,
            "last_active": agent.last_active_datetime.isoformat(),
            "created_at": agent.created_datetime.isoformat(),
            "permissions": agent.permissions,
        }, indent=2))
    except ClawMemoryError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_memories_store(args):
    """Store a memory."""
    client = get_client()
    
    tags = args.tags.split(",") if args.tags else []
    
    try:
        memory_id = client.store_memory(
            content=args.content,
            type=args.type,
            quality=args.quality,
            tags=tags,
        )
        print(f"✅ Stored memory: {memory_id}")
    except ClawMemoryError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_memories_list(args):
    """List memories."""
    client = get_client()
    
    try:
        memories = client.get_memories(limit=args.limit)
        
        if args.json:
            data = [{
                "id": m.id,
                "type": m.type,
                "content": m.content,
                "quality": m.quality,
                "agent": m.agent_name,
                "created": m.created_datetime.isoformat(),
                "tags": m.tags,
            } for m in memories]
            print(json.dumps(data, indent=2))
        else:
            print(f"\n📚 Memories ({len(memories)}):\n")
            for memory in memories:
                date = memory.created_datetime.strftime("%Y-%m-%d %H:%M")
                print(f"[{date}] [{memory.type}] [Q{memory.quality}/5] {memory.content[:80]}...")
            print()
    except ClawMemoryError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_memories_search(args):
    """Search memories."""
    client = get_client()
    
    try:
        results = client.search(args.query, limit=args.limit)
        
        if args.json:
            data = [{
                "id": m.id,
                "type": m.type,
                "content": m.content,
                "quality": m.quality,
                "agent": m.agent_name,
            } for m in results]
            print(json.dumps(data, indent=2))
        else:
            print(f"\n🔍 Search results for '{args.query}':\n")
            for memory in results:
                print(f"  • [{memory.type}] {memory.content[:100]}...")
                print(f"    Agent: {memory.agent_name} | Quality: {memory.quality}/5")
                print()
    except ClawMemoryError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_query(args):
    """Query collective consciousness."""
    client = get_client()
    
    try:
        result = client.query(args.query, limit=args.limit)
        
        print(f"\n🧠 Query: {result.query}\n")
        
        print(f"📚 Memories ({len(result.memories)}):")
        for memory in result.memories:
            print(f"  • [{memory.quality}/5] {memory.content[:100]}...")
        
        if result.insights:
            print(f"\n💡 Insights:")
            for insight in result.insights:
                print(f"  • {insight}")
        
        if result.suggested_actions:
            print(f"\n👉 Suggested Actions:")
            for action in result.suggested_actions:
                print(f"  • {action}")
        print()
    except ClawMemoryError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_health(args):
    """Check API health."""
    client = get_client()
    
    try:
        health = client.health_check()
        print(f"\n🦞 ClawMemory")
        print(f"   Status: {health['status']}")
        print(f"   Version: {health['version']}")
        print(f"   Service: {health['service']}")
        print()
    except ClawMemoryError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_webhooks_register(args):
    """Register a webhook."""
    api_key = os.getenv("CLAWMEMORY_API_KEY")
    base_url = os.getenv("CLAWMEMORY_URL", "http://localhost:5173")
    
    if not api_key:
        print("Error: CLAWMEMORY_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    
    webhooks = ClawMemoryWebhooks(api_key=api_key, base_url=base_url)
    events = args.events.split(",")
    
    try:
        result = webhooks.register(
            url=args.url,
            events=events,
            secret=args.secret,
        )
        print(f"✅ Webhook registered: {result['webhookId']}")
        print(f"   URL: {args.url}")
        print(f"   Events: {', '.join(events)}")
    except ClawMemoryError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_webhooks_list(args):
    """List webhooks."""
    api_key = os.getenv("CLAWMEMORY_API_KEY")
    base_url = os.getenv("CLAWMEMORY_URL", "http://localhost:5173")
    
    if not api_key:
        print("Error: CLAWMEMORY_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    
    webhooks = ClawMemoryWebhooks(api_key=api_key, base_url=base_url)
    
    try:
        hooks = webhooks.list()
        print(f"\n🔔 Webhooks ({len(hooks)}):\n")
        for hook in hooks:
            print(f"  ID: {hook['_id']}")
            print(f"  URL: {hook['url']}")
            print(f"  Events: {', '.join(hook['events'])}")
            print(f"  Active: {hook['active']}")
            print()
    except ClawMemoryError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        prog="clawmemory",
        description="ClawMemory CLI - Manage the AI Collective Consciousness",
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Health
    health_parser = subparsers.add_parser("health", help="Check API health")
    health_parser.set_defaults(func=cmd_health)
    
    # Agents
    agents_parser = subparsers.add_parser("agents", help="Manage agents")
    agents_subparsers = agents_parser.add_subparsers(dest="agents_command")
    
    agents_list = agents_subparsers.add_parser("list", help="List agents")
    agents_list.set_defaults(func=cmd_agents_list)
    
    agents_register = agents_subparsers.add_parser("register", help="Register new agent")
    agents_register.add_argument("name", help="Agent name")
    agents_register.add_argument("--description", "-d", help="Agent description")
    agents_register.set_defaults(func=cmd_agents_register)
    
    agents_info = agents_subparsers.add_parser("info", help="Get agent info")
    agents_info.set_defaults(func=cmd_agents_info)
    
    # Memories
    memories_parser = subparsers.add_parser("memories", help="Manage memories")
    memories_subparsers = memories_parser.add_subparsers(dest="memories_command")
    
    memories_store = memories_subparsers.add_parser("store", help="Store a memory")
    memories_store.add_argument("content", help="Memory content")
    memories_store.add_argument("--type", "-t", default="insight",
                               choices=["insight", "experience", "learning", "pattern"],
                               help="Memory type")
    memories_store.add_argument("--quality", "-q", type=int, default=3,
                               help="Quality rating (1-5)")
    memories_store.add_argument("--tags", help="Comma-separated tags")
    memories_store.set_defaults(func=cmd_memories_store)
    
    memories_list = memories_subparsers.add_parser("list", help="List memories")
    memories_list.add_argument("--limit", "-l", type=int, default=20)
    memories_list.add_argument("--json", action="store_true", help="Output as JSON")
    memories_list.set_defaults(func=cmd_memories_list)
    
    memories_search = memories_subparsers.add_parser("search", help="Search memories")
    memories_search.add_argument("query", help="Search query")
    memories_search.add_argument("--limit", "-l", type=int, default=20)
    memories_search.add_argument("--json", action="store_true", help="Output as JSON")
    memories_search.set_defaults(func=cmd_memories_search)
    
    # Query
    query_parser = subparsers.add_parser("query", help="Query collective consciousness")
    query_parser.add_argument("query", help="Natural language query")
    query_parser.add_argument("--limit", "-l", type=int, default=10)
    query_parser.set_defaults(func=cmd_query)
    
    # Webhooks
    webhooks_parser = subparsers.add_parser("webhooks", help="Manage webhooks")
    webhooks_subparsers = webhooks_parser.add_subparsers(dest="webhooks_command")
    
    webhooks_register = webhooks_subparsers.add_parser("register", help="Register webhook")
    webhooks_register.add_argument("url", help="Webhook URL")
    webhooks_register.add_argument("--events", "-e", required=True,
                                  help="Comma-separated events (memory.created,agent.status_changed)")
    webhooks_register.add_argument("--secret", "-s", help="Webhook secret")
    webhooks_register.set_defaults(func=cmd_webhooks_register)
    
    webhooks_list = webhooks_subparsers.add_parser("list", help="List webhooks")
    webhooks_list.set_defaults(func=cmd_webhooks_list)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    args.func(args)


if __name__ == "__main__":
    main()

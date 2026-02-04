"""
Data models for ClawMemory SDK
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from datetime import datetime


@dataclass
class Memory:
    """Represents a memory in the collective consciousness."""
    
    id: str
    agent_id: str
    agent_name: str
    type: str
    content: str
    quality: int
    created_at: int
    tags: Optional[List[str]] = None
    summary: Optional[str] = None
    embedding: Optional[List[float]] = None
    connection_count: Optional[int] = None
    connection_strength: Optional[float] = None
    connection_label: Optional[str] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Memory":
        """Create Memory from API response dict."""
        return cls(
            id=data.get("_id", data.get("id", "")),
            agent_id=data.get("agentId", data.get("agent_id", "")),
            agent_name=data.get("agentName", data.get("agent_name", "")),
            type=data.get("type", ""),
            content=data.get("content", ""),
            quality=data.get("quality", 3),
            created_at=data.get("createdAt", data.get("created_at", 0)),
            tags=data.get("tags"),
            summary=data.get("summary"),
            embedding=data.get("embedding"),
            connection_count=data.get("connectionCount"),
            connection_strength=data.get("connectionStrength"),
            connection_label=data.get("connectionLabel"),
        )
    
    @property
    def created_datetime(self) -> datetime:
        """Get creation time as datetime object."""
        return datetime.fromtimestamp(self.created_at / 1000)
    
    def __repr__(self) -> str:
        preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"<Memory {self.id[:8]}: {self.type} - {preview}>"


@dataclass
class Agent:
    """Represents an agent in the collective."""
    
    id: str
    name: str
    status: str
    memories_count: int
    last_active: int
    created_at: int
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Agent":
        """Create Agent from API response dict."""
        return cls(
            id=data.get("_id", data.get("id", "")),
            name=data.get("name", ""),
            status=data.get("status", "idle"),
            memories_count=data.get("memoriesCount", data.get("memories_count", 0)),
            last_active=data.get("lastActive", data.get("last_active", 0)),
            created_at=data.get("createdAt", data.get("created_at", 0)),
            description=data.get("description"),
            permissions=data.get("permissions", []),
            metadata=data.get("metadata", {}),
        )
    
    @property
    def last_active_datetime(self) -> datetime:
        """Get last active time as datetime object."""
        return datetime.fromtimestamp(self.last_active / 1000)
    
    @property
    def created_datetime(self) -> datetime:
        """Get creation time as datetime object."""
        return datetime.fromtimestamp(self.created_at / 1000)
    
    def __repr__(self) -> str:
        return f"<Agent {self.id[:8]}: {self.name} ({self.status})>"


@dataclass
class Connection:
    """Represents a connection between memories."""
    
    id: str
    source_memory_id: str
    target_memory_id: str
    strength: float
    created_at: int
    label: Optional[str] = None
    connection_type: Optional[str] = None
    similarity_score: Optional[float] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Connection":
        """Create Connection from API response dict."""
        return cls(
            id=data.get("_id", data.get("id", "")),
            source_memory_id=data.get("sourceMemoryId", data.get("source_memory_id", "")),
            target_memory_id=data.get("targetMemoryId", data.get("target_memory_id", "")),
            strength=data.get("strength", 0.5),
            created_at=data.get("createdAt", data.get("created_at", 0)),
            label=data.get("label"),
            connection_type=data.get("connectionType", data.get("connection_type")),
            similarity_score=data.get("similarityScore", data.get("similarity_score")),
        )
    
    def __repr__(self) -> str:
        return f"<Connection {self.id[:8]}: {self.strength:.2f}>"


@dataclass
class QueryResult:
    """Result of a collective consciousness query."""
    
    query: str
    memories: List[Memory]
    insights: List[str]
    suggested_actions: List[str]
    connections: Optional[List[Connection]] = None
    agent: Optional[Agent] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QueryResult":
        """Create QueryResult from API response dict."""
        memories = [Memory.from_dict(m) for m in data.get("memories", [])]
        connections = None
        if data.get("connections"):
            connections = [Connection.from_dict(c) for c in data["connections"]]
        agent = None
        if data.get("agent"):
            agent = Agent.from_dict(data["agent"])
        
        return cls(
            query=data.get("query", ""),
            memories=memories,
            insights=data.get("insights", []),
            suggested_actions=data.get("suggestedActions", []),
            connections=connections,
            agent=agent,
        )
    
    def __repr__(self) -> str:
        return f"<QueryResult: '{self.query[:30]}...' - {len(self.memories)} memories>"

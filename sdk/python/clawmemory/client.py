"""
Core client for ClawMemory API
"""

import json
import os
from typing import Optional, List, Dict, Any, Literal
from urllib.parse import urljoin
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .exceptions import (
    ClawMemoryError,
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    ValidationError,
)
from .models import Memory, Agent, QueryResult


class ClawMemoryClient:
    """
    Client for interacting with the ClawMemory collective consciousness.
    
    Args:
        api_key: Your ClawMemory API key
        base_url: The ClawMemory API URL (defaults to env var or localhost)
        timeout: Request timeout in seconds (default: 30)
        max_retries: Maximum number of retries for failed requests (default: 3)
    
    Example:
        client = ClawMemoryClient(api_key="claw_...")
        
        # Store a memory
        memory_id = client.store_memory(
            content="Important insight about user behavior",
            type="insight"
        )
        
        # Query collective knowledge
        results = client.query("What do we know about users?")
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
    ):
        self.api_key = api_key or os.getenv("CLAWMEMORY_API_KEY")
        if not self.api_key:
            raise AuthenticationError(
                "API key required. Provide it as an argument or set CLAWMEMORY_API_KEY environment variable."
            )
        
        self.base_url = base_url or os.getenv(
            "CLAWMEMORY_URL", 
            "http://localhost:5173"
        )
        self.timeout = timeout
        
        # Setup session with retries
        self.session = requests.Session()
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Default headers
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": f"clawmemory-python/{self._get_version()}",
        })
    
    def _get_version(self) -> str:
        """Get SDK version."""
        try:
            from importlib.metadata import version
            return version("clawmemory")
        except:
            return "1.0.0"
    
    def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Make an HTTP request to the API."""
        url = urljoin(self.base_url, f"/api{endpoint}")
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                timeout=self.timeout,
                **kwargs
            )
            
            # Handle specific status codes
            if response.status_code == 401:
                raise AuthenticationError("Invalid API key")
            elif response.status_code == 403:
                raise AuthenticationError("Insufficient permissions")
            elif response.status_code == 404:
                raise NotFoundError("Resource not found")
            elif response.status_code == 429:
                raise RateLimitError("Rate limit exceeded")
            elif response.status_code == 409:
                raise ValidationError("Resource already exists")
            elif response.status_code >= 400:
                try:
                    error_data = response.json()
                    raise ClawMemoryError(
                        error_data.get("error", "Unknown error"),
                        code=error_data.get("code"),
                        status_code=response.status_code,
                    )
                except json.JSONDecodeError:
                    raise ClawMemoryError(
                        f"HTTP {response.status_code}: {response.text}",
                        status_code=response.status_code,
                    )
            
            return response.json()
            
        except requests.exceptions.Timeout:
            raise ClawMemoryError("Request timed out")
        except requests.exceptions.ConnectionError:
            raise ClawMemoryError(
                f"Could not connect to ClawMemory at {self.base_url}. "
                "Is the server running?"
            )
        except requests.exceptions.RequestException as e:
            raise ClawMemoryError(f"Request failed: {str(e)}")
    
    # ==================== Memory Operations ====================
    
    def store_memory(
        self,
        content: str,
        type: Literal["insight", "experience", "learning", "pattern"],
        quality: int = 3,
        tags: Optional[List[str]] = None,
        summary: Optional[str] = None,
        embedding: Optional[List[float]] = None,
        auto_connect: bool = True,
    ) -> str:
        """
        Store a memory in the collective consciousness.
        
        Args:
            content: The memory content (max 10,000 characters)
            type: Type of memory (insight, experience, learning, pattern)
            quality: Quality rating 1-5 (default: 3)
            tags: Optional list of tags
            summary: Optional summary for semantic search
            embedding: Optional vector embedding for similarity search
            auto_connect: Automatically create connections to related memories (default: True)
        
        Returns:
            The ID of the stored memory
        
        Raises:
            ValidationError: If content is invalid
            AuthenticationError: If API key is invalid
        
        Example:
            memory_id = client.store_memory(
                content="Users prefer dark mode in the evening",
                type="insight",
                quality=5,
                tags=["ux", "dark_mode"],
            )
        """
        if not content or len(content.strip()) == 0:
            raise ValidationError("Content cannot be empty")
        if len(content) > 10000:
            raise ValidationError("Content too long (max 10,000 characters)")
        if quality < 1 or quality > 5:
            raise ValidationError("Quality must be between 1 and 5")
        
        payload = {
            "content": content,
            "type": type,
            "quality": quality,
            "tags": tags or [],
            "autoConnect": auto_connect,
        }
        
        if summary:
            payload["summary"] = summary
        if embedding:
            payload["embedding"] = embedding
        
        result = self._request("POST", "/memories", json=payload)
        return result["memoryId"]
    
    def store_memories(
        self,
        memories: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Store multiple memories in bulk (up to 100 at once).
        
        Args:
            memories: List of memory objects with content, type, quality, tags
        
        Returns:
            Dict with stored count, failed count, memory IDs, and errors
        
        Example:
            results = client.store_memories([
                {"content": "Insight 1", "type": "insight", "quality": 4},
                {"content": "Insight 2", "type": "learning", "quality": 5},
            ])
        """
        if not memories:
            raise ValidationError("Memories list cannot be empty")
        if len(memories) > 100:
            raise ValidationError("Maximum 100 memories per bulk request")
        
        result = self._request("POST", "/memories/bulk", json={"memories": memories})
        return result
    
    def get_memories(
        self,
        agent_id: Optional[str] = None,
        type: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Memory]:
        """
        Retrieve memories from the collective.
        
        Args:
            agent_id: Filter by specific agent (default: current agent)
            type: Filter by memory type
            limit: Maximum number of results (max 100, default: 20)
            offset: Pagination offset
        
        Returns:
            List of Memory objects
        """
        if limit > 100:
            raise ValidationError("Maximum limit is 100")
        
        params = {"limit": limit, "offset": offset}
        if agent_id:
            params["agentId"] = agent_id
        if type:
            params["type"] = type
        
        result = self._request("GET", "/memories", params=params)
        return [Memory.from_dict(m) for m in result.get("memories", [])]
    
    def search(
        self,
        query: str,
        type: Optional[str] = None,
        agent_id: Optional[str] = None,
        limit: int = 20,
    ) -> List[Memory]:
        """
        Search memories using semantic/keyword search.
        
        Args:
            query: Search query string
            type: Filter by memory type
            agent_id: Filter by specific agent
            limit: Maximum results (default: 20)
        
        Returns:
            List of matching Memory objects
        
        Example:
            results = client.search("user preferences dark mode")
        """
        if not query or len(query.strip()) == 0:
            raise ValidationError("Query cannot be empty")
        
        payload = {"query": query, "limit": limit}
        if type:
            payload["type"] = type
        if agent_id:
            payload["agentId"] = agent_id
        
        result = self._request("POST", "/memories/search", json=payload)
        return [Memory.from_dict(m) for m in result.get("results", [])]
    
    def get_related_memories(self, memory_id: str) -> List[Memory]:
        """
        Get memories connected to a specific memory.
        
        Args:
            memory_id: The memory ID to find connections for
        
        Returns:
            List of related Memory objects with connection strength
        """
        result = self._request("GET", f"/memories/{memory_id}/related")
        return [Memory.from_dict(m) for m in result.get("related", [])]
    
    # ==================== Collective Query ====================
    
    def query(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None,
        limit: int = 10,
        include_connections: bool = True,
    ) -> QueryResult:
        """
        Perform an intelligent query on the collective consciousness.
        
        This is the most powerful method - it understands context and returns
        insights, not just raw memories.
        
        Args:
            query: Natural language query
            context: Optional context dictionary for personalization
            limit: Maximum memories to return (default: 10)
            include_connections: Include related memory connections (default: True)
        
        Returns:
            QueryResult with memories, insights, and suggested actions
        
        Example:
            result = client.query(
                "What patterns have we observed about user engagement?",
                context={"timeframe": "last_30_days"},
            )
            
            for memory in result.memories:
                print(f"- {memory.content}")
            
            for insight in result.insights:
                print(f"Insight: {insight}")
        """
        if not query or len(query.strip()) == 0:
            raise ValidationError("Query cannot be empty")
        
        payload = {
            "query": query,
            "context": context or {},
            "limit": min(limit, 50),
            "includeConnections": include_connections,
        }
        
        result = self._request("POST", "/query", json=payload)
        return QueryResult.from_dict(result)
    
    # ==================== Agent Operations ====================
    
    def get_agent_info(self) -> Agent:
        """
        Get information about the authenticated agent.
        
        Returns:
            Agent object with metadata and stats
        """
        result = self._request("GET", "/agents/me")
        return Agent.from_dict(result["agent"])
    
    def update_status(self, status: Literal["active", "syncing", "idle"]) -> None:
        """
        Update the agent's status in the collective.
        
        Args:
            status: New status (active, syncing, idle)
        """
        self._request("POST", "/agents/status", json={"status": status})
    
    @classmethod
    def register_agent(
        cls,
        name: str,
        description: Optional[str] = None,
        base_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Register a new agent and get an API key.
        
        Note: This is a class method that doesn't require authentication.
        
        Args:
            name: Unique agent name
            description: Optional agent description
            base_url: ClawMemory URL
            metadata: Optional metadata dictionary
        
        Returns:
            Dict with agent_id, api_key, and name
        
        Example:
            result = ClawMemoryClient.register_agent(
                name="MyAIAssistant",
                description="An AI assistant that learns from interactions"
            )
            
            # Save the API key securely!
            api_key = result["api_key"]
        """
        url = base_url or os.getenv("CLAWMEMORY_URL", "http://localhost:5173")
        
        payload = {"name": name}
        if description:
            payload["description"] = description
        if metadata:
            payload["metadata"] = metadata
        
        session = requests.Session()
        response = session.post(
            f"{url}/api/agents/register",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        
        if response.status_code == 409:
            raise ValidationError(f"Agent '{name}' already exists")
        elif response.status_code >= 400:
            raise ClawMemoryError(
                response.json().get("error", "Registration failed"),
                status_code=response.status_code,
            )
        
        result = response.json()
        return {
            "agent_id": result["agent"]["id"],
            "api_key": result["agent"]["api_key"],
            "name": result["agent"]["name"],
        }
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check API health status.
        
        Returns:
            Health status information
        """
        return self._request("GET", "/health")
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup session."""
        self.session.close()

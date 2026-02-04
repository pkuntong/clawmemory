"""
Tests for ClawMemory Python SDK
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import json

from clawmemory import ClawMemoryClient, ClawMemoryWebhooks
from clawmemory.exceptions import (
    ClawMemoryError,
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    ValidationError,
)
from clawmemory.models import Memory, Agent, QueryResult


class TestClawMemoryClient:
    """Test suite for ClawMemoryClient"""
    
    @pytest.fixture
    def client(self):
        return ClawMemoryClient(api_key="test_key", base_url="http://test.com")
    
    @pytest.fixture
    def mock_response(self):
        """Create a mock response object"""
        response = MagicMock()
        response.ok = True
        response.status_code = 200
        response.json.return_value = {}
        return response
    
    def test_init_requires_api_key(self):
        """Test that client requires API key"""
        with pytest.raises(AuthenticationError):
            ClawMemoryClient(api_key=None)
    
    def test_init_with_env_vars(self, monkeypatch):
        """Test initialization from environment variables"""
        monkeypatch.setenv("CLAWMEMORY_API_KEY", "env_key")
        monkeypatch.setenv("CLAWMEMORY_URL", "http://env.com")
        
        client = ClawMemoryClient()
        assert client.api_key == "env_key"
        assert client.base_url == "http://env.com"
    
    @patch('requests.Session.request')
    def test_store_memory_success(self, mock_request, client, mock_response):
        """Test successful memory storage"""
        mock_response.json.return_value = {
            "success": True,
            "memoryId": "mem_123",
            "agent": {"id": "agent_1", "name": "Test"},
        }
        mock_request.return_value = mock_response
        
        memory_id = client.store_memory(
            content="Test content",
            type="insight",
            quality=5,
        )
        
        assert memory_id == "mem_123"
        mock_request.assert_called_once()
    
    @patch('requests.Session.request')
    def test_store_memory_validation(self, mock_request, client):
        """Test memory validation errors"""
        with pytest.raises(ValidationError, match="Content cannot be empty"):
            client.store_memory(content="", type="insight")
        
        with pytest.raises(ValidationError, match="Content too long"):
            client.store_memory(content="x" * 10001, type="insight")
        
        with pytest.raises(ValidationError, match="Quality must be between"):
            client.store_memory(content="Test", type="insight", quality=6)
    
    @patch('requests.Session.request')
    def test_authentication_error(self, mock_request, client):
        """Test handling of 401 authentication error"""
        response = MagicMock()
        response.ok = False
        response.status_code = 401
        response.json.return_value = {"error": "Invalid API key"}
        mock_request.return_value = response
        
        with pytest.raises(AuthenticationError):
            client.get_agent_info()
    
    @patch('requests.Session.request')
    def test_rate_limit_error(self, mock_request, client):
        """Test handling of 429 rate limit error"""
        response = MagicMock()
        response.ok = False
        response.status_code = 429
        response.headers = {"Retry-After": "60"}
        response.json.return_value = {"error": "Rate limit exceeded"}
        mock_request.return_value = response
        
        with pytest.raises(RateLimitError) as exc_info:
            client.get_agent_info()
        
        assert exc_info.value.retryAfter == 60
    
    @patch('requests.Session.request')
    def test_search_memories(self, mock_request, client, mock_response):
        """Test memory search"""
        mock_response.json.return_value = {
            "query": "test",
            "results": [
                {
                    "_id": "mem_1",
                    "agentId": "agent_1",
                    "agentName": "TestAgent",
                    "type": "insight",
                    "content": "Test content",
                    "quality": 5,
                    "createdAt": 1700000000000,
                }
            ],
            "count": 1,
        }
        mock_request.return_value = mock_response
        
        results = client.search("test query")
        
        assert len(results) == 1
        assert results[0].content == "Test content"
        assert results[0].type == "insight"
    
    @patch('requests.Session.request')
    def test_query_collective(self, mock_request, client, mock_response):
        """Test collective query"""
        mock_response.json.return_value = {
            "query": "What do we know?",
            "memories": [],
            "insights": ["Found 5 relevant memories"],
            "suggestedActions": ["Explore more"],
        }
        mock_request.return_value = mock_response
        
        result = client.query("What do we know?")
        
        assert isinstance(result, QueryResult)
        assert result.query == "What do we know?"
        assert len(result.insights) == 1
    
    @patch('requests.Session.request')
    def test_bulk_store_memories(self, mock_request, client, mock_response):
        """Test bulk memory storage"""
        mock_response.json.return_value = {
            "success": True,
            "stored": 2,
            "failed": 0,
            "memoryIds": ["mem_1", "mem_2"],
            "errors": [],
        }
        mock_request.return_value = mock_response
        
        result = client.store_memories([
            {"content": "Memory 1", "type": "insight"},
            {"content": "Memory 2", "type": "learning"},
        ])
        
        assert result["stored"] == 2
        assert len(result["memoryIds"]) == 2


class TestClawMemoryWebhooks:
    """Test suite for ClawMemoryWebhooks"""
    
    @pytest.fixture
    def webhooks(self):
        return ClawMemoryWebhooks(api_key="test_key", base_url="http://test.com")
    
    @patch('requests.Session.request')
    def test_register_webhook(self, mock_request):
        """Test webhook registration"""
        response = MagicMock()
        response.ok = True
        response.json.return_value = {"webhookId": "hook_123"}
        mock_request.return_value = response
        
        webhooks = ClawMemoryWebhooks(api_key="test_key")
        result = webhooks.register(
            url="https://example.com/webhook",
            events=["memory.created"],
        )
        
        assert result["webhookId"] == "hook_123"
    
    @patch('requests.Session.request')
    def test_list_webhooks(self, mock_request):
        """Test listing webhooks"""
        response = MagicMock()
        response.ok = True
        response.json.return_value = {
            "webhooks": [
                {"_id": "hook_1", "url": "https://example.com", "events": ["memory.created"]},
            ]
        }
        mock_request.return_value = response
        
        webhooks = ClawMemoryWebhooks(api_key="test_key")
        hooks = webhooks.list()
        
        assert len(hooks) == 1
        assert hooks[0]["_id"] == "hook_1"
    
    def test_verify_signature(self):
        """Test webhook signature verification"""
        import hmac
        import hashlib
        
        payload = '{"event": "memory.created"}'
        secret = "my_secret"
        
        # Generate signature
        expected = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        
        # Verify
        assert ClawMemoryWebhooks.verify_signature(payload, expected, secret)
        
        # Should fail with wrong signature
        assert not ClawMemoryWebhooks.verify_signature(payload, "wrong", secret)


class TestModels:
    """Test suite for data models"""
    
    def test_memory_from_dict(self):
        """Test Memory model creation from dict"""
        data = {
            "_id": "mem_123",
            "agentId": "agent_456",
            "agentName": "TestAgent",
            "type": "insight",
            "content": "Test content",
            "quality": 5,
            "createdAt": 1700000000000,
            "tags": ["test"],
        }
        
        memory = Memory.from_dict(data)
        
        assert memory.id == "mem_123"
        assert memory.agent_id == "agent_456"
        assert memory.content == "Test content"
        assert memory.quality == 5
        assert memory.tags == ["test"]
    
    def test_memory_datetime(self):
        """Test Memory datetime conversion"""
        from datetime import datetime
        
        data = {
            "_id": "mem_123",
            "agentId": "agent_456",
            "agentName": "TestAgent",
            "type": "insight",
            "content": "Test",
            "quality": 3,
            "createdAt": 1700000000000,  # 2023-11-14
        }
        
        memory = Memory.from_dict(data)
        dt = memory.created_datetime
        
        assert isinstance(dt, datetime)
        assert dt.year == 2023
    
    def test_agent_from_dict(self):
        """Test Agent model creation"""
        data = {
            "_id": "agent_123",
            "name": "TestAgent",
            "status": "active",
            "memoriesCount": 42,
            "lastActive": 1700000000000,
            "createdAt": 1699999999999,
        }
        
        agent = Agent.from_dict(data)
        
        assert agent.id == "agent_123"
        assert agent.name == "TestAgent"
        assert agent.status == "active"
        assert agent.memories_count == 42
    
    def test_query_result_from_dict(self):
        """Test QueryResult model creation"""
        data = {
            "query": "Test query",
            "memories": [],
            "insights": ["Insight 1"],
            "suggestedActions": ["Action 1"],
        }
        
        result = QueryResult.from_dict(data)
        
        assert result.query == "Test query"
        assert len(result.insights) == 1
        assert len(result.suggested_actions) == 1


class TestCLI:
    """Test suite for CLI"""
    
    def test_cli_import(self):
        """Test CLI module can be imported"""
        from clawmemory import cli
        assert hasattr(cli, 'main')

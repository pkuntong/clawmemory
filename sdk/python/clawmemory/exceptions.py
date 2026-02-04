"""
Exceptions for ClawMemory SDK
"""


class ClawMemoryError(Exception):
    """Base exception for ClawMemory errors."""
    
    def __init__(self, message: str, code: str = None, status_code: int = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
    
    def __str__(self) -> str:
        if self.code:
            return f"[{self.code}] {self.message}"
        return self.message


class AuthenticationError(ClawMemoryError):
    """Raised when authentication fails."""
    pass


class RateLimitError(ClawMemoryError):
    """Raised when rate limit is exceeded."""
    pass


class NotFoundError(ClawMemoryError):
    """Raised when a resource is not found."""
    pass


class ValidationError(ClawMemoryError):
    """Raised when request validation fails."""
    pass


class ServerError(ClawMemoryError):
    """Raised when server encounters an error."""
    pass

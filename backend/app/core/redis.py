"""
Redis connection manager for caching and pub/sub.
"""
import redis.asyncio as redis
from .config import get_settings

settings = get_settings()


class RedisManager:
    """Redis connection manager for device status and pub/sub."""
    
    def __init__(self):
        self._redis: redis.Redis | None = None
        self._pubsub: redis.client.PubSub | None = None
    
    async def connect(self):
        """Establish Redis connection."""
        self._redis = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True
        )
        self._pubsub = self._redis.pubsub()
        
    async def disconnect(self):
        """Close Redis connection."""
        if self._pubsub:
            await self._pubsub.close()
        if self._redis:
            await self._redis.close()
    
    @property
    def client(self) -> redis.Redis:
        """Get Redis client."""
        if not self._redis:
            raise RuntimeError("Redis not connected")
        return self._redis
    
    # Device Status Methods
    async def set_device_online(self, device_id: str, ttl: int = 120):
        """Mark device as online with TTL."""
        await self.client.setex(f"device:status:{device_id}", ttl, "online")
        await self.client.sadd("devices:online", device_id)
    
    async def set_device_offline(self, device_id: str):
        """Mark device as offline."""
        await self.client.delete(f"device:status:{device_id}")
        await self.client.srem("devices:online", device_id)
    
    async def get_device_status(self, device_id: str) -> str:
        """Get device status."""
        status = await self.client.get(f"device:status:{device_id}")
        return status or "offline"
    
    async def get_online_count(self) -> int:
        """Get count of online devices."""
        return await self.client.scard("devices:online")
    
    # Stats Counters
    async def increment_message_count(self):
        """Increment message counter."""
        await self.client.incr("stats:messages:total")
        await self.client.incr("stats:messages:minute")
    
    async def get_message_rate(self) -> int:
        """Get messages per minute."""
        count = await self.client.getex("stats:messages:minute", ex=60)
        return int(count) if count else 0
    
    # Pub/Sub for WebSocket
    async def publish_event(self, channel: str, message: str):
        """Publish event to channel."""
        await self.client.publish(channel, message)
    
    async def subscribe(self, channel: str):
        """Subscribe to channel."""
        await self._pubsub.subscribe(channel)
        return self._pubsub


# Global instance
redis_manager = RedisManager()

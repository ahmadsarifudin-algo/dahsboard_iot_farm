"""
Redis connection manager for caching and pub/sub.
Gracefully degrades when Redis is not available.
"""
from .config import get_settings

settings = get_settings()


class RedisManager:
    """Redis connection manager. Falls back to in-memory when Redis is unavailable."""
    
    def __init__(self):
        self._redis = None
        self._pubsub = None
        self._connected = False
        # In-memory fallback stores
        self._mem_store: dict = {}
        self._mem_sets: dict = {}
        self._mem_counters: dict = {}
    
    async def connect(self):
        """Establish Redis connection or fall back to in-memory."""
        if not settings.redis_enabled:
            print("Redis: Disabled in config, using in-memory fallback")
            return
        
        try:
            import redis.asyncio as redis
            self._redis = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self._redis.ping()
            self._pubsub = self._redis.pubsub()
            self._connected = True
            print("Redis: Connected successfully")
        except Exception as e:
            print(f"Redis: Connection failed ({e}), using in-memory fallback")
            self._redis = None
            self._connected = False
        
    async def disconnect(self):
        """Close Redis connection."""
        if self._connected:
            if self._pubsub:
                await self._pubsub.close()
            if self._redis:
                await self._redis.close()
    
    @property
    def is_connected(self) -> bool:
        return self._connected
    
    # Device Status Methods
    async def set_device_online(self, device_id: str, ttl: int = 120):
        """Mark device as online with TTL."""
        if self._connected:
            await self._redis.setex(f"device:status:{device_id}", ttl, "online")
            await self._redis.sadd("devices:online", device_id)
        else:
            self._mem_store[f"device:status:{device_id}"] = "online"
            self._mem_sets.setdefault("devices:online", set()).add(device_id)
    
    async def set_device_offline(self, device_id: str):
        """Mark device as offline."""
        if self._connected:
            await self._redis.delete(f"device:status:{device_id}")
            await self._redis.srem("devices:online", device_id)
        else:
            self._mem_store.pop(f"device:status:{device_id}", None)
            self._mem_sets.get("devices:online", set()).discard(device_id)
    
    async def get_device_status(self, device_id: str) -> str:
        """Get device status."""
        if self._connected:
            status = await self._redis.get(f"device:status:{device_id}")
            return status or "offline"
        return self._mem_store.get(f"device:status:{device_id}", "offline")
    
    async def get_online_count(self) -> int:
        """Get count of online devices."""
        if self._connected:
            return await self._redis.scard("devices:online")
        return len(self._mem_sets.get("devices:online", set()))
    
    # Stats Counters
    async def increment_message_count(self):
        """Increment message counter."""
        if self._connected:
            await self._redis.incr("stats:messages:total")
            await self._redis.incr("stats:messages:minute")
        else:
            self._mem_counters["total"] = self._mem_counters.get("total", 0) + 1
            self._mem_counters["minute"] = self._mem_counters.get("minute", 0) + 1
    
    async def get_message_rate(self) -> int:
        """Get messages per minute."""
        if self._connected:
            count = await self._redis.getex("stats:messages:minute", ex=60)
            return int(count) if count else 0
        return self._mem_counters.get("minute", 0)
    
    # Pub/Sub for WebSocket
    async def publish_event(self, channel: str, message: str):
        """Publish event to channel."""
        if self._connected:
            await self._redis.publish(channel, message)
    
    async def subscribe(self, channel: str):
        """Subscribe to channel."""
        if self._connected and self._pubsub:
            await self._pubsub.subscribe(channel)
            return self._pubsub
        return None


# Global instance
redis_manager = RedisManager()

"""
WebSocket Service for real-time browser updates.
Gracefully degrades when Redis is not available.
"""
import json
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from app.core.redis import redis_manager


class WebSocketManager:
    """Manages WebSocket connections and broadcasts events."""
    
    def __init__(self):
        self._connections: list[WebSocket] = []
        self._running = False
    
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection."""
        await websocket.accept()
        self._connections.append(websocket)
        print(f"WebSocket: Client connected. Total: {len(self._connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove disconnected WebSocket."""
        if websocket in self._connections:
            self._connections.remove(websocket)
        print(f"WebSocket: Client disconnected. Total: {len(self._connections)}")
    
    async def broadcast(self, message: str):
        """Broadcast message to all connected clients."""
        disconnected = []
        for connection in self._connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)
    
    async def send_to_client(self, websocket: WebSocket, message: str):
        """Send message to specific client."""
        try:
            await websocket.send_text(message)
        except Exception:
            self.disconnect(websocket)
    
    async def start_redis_subscriber(self):
        """Subscribe to Redis events and broadcast to WebSocket clients."""
        if not redis_manager.is_connected:
            print("WebSocket: Redis not available, skipping Redis subscriber")
            return
        
        self._running = True
        while self._running:
            try:
                pubsub = await redis_manager.subscribe("ws:events")
                if pubsub is None:
                    print("WebSocket: Could not subscribe to Redis, stopping subscriber")
                    return
                
                while self._running:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message and message["type"] == "message":
                        await self.broadcast(message["data"])
                    await asyncio.sleep(0.01)
                    
            except Exception as e:
                print(f"WebSocket Redis subscriber error: {e}")
                await asyncio.sleep(1)
    
    async def stop(self):
        """Stop the Redis subscriber."""
        self._running = False


# Global instance
ws_manager = WebSocketManager()


async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint handler."""
    await ws_manager.connect(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                if message.get("action") == "subscribe":
                    await ws_manager.send_to_client(
                        websocket, 
                        json.dumps({"type": "subscribed", "payload": message.get("topics", [])})
                    )
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

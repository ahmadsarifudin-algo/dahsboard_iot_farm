"""
MQTT Service for device communication via EMQX broker.
"""
import json
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
import aiomqtt
from app.core.config import get_settings
from app.core.redis import redis_manager

settings = get_settings()


class MQTTService:
    """MQTT client service for device communication."""
    
    def __init__(self):
        self._client: aiomqtt.Client | None = None
        self._running = False
        self._message_handlers: dict = {}
    
    @asynccontextmanager
    async def _get_client(self):
        """Get MQTT client context manager."""
        async with aiomqtt.Client(
            hostname=settings.mqtt_broker,
            port=settings.mqtt_port,
            username=settings.mqtt_username or None,
            password=settings.mqtt_password or None,
            identifier=settings.mqtt_client_id,
        ) as client:
            yield client
    
    async def start(self):
        """Start MQTT subscriber loop."""
        self._running = True
        while self._running:
            try:
                async with self._get_client() as client:
                    self._client = client
                    
                    # Subscribe to all device topics
                    await client.subscribe("iot/+/+/telemetry")
                    await client.subscribe("iot/+/+/status")
                    await client.subscribe("iot/+/+/shadow/reported")
                    await client.subscribe("iot/+/+/commands/response")
                    
                    print("MQTT: Connected and subscribed to device topics")
                    
                    async for message in client.messages:
                        await self._handle_message(message)
                        
            except aiomqtt.MqttError as e:
                print(f"MQTT Error: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)
            except Exception as e:
                print(f"MQTT Exception: {e}")
                await asyncio.sleep(5)
    
    async def stop(self):
        """Stop MQTT subscriber."""
        self._running = False
    
    async def _handle_message(self, message: aiomqtt.Message):
        """Route incoming MQTT messages to handlers."""
        topic = str(message.topic)
        payload = message.payload.decode()
        
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            print(f"Invalid JSON on topic {topic}: {payload}")
            return
        
        # Parse topic: iot/{site_id}/{device_id}/{type}
        parts = topic.split("/")
        if len(parts) < 4:
            return
        
        _, site_id, device_id, msg_type = parts[0], parts[1], parts[2], parts[3]
        
        # Increment message counter
        await redis_manager.increment_message_count()
        
        if msg_type == "telemetry":
            await self._handle_telemetry(device_id, data)
        elif msg_type == "status":
            await self._handle_status(device_id, data)
        elif msg_type == "shadow":
            await self._handle_shadow_reported(device_id, data)
        elif msg_type == "commands":
            await self._handle_command_response(device_id, data)
    
    async def _handle_telemetry(self, device_id: str, data: dict):
        """Handle telemetry data from device."""
        event = {
            "type": "telemetry",
            "payload": {
                "device_id": device_id,
                "metrics": data.get("metrics", data),
                "timestamp": data.get("timestamp", datetime.utcnow().isoformat())
            }
        }
        await redis_manager.publish_event("ws:events", json.dumps(event))
        # Note: Actual DB insert happens via separate consumer or API
    
    async def _handle_status(self, device_id: str, data: dict):
        """Handle device status update."""
        status = data.get("status", "online")
        
        if status == "online":
            await redis_manager.set_device_online(device_id)
        else:
            await redis_manager.set_device_offline(device_id)
        
        event = {
            "type": "status",
            "payload": {
                "device_id": device_id,
                "status": status,
                "last_seen": datetime.utcnow().isoformat()
            }
        }
        await redis_manager.publish_event("ws:events", json.dumps(event))
    
    async def _handle_shadow_reported(self, device_id: str, data: dict):
        """Handle shadow reported state from device."""
        event = {
            "type": "shadow",
            "payload": {
                "device_id": device_id,
                "reported": data
            }
        }
        await redis_manager.publish_event("ws:events", json.dumps(event))
    
    async def _handle_command_response(self, device_id: str, data: dict):
        """Handle command acknowledgement from device."""
        event = {
            "type": "command_ack",
            "payload": {
                "device_id": device_id,
                "command_id": data.get("command_id"),
                "status": data.get("status", "acked"),
                "response": data.get("response")
            }
        }
        await redis_manager.publish_event("ws:events", json.dumps(event))
    
    async def publish_command(self, site_id: str, device_id: str, command: dict):
        """Publish command to device."""
        topic = f"iot/{site_id}/{device_id}/commands"
        async with self._get_client() as client:
            await client.publish(topic, json.dumps(command))
    
    async def publish_shadow_desired(self, site_id: str, device_id: str, desired: dict):
        """Publish desired shadow state to device."""
        topic = f"iot/{site_id}/{device_id}/shadow/desired"
        async with self._get_client() as client:
            await client.publish(topic, json.dumps(desired))


# Global instance
mqtt_service = MQTTService()

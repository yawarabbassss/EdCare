import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import WebSocket
from sqlalchemy.orm import Session
from app.models.models import Notification, User

logger = logging.getLogger("leo.notifications")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: Optional[str] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, user_id: Optional[str] = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
        logger.info(f"WebSocket disconnected. Remaining active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast event to all connected clients (dashboards & kiosk)"""
        dead_connections = []
        payload = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}")
                dead_connections.append(connection)
        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)

    async def send_personal(self, message: dict, user_id: str):
        if user_id in self.user_connections:
            payload = json.dumps(message)
            dead_conns = []
            for conn in self.user_connections[user_id]:
                try:
                    await conn.send_text(payload)
                except Exception:
                    dead_conns.append(conn)
            for d in dead_conns:
                self.disconnect(d, user_id)

ws_manager = ConnectionManager()

class BaseNotificationProvider:
    async def send(self, recipient: str, title: str, body: str, data: dict) -> bool:
        raise NotImplementedError

class NotificationService:
    def __init__(self):
        self.providers: List[BaseNotificationProvider] = []

    def register_provider(self, provider: BaseNotificationProvider):
        self.providers.append(provider)

    async def create_and_send(
        self,
        db: Session,
        user_id: str,
        title: str,
        body: str,
        notification_type: str = "ALERT",
        data: Optional[Dict[str, Any]] = None
    ) -> Notification:
        data_str = json.dumps(data or {})
        notif = Notification(
            user_id=user_id,
            title=title,
            body=body,
            notification_type=notification_type,
            data_json=data_str
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        # Broadcast real-time message via WebSockets
        ws_payload = {
            "type": "NOTIFICATION_RECEIVED",
            "notification": {
                "id": notif.id,
                "user_id": user_id,
                "title": title,
                "body": body,
                "notification_type": notification_type,
                "data": data or {},
                "created_at": notif.created_at.isoformat() if notif.created_at else None
            }
        }
        await ws_manager.broadcast(ws_payload)

        # Notify registered providers (SMS / Email / Push abstractions)
        for provider in self.providers:
            try:
                await provider.send(user_id, title, body, data or {})
            except Exception as e:
                logger.error(f"Provider failed to deliver notification: {e}")

        return notif

notification_service = NotificationService()

import json
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import Event
from app.services.notification_service import ws_manager

logger = logging.getLogger("leo.events")

async def log_system_event(
    db: Session,
    elderly_id: str,
    event_type: str,
    description: str,
    severity: str = "INFO",  # INFO, WARNING, CRITICAL
    metadata: Optional[Dict[str, Any]] = None
) -> Event:
    meta_str = json.dumps(metadata or {})
    event = Event(
        elderly_id=elderly_id,
        event_type=event_type,
        description=description,
        severity=severity,
        metadata_json=meta_str
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Broadcast event via WebSocket
    await ws_manager.broadcast({
        "type": "TIMELINE_EVENT",
        "event": {
            "id": event.id,
            "elderly_id": elderly_id,
            "event_type": event_type,
            "description": description,
            "severity": severity,
            "metadata": metadata or {},
            "created_at": event.created_at.isoformat() if event.created_at else None
        }
    })

    return event

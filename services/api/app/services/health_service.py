import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import HealthRecord, HealthThreshold, ElderlyProfile
from app.services.notification_service import ws_manager
from app.services.alert_service import trigger_emergency_alert
from app.services.event_service import log_system_event

logger = logging.getLogger("leo.health")

async def record_health_metric(
    db: Session,
    elderly_id: str,
    metric_type: str,
    value: float,
    unit: str,
    secondary_value: Optional[float] = None,
    source: str = "MANUAL",
    notes: Optional[str] = None,
    recorded_by_id: Optional[str] = None
) -> HealthRecord:
    record = HealthRecord(
        elderly_id=elderly_id,
        metric_type=metric_type,
        value=value,
        secondary_value=secondary_value,
        unit=unit,
        timestamp=datetime.now(timezone.utc),
        source=source,
        notes=notes,
        recorded_by_id=recorded_by_id
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Broadcast vital reading via WebSocket
    val_display = f"{value}/{secondary_value}" if secondary_value is not None else f"{value}"
    await ws_manager.broadcast({
        "type": "HEALTH_METRIC_RECORDED",
        "record": {
            "id": record.id,
            "elderly_id": elderly_id,
            "metric_type": metric_type,
            "value": value,
            "secondary_value": secondary_value,
            "unit": unit,
            "timestamp": record.timestamp.isoformat(),
            "source": source
        }
    })

    # Non-diagnostic threshold check
    threshold = db.query(HealthThreshold).filter(
        HealthThreshold.elderly_id == elderly_id,
        HealthThreshold.metric_type == metric_type,
        HealthThreshold.is_active == True
    ).first()

    if threshold:
        violation = False
        message = ""
        if threshold.min_value is not None and value < threshold.min_value:
            violation = True
            message = f"{metric_type.replace('_', ' ').title()} ({val_display} {unit}) is below configured lower limit ({threshold.min_value} {unit})"
        elif threshold.max_value is not None and value > threshold.max_value:
            violation = True
            message = f"{metric_type.replace('_', ' ').title()} ({val_display} {unit}) is above configured upper limit ({threshold.max_value} {unit})"

        if violation:
            logger.warning(f"Health threshold alert: {message}")
            await trigger_emergency_alert(
                db=db,
                elderly_id=elderly_id,
                alert_type="HEALTH_ANOMALY",
                location="Monitored Device",
                confidence=0.95,
                details={
                    "metric_type": metric_type,
                    "value": value,
                    "secondary_value": secondary_value,
                    "unit": unit,
                    "threshold_min": threshold.min_value,
                    "threshold_max": threshold.max_value,
                    "message": message,
                    "disclaimer": "Reading is outside the configured range. Non-diagnostic notification."
                }
            )

    return record

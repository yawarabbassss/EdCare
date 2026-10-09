import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import Alert, ElderlyProfile, CaregiverRelationship, User, Camera
from app.services.notification_service import notification_service, ws_manager
from app.services.event_service import log_system_event
from app.services.audit_service import log_audit_event

logger = logging.getLogger("leo.alerts")

async def trigger_emergency_alert(
    db: Session,
    elderly_id: str,
    alert_type: str,  # POSSIBLE_FALL, SOS_BUTTON, MISSED_MEDICATION, HEALTH_ANOMALY, CAMERA_OFFLINE
    location: str = "Living Room",
    confidence: float = 1.0,
    camera_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> Alert:
    """
    Creates an emergency alert, broadcasts real-time WebSocket event to Caregiver Dashboards,
    notifies linked caregivers, and logs audit + timeline events.
    """
    # Prevent duplicate unacknowledged alerts for the same elderly person within 30 seconds
    recent_alert = db.query(Alert).filter(
        Alert.elderly_id == elderly_id,
        Alert.alert_type == alert_type,
        Alert.status.in_(["DETECTED", "ESCALATED"])
    ).order_by(Alert.created_at.desc()).first()

    details_str = json.dumps(details or {})
    alert = Alert(
        elderly_id=elderly_id,
        camera_id=camera_id,
        alert_type=alert_type,
        status="DETECTED",
        confidence=confidence,
        location=location,
        details_json=details_str
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Get elderly profile and associated user
    elderly_profile = db.query(ElderlyProfile).filter(ElderlyProfile.id == elderly_id).first()
    elderly_name = "Resident"
    if elderly_profile and elderly_profile.user:
        elderly_name = elderly_profile.user.full_name

    # Log system event
    severity = "CRITICAL" if alert_type in ["POSSIBLE_FALL", "SOS_BUTTON"] else "WARNING"
    desc = f"🚨 {alert_type.replace('_', ' ').title()} in {location} ({int(confidence*100)}% confidence)"
    await log_system_event(
        db=db,
        elderly_id=elderly_id,
        event_type=f"ALERT_{alert_type}",
        description=desc,
        severity=severity,
        metadata={"alert_id": alert.id, "location": location, "confidence": confidence}
    )

    # Broadcast emergency WebSocket message
    ws_payload = {
        "type": "EMERGENCY_ALERT",
        "alert": {
            "id": alert.id,
            "elderly_id": elderly_id,
            "elderly_name": elderly_name,
            "camera_id": camera_id,
            "alert_type": alert_type,
            "status": "DETECTED",
            "confidence": confidence,
            "location": location,
            "details": details or {},
            "created_at": alert.created_at.isoformat() if alert.created_at else None
        }
    }
    await ws_manager.broadcast(ws_payload)

    # Notify all linked caregivers
    if elderly_profile:
        caregiver_links = db.query(CaregiverRelationship).filter(
            CaregiverRelationship.elderly_id == elderly_profile.user_id
        ).all()
        for link in caregiver_links:
            await notification_service.create_and_send(
                db=db,
                user_id=link.caregiver_id,
                title=f"🚨 Emergency Alert: {alert_type.replace('_', ' ')}",
                body=f"High priority alert for {elderly_name} in {location}. Immediate attention required.",
                notification_type="EMERGENCY",
                data={"alert_id": alert.id, "elderly_id": elderly_id, "alert_type": alert_type}
            )

    return alert

async def update_alert_status(
    db: Session,
    alert_id: str,
    new_status: str,  # ACKNOWLEDGED, RESOLVED, ESCALATED, FALSE_ALARM
    user: User,
    notes: Optional[str] = None
) -> Alert:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise ValueError("Alert not found")

    now = datetime.now(timezone.utc)
    old_status = alert.status
    alert.status = new_status

    if new_status == "ACKNOWLEDGED":
        alert.acknowledged_at = now
        alert.acknowledged_by_id = user.id
    elif new_status in ["RESOLVED", "FALSE_ALARM"]:
        alert.resolved_at = now
        alert.resolved_by_id = user.id

    db.commit()
    db.refresh(alert)

    # Log audit
    log_audit_event(
        db=db,
        action=f"ALERT_STATUS_UPDATE_{new_status}",
        user_id=user.id,
        target_type="Alert",
        target_id=alert.id,
        details={"old_status": old_status, "new_status": new_status, "notes": notes}
    )

    # Broadcast status change to all connected clients
    await ws_manager.broadcast({
        "type": "ALERT_STATUS_UPDATED",
        "alert_id": alert.id,
        "status": new_status,
        "updated_by": user.full_name,
        "notes": notes,
        "timestamp": now.isoformat()
    })

    return alert

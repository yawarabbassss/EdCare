from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.models import (
    ElderlyProfile,
    Medication,
    MedicationLog,
    HealthRecord,
    EmergencyContact,
    Alert,
    Event
)
from app.services.alert_service import trigger_emergency_alert

def tool_get_medications(db: Session, elderly_id: str) -> Dict[str, Any]:
    """Retrieves list of all active medications and their instructions."""
    meds = db.query(Medication).filter(
        Medication.elderly_id == elderly_id,
        Medication.is_active == True
    ).all()
    
    result = []
    for m in meds:
        schedules = [s.reminder_time for s in m.schedules if s.is_active]
        result.append({
            "name": m.name,
            "dosage": m.dosage,
            "instructions": m.instructions or "Take as directed",
            "frequency": m.frequency,
            "times": schedules
        })
    return {"medications": result, "count": len(result)}

def tool_get_next_medication(db: Session, elderly_id: str) -> Dict[str, Any]:
    """Retrieves the next upcoming or due medication for today."""
    now = datetime.now(timezone.utc)
    # Check for any currently DUE medication first
    due_log = db.query(MedicationLog).filter(
        MedicationLog.elderly_id == elderly_id,
        MedicationLog.status == "DUE"
    ).order_by(MedicationLog.scheduled_for.asc()).first()

    if due_log:
        return {
            "status": "DUE_NOW",
            "medication": due_log.medication.name if due_log.medication else "Medication",
            "dosage": due_log.medication.dosage if due_log.medication else "",
            "scheduled_for": due_log.scheduled_for.strftime("%I:%M %p"),
            "instructions": due_log.medication.instructions if due_log.medication else ""
        }

    upcoming = db.query(MedicationLog).filter(
        MedicationLog.elderly_id == elderly_id,
        MedicationLog.status == "UPCOMING",
        MedicationLog.scheduled_for >= now - timedelta(minutes=30)
    ).order_by(MedicationLog.scheduled_for.asc()).first()

    if upcoming:
        return {
            "status": "UPCOMING",
            "medication": upcoming.medication.name if upcoming.medication else "Medication",
            "dosage": upcoming.medication.dosage if upcoming.medication else "",
            "scheduled_for": upcoming.scheduled_for.strftime("%I:%M %p"),
            "instructions": upcoming.medication.instructions if upcoming.medication else ""
        }

    return {"status": "NONE_PENDING", "message": "No more medications scheduled for today."}

def tool_get_health_records(db: Session, elderly_id: str) -> Dict[str, Any]:
    """Retrieves the most recent recorded health metrics."""
    metrics = ["heart_rate", "blood_pressure", "blood_oxygen", "temperature", "blood_glucose", "weight"]
    latest_records = {}
    for metric in metrics:
        rec = db.query(HealthRecord).filter(
            HealthRecord.elderly_id == elderly_id,
            HealthRecord.metric_type == metric
        ).order_by(HealthRecord.timestamp.desc()).first()
        if rec:
            val_str = f"{rec.value}/{rec.secondary_value}" if rec.secondary_value is not None else f"{rec.value}"
            latest_records[metric] = {
                "value": val_str,
                "unit": rec.unit,
                "timestamp": rec.timestamp.strftime("%b %d, %I:%M %p")
            }
    return {"vitals": latest_records}

def tool_get_emergency_contacts(db: Session, elderly_id: str) -> Dict[str, Any]:
    """Retrieves the emergency contact numbers."""
    contacts = db.query(EmergencyContact).filter(
        EmergencyContact.elderly_id == elderly_id
    ).order_by(EmergencyContact.priority_order.asc()).all()

    return {
        "contacts": [
            {
                "name": c.name,
                "relationship": c.relationship,
                "phone": c.phone_number,
                "is_primary": c.is_primary
            }
            for c in contacts
        ]
    }

async def tool_trigger_emergency(db: Session, elderly_id: str, location: str = "Home") -> Dict[str, Any]:
    """Triggers an immediate emergency alert."""
    alert = await trigger_emergency_alert(
        db=db,
        elderly_id=elderly_id,
        alert_type="SOS_BUTTON",
        location=location,
        confidence=1.0,
        details={"source": "AI_ASSISTANT_VOICE_COMMAND"}
    )
    return {
        "status": "EMERGENCY_TRIGGERED",
        "alert_id": alert.id,
        "location": location,
        "message": "Emergency alert has been dispatched to your caregivers immediately."
    }

def tool_get_recent_events(db: Session, elderly_id: str) -> Dict[str, Any]:
    """Retrieves recent events from today's timeline."""
    events = db.query(Event).filter(
        Event.elderly_id == elderly_id
    ).order_by(Event.created_at.desc()).limit(5).all()

    return {
        "events": [
            {
                "type": e.event_type,
                "description": e.description,
                "time": e.created_at.strftime("%I:%M %p") if e.created_at else ""
            }
            for e in events
        ]
    }

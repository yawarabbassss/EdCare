import logging
from datetime import datetime, timezone, date, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.models import Medication, MedicationSchedule, MedicationLog, ElderlyProfile, User
from app.services.notification_service import notification_service, ws_manager
from app.services.event_service import log_system_event
from app.services.audit_service import log_audit_event

logger = logging.getLogger("leo.medications")

def generate_daily_medication_logs(db: Session, target_date: Optional[date] = None):
    """
    Ensures that for all active medications and their schedules,
    MedicationLog records exist for the specified target date (defaults to today).
    """
    if target_date is None:
        target_date = datetime.now(timezone.utc).date()

    day_name = target_date.strftime("%a").upper()  # MON, TUE, WED, etc.
    active_meds = db.query(Medication).filter(Medication.is_active == True).all()

    for med in active_meds:
        for schedule in med.schedules:
            if not schedule.is_active:
                continue
            if schedule.days_of_week != "ALL" and day_name not in schedule.days_of_week:
                continue

            # Parse reminder_time (e.g. "08:00")
            try:
                hour, minute = map(int, schedule.reminder_time.split(":"))
                scheduled_dt = datetime(
                    year=target_date.year,
                    month=target_date.month,
                    day=target_date.day,
                    hour=hour,
                    minute=minute,
                    tzinfo=timezone.utc
                )
            except Exception:
                continue

            # Check if log already exists
            start_window = scheduled_dt - timedelta(minutes=5)
            end_window = scheduled_dt + timedelta(minutes=5)
            existing = db.query(MedicationLog).filter(
                MedicationLog.schedule_id == schedule.id,
                MedicationLog.scheduled_for >= start_window,
                MedicationLog.scheduled_for <= end_window
            ).first()

            if not existing:
                log = MedicationLog(
                    schedule_id=schedule.id,
                    medication_id=med.id,
                    elderly_id=med.elderly_id,
                    scheduled_for=scheduled_dt,
                    status="UPCOMING"
                )
                db.add(log)
    db.commit()

async def record_medication_status(
    db: Session,
    log_id: str,
    status: str,  # TAKEN, MISSED, SKIPPED, DUE
    user: Optional[User] = None,
    notes: Optional[str] = None
) -> MedicationLog:
    log = db.query(MedicationLog).filter(MedicationLog.id == log_id).first()
    if not log:
        raise ValueError("Medication log not found")

    log.status = status
    now = datetime.now(timezone.utc)
    if status == "TAKEN":
        log.taken_at = now
    if notes:
        log.notes = notes
    if user:
        log.recorded_by_id = user.id

    db.commit()
    db.refresh(log)

    med = log.medication
    med_name = med.name if med else "Medication"
    dosage = med.dosage if med else ""

    # Log timeline event
    severity = "CRITICAL" if status == "MISSED" else "INFO"
    await log_system_event(
        db=db,
        elderly_id=log.elderly_id,
        event_type=f"MEDICATION_{status}",
        description=f"Medication {med_name} ({dosage}) marked as {status}",
        severity=severity,
        metadata={"log_id": log.id, "medication_id": log.medication_id, "status": status}
    )

    if user:
        log_audit_event(
            db=db,
            action=f"MEDICATION_MARKED_{status}",
            user_id=user.id,
            target_type="MedicationLog",
            target_id=log.id,
            details={"medication": med_name, "status": status, "notes": notes}
        )

    # Broadcast update
    await ws_manager.broadcast({
        "type": "MEDICATION_STATUS_CHANGED",
        "log_id": log.id,
        "medication_id": log.medication_id,
        "elderly_id": log.elderly_id,
        "status": status,
        "taken_at": log.taken_at.isoformat() if log.taken_at else None,
        "medication_name": med_name
    })

    return log

def calculate_adherence_rate(db: Session, elderly_id: str, days: int = 7) -> float:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    logs = db.query(MedicationLog).filter(
        MedicationLog.elderly_id == elderly_id,
        MedicationLog.scheduled_for >= cutoff,
        MedicationLog.status.in_(["TAKEN", "MISSED", "SKIPPED"])
    ).all()

    if not logs:
        return 100.0
    taken_count = sum(1 for l in logs if l.status == "TAKEN")
    return round((taken_count / len(logs)) * 100, 1)

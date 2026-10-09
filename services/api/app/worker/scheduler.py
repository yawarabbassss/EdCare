import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.models import MedicationLog, Alert, Camera, ElderlyProfile, CaregiverRelationship
from app.services.medication_service import generate_daily_medication_logs, record_medication_status
from app.services.alert_service import trigger_emergency_alert, update_alert_status
from app.services.notification_service import notification_service, ws_manager

logger = logging.getLogger("leo.scheduler")

scheduler = AsyncIOScheduler()

async def check_medication_schedules():
    """Checks upcoming and due medications every minute"""
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        # Ensure daily logs exist
        generate_daily_medication_logs(db, now.date())

        # Check UPCOMING medications within the due window (within 10 mins)
        due_window_start = now - timedelta(minutes=15)
        due_window_end = now + timedelta(minutes=5)

        upcoming_logs = db.query(MedicationLog).filter(
            MedicationLog.status == "UPCOMING",
            MedicationLog.scheduled_for >= due_window_start,
            MedicationLog.scheduled_for <= due_window_end
        ).all()

        for log in upcoming_logs:
            log.status = "DUE"
            db.commit()
            med_name = log.medication.name if log.medication else "Medication"
            dosage = log.medication.dosage if log.medication else ""
            logger.info(f"Medication {med_name} is now DUE for elderly_id={log.elderly_id}")
            
            # Broadcast to Elderly Kiosk and Caregiver dashboard
            await ws_manager.broadcast({
                "type": "MEDICATION_DUE",
                "log_id": log.id,
                "medication_id": log.medication_id,
                "elderly_id": log.elderly_id,
                "medication_name": med_name,
                "dosage": dosage,
                "scheduled_for": log.scheduled_for.isoformat()
            })

        # Check for MISSED medications (DUE for more than 45 minutes)
        missed_cutoff = now - timedelta(minutes=45)
        missed_logs = db.query(MedicationLog).filter(
            MedicationLog.status == "DUE",
            MedicationLog.scheduled_for < missed_cutoff
        ).all()

        for log in missed_logs:
            await record_medication_status(db, log.id, status="MISSED")
            med_name = log.medication.name if log.medication else "Medication"
            await trigger_emergency_alert(
                db=db,
                elderly_id=log.elderly_id,
                alert_type="MISSED_MEDICATION",
                location="Medication Schedule",
                confidence=1.0,
                details={
                    "medication": med_name,
                    "scheduled_for": log.scheduled_for.isoformat(),
                    "message": f"Dose of {med_name} was missed after 45 minute window."
                }
            )
    except Exception as e:
        logger.error(f"Error in medication scheduler: {e}")
    finally:
        db.close()

async def check_alert_escalations():
    """Escalates DETECTED emergency alerts that haven't been acknowledged in 3 minutes"""
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        escalation_cutoff = now - timedelta(minutes=3)

        unacknowledged_alerts = db.query(Alert).filter(
            Alert.status == "DETECTED",
            Alert.alert_type.in_(["POSSIBLE_FALL", "SOS_BUTTON"]),
            Alert.created_at < escalation_cutoff
        ).all()

        for alert in unacknowledged_alerts:
            alert.status = "ESCALATED"
            db.commit()
            logger.warning(f"🚨 ALERT {alert.id} ESCALATED! No acknowledgement within 3 minutes.")
            
            await ws_manager.broadcast({
                "type": "ALERT_ESCALATED",
                "alert_id": alert.id,
                "elderly_id": alert.elderly_id,
                "alert_type": alert.alert_type,
                "location": alert.location,
                "created_at": alert.created_at.isoformat()
            })
    except Exception as e:
        logger.error(f"Error in alert escalation job: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler.add_job(check_medication_schedules, "interval", minutes=1, id="check_medications")
    scheduler.add_job(check_alert_escalations, "interval", seconds=30, id="check_escalations")
    scheduler.start()
    logger.info("Background job scheduler started successfully.")

def shutdown_scheduler():
    scheduler.shutdown()
    logger.info("Background job scheduler stopped.")

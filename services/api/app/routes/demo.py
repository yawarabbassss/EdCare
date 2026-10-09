import random
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import ElderlyProfile, Medication, MedicationLog, Camera, User
from app.services.alert_service import trigger_emergency_alert
from app.services.health_service import record_health_metric
from app.services.medication_service import record_medication_status
from app.services.notification_service import ws_manager

router = APIRouter(prefix="/demo", tags=["Demo & Simulation"])

@router.post("/simulate-fall")
async def simulate_fall_event(
    elderly_id: Optional[str] = None,
    location: str = "Bedroom",
    db: Session = Depends(get_db)
):
    profile = None
    if elderly_id:
        profile = db.query(ElderlyProfile).filter(ElderlyProfile.id == elderly_id).first()
    if not profile:
        profile = db.query(ElderlyProfile).first()

    if not profile:
        raise HTTPException(status_code=400, detail="No elderly profile found. Please seed database first.")

    camera = db.query(Camera).filter(Camera.elderly_id == profile.id).first()
    camera_id = camera.id if camera else None

    alert = await trigger_emergency_alert(
        db=db,
        elderly_id=profile.id,
        camera_id=camera_id,
        alert_type="POSSIBLE_FALL",
        location=location,
        confidence=0.94,
        details={
            "is_demo": True,
            "simulation_label": "DEMO EVENT - SIMULATED FALL",
            "aspect_ratio": 1.45,
            "floor_proximity": 0.88,
            "duration_down_seconds": 3.8
        }
    )
    return {"status": "SUCCESS", "message": "DEMO EVENT: Fall simulated successfully", "alert_id": alert.id}

@router.post("/simulate-medication-due")
async def simulate_medication_due(
    elderly_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    profile = None
    if elderly_id:
        profile = db.query(ElderlyProfile).filter(ElderlyProfile.id == elderly_id).first()
    if not profile:
        profile = db.query(ElderlyProfile).first()

    if not profile:
        raise HTTPException(status_code=400, detail="No elderly profile found.")

    med = db.query(Medication).filter(Medication.elderly_id == profile.id).first()
    if not med:
        raise HTTPException(status_code=400, detail="No medication found for elderly profile.")

    # Create a DUE log right now
    now = datetime.now(timezone.utc)
    log = MedicationLog(
        medication_id=med.id,
        elderly_id=profile.id,
        scheduled_for=now,
        status="DUE"
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    await ws_manager.broadcast({
        "type": "MEDICATION_DUE",
        "log_id": log.id,
        "medication_id": med.id,
        "elderly_id": profile.id,
        "medication_name": med.name,
        "dosage": med.dosage,
        "scheduled_for": log.scheduled_for.isoformat(),
        "is_demo": True
    })

    return {"status": "SUCCESS", "message": f"DEMO EVENT: Medication {med.name} marked as DUE NOW", "log_id": log.id}

@router.post("/simulate-vitals-anomaly")
async def simulate_vitals_anomaly(
    elderly_id: Optional[str] = None,
    metric_type: str = "heart_rate",
    value: float = 126.0,
    unit: str = "bpm",
    db: Session = Depends(get_db)
):
    profile = None
    if elderly_id:
        profile = db.query(ElderlyProfile).filter(ElderlyProfile.id == elderly_id).first()
    if not profile:
        profile = db.query(ElderlyProfile).first()

    if not profile:
        raise HTTPException(status_code=400, detail="No elderly profile found.")

    rec = await record_health_metric(
        db=db,
        elderly_id=profile.id,
        metric_type=metric_type,
        value=value,
        unit=unit,
        source="DEMO_SMARTWATCH",
        notes="Simulated vital anomaly event"
    )

    return {"status": "SUCCESS", "message": f"DEMO EVENT: Abnormal {metric_type} reading logged", "record_id": rec.id}

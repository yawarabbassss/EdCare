from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.models import Medication, MedicationSchedule, MedicationLog, User, ElderlyProfile
from app.schemas.schemas import (
    MedicationCreate,
    MedicationUpdate,
    MedicationResponse,
    MedicationLogResponse,
    MedicationLogCreate,
    MedicationLogUpdate
)
from app.services.auth_service import get_current_user
from app.services.medication_service import (
    generate_daily_medication_logs,
    record_medication_status,
    calculate_adherence_rate
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/medications", tags=["Medications"])

@router.get("", response_model=List[MedicationResponse])
def list_medications(
    elderly_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Medication)
    if elderly_id:
        query = query.filter(Medication.elderly_id == elderly_id)
    return query.all()

@router.post("", response_model=MedicationResponse)
def create_medication(
    payload: MedicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    med = Medication(
        elderly_id=payload.elderly_id,
        name=payload.name,
        dosage=payload.dosage,
        instructions=payload.instructions,
        frequency=payload.frequency,
        start_date=payload.start_date,
        end_date=payload.end_date,
        notes=payload.notes
    )
    db.add(med)
    db.commit()
    db.refresh(med)

    for sch in payload.schedules:
        schedule_entry = MedicationSchedule(
            medication_id=med.id,
            reminder_time=sch.reminder_time,
            days_of_week=sch.days_of_week,
            is_active=sch.is_active
        )
        db.add(schedule_entry)
    db.commit()
    db.refresh(med)

    # Generate logs for today
    generate_daily_medication_logs(db)

    log_audit_event(db, "MEDICATION_CREATED", user_id=current_user.id, target_type="Medication", target_id=med.id)
    return med

@router.put("/{med_id}", response_model=MedicationResponse)
def update_medication(
    med_id: str,
    payload: MedicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(med, field, val)

    db.commit()
    db.refresh(med)
    return med

@router.delete("/{med_id}")
def delete_medication(
    med_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    db.delete(med)
    db.commit()
    return {"status": "SUCCESS", "message": "Medication removed"}

@router.get("/logs", response_model=List[MedicationLogResponse])
def get_medication_logs(
    elderly_id: Optional[str] = None,
    day_offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure logs generated
    generate_daily_medication_logs(db)

    now = datetime.now(timezone.utc)
    target_day = (now + timedelta(days=day_offset)).date()
    day_start = datetime(target_day.year, target_day.month, target_day.day, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    query = db.query(MedicationLog).filter(
        MedicationLog.scheduled_for >= day_start,
        MedicationLog.scheduled_for < day_end
    )
    if elderly_id:
        query = query.filter(MedicationLog.elderly_id == elderly_id)

    return query.order_by(MedicationLog.scheduled_for.asc()).all()

@router.put("/logs/{log_id}/status", response_model=MedicationLogResponse)
async def update_log_status(
    log_id: str,
    payload: MedicationLogUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        updated_log = await record_medication_status(
            db=db,
            log_id=log_id,
            status=payload.status,
            user=current_user,
            notes=payload.notes
        )
        return updated_log
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/adherence/{elderly_id}")
def get_adherence(
    elderly_id: str,
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rate = calculate_adherence_rate(db, elderly_id, days=days)
    return {"elderly_id": elderly_id, "days": days, "adherence_rate_percentage": rate}

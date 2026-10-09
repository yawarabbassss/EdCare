from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.models import HealthRecord, HealthThreshold, User, ElderlyProfile
from app.schemas.schemas import (
    HealthRecordCreate,
    HealthRecordResponse,
    HealthThresholdCreate,
    HealthThresholdResponse
)
from app.services.auth_service import get_current_user
from app.services.health_service import record_health_metric
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/health", tags=["Health Records"])

@router.get("/records", response_model=List[HealthRecordResponse])
def get_health_records(
    elderly_id: Optional[str] = None,
    metric_type: Optional[str] = None,
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    query = db.query(HealthRecord).filter(HealthRecord.timestamp >= cutoff)

    if elderly_id:
        query = query.filter(HealthRecord.elderly_id == elderly_id)
    if metric_type:
        query = query.filter(HealthRecord.metric_type == metric_type)

    return query.order_by(HealthRecord.timestamp.asc()).all()

@router.post("/records", response_model=HealthRecordResponse)
async def add_health_record(
    payload: HealthRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = await record_health_metric(
        db=db,
        elderly_id=payload.elderly_id,
        metric_type=payload.metric_type,
        value=payload.value,
        unit=payload.unit,
        secondary_value=payload.secondary_value,
        source=payload.source,
        notes=payload.notes,
        recorded_by_id=current_user.id
    )
    log_audit_event(
        db,
        action="HEALTH_METRIC_RECORDED",
        user_id=current_user.id,
        target_type="HealthRecord",
        target_id=rec.id,
        details={"metric": payload.metric_type, "value": payload.value}
    )
    return rec

@router.get("/thresholds", response_model=List[HealthThresholdResponse])
def get_thresholds(
    elderly_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(HealthThreshold)
    if elderly_id:
        query = query.filter(HealthThreshold.elderly_id == elderly_id)
    return query.all()

@router.post("/thresholds", response_model=HealthThresholdResponse)
def set_health_threshold(
    payload: HealthThresholdCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(HealthThreshold).filter(
        HealthThreshold.elderly_id == payload.elderly_id,
        HealthThreshold.metric_type == payload.metric_type
    ).first()

    if existing:
        existing.min_value = payload.min_value
        existing.max_value = payload.max_value
        existing.is_active = payload.is_active
        db.commit()
        db.refresh(existing)
        return existing

    threshold = HealthThreshold(
        elderly_id=payload.elderly_id,
        metric_type=payload.metric_type,
        min_value=payload.min_value,
        max_value=payload.max_value,
        is_active=payload.is_active
    )
    db.add(threshold)
    db.commit()
    db.refresh(threshold)
    return threshold

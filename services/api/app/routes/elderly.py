from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.models import User, ElderlyProfile, CaregiverRelationship, Alert, MedicationLog, HealthRecord, Camera
from app.schemas.schemas import ElderlyProfileResponse, ElderlyProfileUpdate, UserResponse
from app.services.auth_service import get_current_user, require_roles
from app.services.medication_service import calculate_adherence_rate

router = APIRouter(prefix="/elderly", tags=["Elderly Profiles"])

@router.get("/profile", response_model=ElderlyProfileResponse)
def get_my_elderly_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(ElderlyProfile).filter(ElderlyProfile.user_id == current_user.id).first()
    if not profile:
        # Create on demand if user has role
        profile = ElderlyProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.get("/list", response_model=List[ElderlyProfileResponse])
def list_all_elderly_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "ADMIN":
        return db.query(ElderlyProfile).all()
    elif current_user.role == "CAREGIVER":
        # Get all elderly users linked to this caregiver
        links = db.query(CaregiverRelationship).filter(
            CaregiverRelationship.caregiver_id == current_user.id
        ).all()
        elderly_user_ids = [l.elderly_id for l in links]
        return db.query(ElderlyProfile).filter(ElderlyProfile.user_id.in_(elderly_user_ids)).all()
    else:
        # Elderly sees self
        return db.query(ElderlyProfile).filter(ElderlyProfile.user_id == current_user.id).all()

@router.get("/summary/{profile_id}")
def get_elderly_dashboard_summary(
    profile_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(ElderlyProfile).filter(ElderlyProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Elderly profile not found")

    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    today_end = today_start + timedelta(days=1)

    # Active alerts
    active_alerts = db.query(Alert).filter(
        Alert.elderly_id == profile.id,
        Alert.status.in_(["DETECTED", "ESCALATED"])
    ).order_by(Alert.created_at.desc()).all()

    # Today's medications
    todays_logs = db.query(MedicationLog).filter(
        MedicationLog.elderly_id == profile.id,
        MedicationLog.scheduled_for >= today_start,
        MedicationLog.scheduled_for < today_end
    ).all()

    taken_meds = sum(1 for l in todays_logs if l.status == "TAKEN")
    due_meds = sum(1 for l in todays_logs if l.status == "DUE")
    missed_meds = sum(1 for l in todays_logs if l.status == "MISSED")
    total_meds = len(todays_logs)

    # Adherence rate
    adherence = calculate_adherence_rate(db, profile.id, days=7)

    # Online cameras
    cameras = db.query(Camera).filter(Camera.elderly_id == profile.id).all()
    online_cameras = sum(1 for c in cameras if c.is_online)

    # Latest vitals
    vitals = {}
    for metric in ["heart_rate", "blood_pressure", "blood_oxygen", "temperature"]:
        rec = db.query(HealthRecord).filter(
            HealthRecord.elderly_id == profile.id,
            HealthRecord.metric_type == metric
        ).order_by(HealthRecord.timestamp.desc()).first()
        if rec:
            val_str = f"{rec.value}/{rec.secondary_value}" if rec.secondary_value is not None else f"{rec.value}"
            vitals[metric] = {
                "value": val_str,
                "unit": rec.unit,
                "timestamp": rec.timestamp.isoformat()
            }

    return {
        "profile": {
            "id": profile.id,
            "full_name": profile.user.full_name if profile.user else "Resident",
            "blood_type": profile.blood_type,
            "room_number": profile.room_number,
            "fall_risk_level": profile.fall_risk_level
        },
        "stats": {
            "active_alerts_count": len(active_alerts),
            "medications_today": {
                "total": total_meds,
                "taken": taken_meds,
                "due": due_meds,
                "missed": missed_meds
            },
            "adherence_rate": adherence,
            "cameras": {
                "total": len(cameras),
                "online": online_cameras
            }
        },
        "latest_vitals": vitals,
        "active_alerts": [
            {
                "id": a.id,
                "alert_type": a.alert_type,
                "status": a.status,
                "confidence": a.confidence,
                "location": a.location,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in active_alerts
        ]
    }

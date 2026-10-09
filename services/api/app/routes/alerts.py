from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.models import Alert, User, ElderlyProfile
from app.schemas.schemas import AlertResponse, AlertStatusUpdate, AlertCreate
from app.services.auth_service import get_current_user
from app.services.alert_service import trigger_emergency_alert, update_alert_status

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    elderly_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if elderly_id:
        query = query.filter(Alert.elderly_id == elderly_id)
    if status_filter:
        query = query.filter(Alert.status == status_filter)
    return query.order_by(Alert.created_at.desc()).limit(limit).all()

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert_by_id(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.put("/{alert_id}/status", response_model=AlertResponse)
async def change_alert_status(
    alert_id: str,
    payload: AlertStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        updated = await update_alert_status(
            db=db,
            alert_id=alert_id,
            new_status=payload.status,
            user=current_user,
            notes=payload.notes
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/trigger-sos")
async def trigger_manual_sos(
    elderly_id: Optional[str] = None,
    location: str = "Living Room",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Triggered by the Elderly Kiosk 🆘 EMERGENCY button or Caregiver"""
    target_elderly_id = elderly_id
    if not target_elderly_id and current_user.role == "ELDERLY_USER":
        profile = db.query(ElderlyProfile).filter(ElderlyProfile.user_id == current_user.id).first()
        if profile:
            target_elderly_id = profile.id

    if not target_elderly_id:
        # Fallback to first elderly profile in DB
        first_p = db.query(ElderlyProfile).first()
        target_elderly_id = first_p.id if first_p else "demo_elderly_id"

    alert = await trigger_emergency_alert(
        db=db,
        elderly_id=target_elderly_id,
        alert_type="SOS_BUTTON",
        location=location,
        confidence=1.0,
        details={"triggered_by_user": current_user.full_name, "role": current_user.role}
    )
    return {"status": "SUCCESS", "alert_id": alert.id, "message": "Emergency SOS broadcasted."}

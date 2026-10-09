import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import CameraZone, Camera, User
from app.schemas.schemas import CameraZoneCreate, CameraZoneResponse
from app.services.auth_service import get_current_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/zones", tags=["Safe Zones"])

@router.get("/camera/{camera_id}", response_model=List[CameraZoneResponse])
def get_camera_zones(
    camera_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(CameraZone).filter(CameraZone.camera_id == camera_id).all()

@router.post("/camera/{camera_id}", response_model=CameraZoneResponse)
def create_camera_zone(
    camera_id: str,
    payload: CameraZoneCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    zone = CameraZone(
        camera_id=camera_id,
        name=payload.name,
        zone_type=payload.zone_type,
        coordinates_json=payload.coordinates_json,
        suppress_fall_alerts=payload.suppress_fall_alerts,
        enabled=payload.enabled
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)

    log_audit_event(db, "SAFE_ZONE_CREATED", user_id=current_user.id, target_type="CameraZone", target_id=zone.id)
    return zone

@router.delete("/{zone_id}")
def delete_camera_zone(
    zone_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    zone = db.query(CameraZone).filter(CameraZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    db.delete(zone)
    db.commit()
    log_audit_event(db, "SAFE_ZONE_DELETED", user_id=current_user.id, target_type="CameraZone", target_id=zone_id)
    return {"status": "SUCCESS", "message": "Zone deleted"}

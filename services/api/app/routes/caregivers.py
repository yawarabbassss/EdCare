from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import User, CaregiverRelationship, ElderlyProfile
from app.schemas.schemas import CaregiverLinkCreate, CaregiverLinkResponse
from app.services.auth_service import get_current_user, require_roles
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/caregivers", tags=["Caregivers"])

@router.get("/my-patients", response_model=List[CaregiverLinkResponse])
def get_my_assigned_patients(
    current_user: User = Depends(require_roles(["CAREGIVER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    if current_user.role == "ADMIN":
        return db.query(CaregiverRelationship).all()
    return db.query(CaregiverRelationship).filter(
        CaregiverRelationship.caregiver_id == current_user.id
    ).all()

@router.post("/link", response_model=CaregiverLinkResponse)
def link_caregiver_to_elderly(
    payload: CaregiverLinkCreate,
    current_user: User = Depends(require_roles(["ADMIN", "CAREGIVER"])),
    db: Session = Depends(get_db)
):
    existing = db.query(CaregiverRelationship).filter(
        CaregiverRelationship.caregiver_id == payload.caregiver_id,
        CaregiverRelationship.elderly_id == payload.elderly_id
    ).first()

    if existing:
        return existing

    link = CaregiverRelationship(
        caregiver_id=payload.caregiver_id,
        elderly_id=payload.elderly_id,
        relationship_type=payload.relationship_type,
        is_primary=payload.is_primary,
        permissions=payload.permissions
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    log_audit_event(
        db=db,
        action="CAREGIVER_LINK_CREATED",
        user_id=current_user.id,
        target_type="CaregiverRelationship",
        target_id=link.id
    )

    return link

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.models import EmergencyContact, User, ElderlyProfile
from app.schemas.schemas import EmergencyContactCreate, EmergencyContactUpdate, EmergencyContactResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/contacts", tags=["Emergency Contacts"])

@router.get("", response_model=List[EmergencyContactResponse])
def list_contacts(
    elderly_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(EmergencyContact)
    if elderly_id:
        query = query.filter(EmergencyContact.elderly_id == elderly_id)
    return query.order_by(EmergencyContact.priority_order.asc()).all()

@router.post("", response_model=EmergencyContactResponse)
def add_contact(
    payload: EmergencyContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contact = EmergencyContact(
        elderly_id=payload.elderly_id,
        name=payload.name,
        relationship=payload.relationship,
        phone_number=payload.phone_number,
        email=payload.email,
        is_primary=payload.is_primary,
        priority_order=payload.priority_order
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.delete("/{contact_id}")
def delete_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contact = db.query(EmergencyContact).filter(EmergencyContact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
    return {"status": "SUCCESS", "message": "Emergency contact deleted"}

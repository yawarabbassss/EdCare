from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.models import Event, User
from app.schemas.schemas import EventResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("", response_model=List[EventResponse])
def get_timeline_events(
    elderly_id: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Event)
    if elderly_id:
        query = query.filter(Event.elderly_id == elderly_id)
    return query.order_by(Event.created_at.desc()).limit(limit).all()

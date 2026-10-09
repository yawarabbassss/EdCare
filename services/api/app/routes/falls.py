import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import FallDetectionWebhook
from app.services.alert_service import trigger_emergency_alert

router = APIRouter(prefix="/falls", tags=["Fall Ingestion"])
logger = logging.getLogger("leo.falls_route")

@router.post("/webhook")
async def ingest_fall_detection(
    payload: FallDetectionWebhook,
    db: Session = Depends(get_db)
):
    """
    Ingests verified fall detection events from local computer vision services.
    """
    logger.warning(f"Received fall detection webhook from camera {payload.camera_id} for elderly {payload.elderly_id} (confidence: {payload.confidence})")
    
    alert = await trigger_emergency_alert(
        db=db,
        elderly_id=payload.elderly_id,
        camera_id=payload.camera_id,
        alert_type="POSSIBLE_FALL",
        location=payload.location,
        confidence=payload.confidence,
        details=payload.details
    )
    return {"status": "RECEIVED", "alert_id": alert.id}

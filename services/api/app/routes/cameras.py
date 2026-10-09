import io
import time
import json
import cv2
import logging
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Camera, CameraZone, User, ElderlyProfile
from app.schemas.schemas import CameraCreate, CameraUpdate, CameraResponse
from app.services.auth_service import get_current_user
from app.services.audit_service import log_audit_event
from services.vision.camera_manager import CameraStream

router = APIRouter(prefix="/cameras", tags=["Cameras"])
logger = logging.getLogger("leo.camera_routes")

# Active Camera stream instances in memory
active_camera_streams: Dict[str, CameraStream] = {}

def get_or_create_stream(camera: Camera) -> CameraStream:
    if camera.id not in active_camera_streams:
        stream = CameraStream(
            camera_id=camera.id,
            name=camera.name,
            location=camera.location,
            stream_source=camera.stream_url
        )
        # Load safe zones
        if camera.zones:
            stream.zones = [
                {
                    "name": z.name,
                    "zone_type": z.zone_type,
                    "coordinates_json": z.coordinates_json,
                    "suppress_fall_alerts": z.suppress_fall_alerts,
                    "enabled": z.enabled
                }
                for z in camera.zones
            ]
        active_camera_streams[camera.id] = stream
    return active_camera_streams[camera.id]

@router.get("", response_model=List[CameraResponse])
def list_cameras(
    elderly_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Camera)
    if elderly_id:
        query = query.filter(Camera.elderly_id == elderly_id)
    return query.all()

@router.post("", response_model=CameraResponse)
def create_camera(
    payload: CameraCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    camera = Camera(
        elderly_id=payload.elderly_id,
        name=payload.name,
        location=payload.location,
        stream_url=payload.stream_url,
        fps=payload.fps,
        resolution=payload.resolution,
        sensitivity=payload.sensitivity
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)

    log_audit_event(db, "CAMERA_CREATED", user_id=current_user.id, target_type="Camera", target_id=camera.id)
    return camera

@router.put("/{camera_id}", response_model=CameraResponse)
def update_camera(
    camera_id: str,
    payload: CameraUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(camera, field, val)

    db.commit()
    db.refresh(camera)
    return camera

@router.post("/{camera_id}/simulate")
def trigger_camera_simulation(
    camera_id: str,
    action: str,  # WALKING, SITTING, BED_SAFE, FALL
    db: Session = Depends(get_db)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    stream = get_or_create_stream(camera)
    stream.set_simulation_action(action)
    return {"status": "SUCCESS", "camera_id": camera_id, "action": action}

def generate_mjpeg_stream(camera: Camera):
    stream = get_or_create_stream(camera)
    while True:
        ret, frame, detections, alert = stream.read_frame()
        if not ret:
            break
        
        # Encode frame to JPEG
        _, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
        frame_bytes = buffer.tobytes()

        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
        time.sleep(0.066)  # ~15 FPS

@router.get("/{camera_id}/stream")
def stream_camera_feed(camera_id: str, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    return StreamingResponse(
        generate_mjpeg_stream(camera),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

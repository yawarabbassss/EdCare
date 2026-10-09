import time
import json
import logging
from typing import Optional
import httpx
from services.vision.camera_manager import CameraStream

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("leo.vision_runner")

def run_vision_loop(
    camera_id: str = "cam_01",
    elderly_id: str = "demo_elderly_id",
    api_url: str = "http://localhost:8000/api/v1/falls/webhook",
    source: str = "0",
    max_frames: Optional[int] = None
):
    logger.info(f"Starting EdCare Computer Vision Fall Detection Service on camera {camera_id}...")
    stream = CameraStream(camera_id=camera_id, name="Living Room Cam", location="Living Room", stream_source=source)
    
    frame_count = 0
    client = httpx.Client(timeout=5.0)

    try:
        while True:
            ret, frame, detections, alert = stream.read_frame()
            if not ret:
                break

            if alert:
                logger.warning(f"🚨 ALERT! Fall detected: {alert.to_dict()}")
                try:
                    payload = {
                        "camera_id": alert.camera_id,
                        "elderly_id": elderly_id,
                        "event_type": alert.event_type,
                        "confidence": alert.confidence,
                        "location": alert.location,
                        "details": alert.details,
                        "is_demo": stream.is_synthetic
                    }
                    resp = client.post(api_url, json=payload)
                    logger.info(f"Alert sent to API: {resp.status_code}")
                except Exception as e:
                    logger.error(f"Failed to post alert to API: {e}")

            frame_count += 1
            if max_frames and frame_count >= max_frames:
                break

            time.sleep(0.066)  # ~15 FPS
    except KeyboardInterrupt:
        logger.info("Stopping vision service.")
    finally:
        client.close()

if __name__ == "__main__":
    run_vision_loop()

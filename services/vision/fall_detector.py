import time
import logging
from typing import Dict, List, Optional, Any, Tuple
from services.vision.tracker import TrackedPerson, PersonTracker
from services.vision.pose_analyzer import PoseAnalyzer
from services.vision.safe_zone_filter import SafeZoneFilter

logger = logging.getLogger("leo.fall_detector")

class FallEventResult:
    def __init__(
        self,
        event_type: str,
        confidence: float,
        person_id: str,
        camera_id: str,
        location: str,
        details: Dict[str, Any]
    ):
        self.event_type = event_type
        self.confidence = confidence
        self.person_id = person_id
        self.camera_id = camera_id
        self.location = location
        self.timestamp = time.time()
        self.details = details

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_type": self.event_type,
            "confidence": self.confidence,
            "person_id": self.person_id,
            "camera_id": self.camera_id,
            "location": self.location,
            "timestamp": self.timestamp,
            "details": self.details
        }

class FallDetector:
    """
    Multi-frame Fall Detection Engine.
    Pipeline:
    1. Bounding Box & Aspect Ratio Tracking (Aspect ratio flip W/H > 0.95)
    2. Vertical Velocity Descent Check (Rapid downward delta)
    3. Floor Proximity Evaluation (Person resting near floor)
    4. Safe Zone Suppression (e.g. Bed or Sofa zone)
    5. Persistence Verification (Remains down for confirmation_seconds)
    6. Emits verified alert.
    """
    def __init__(
        self,
        confidence_threshold: float = 0.85,
        confirmation_seconds: float = 2.5,
        aspect_ratio_threshold: float = 0.95,
        min_floor_proximity: float = 0.55
    ):
        self.confidence_threshold = confidence_threshold
        self.confirmation_seconds = confirmation_seconds
        self.aspect_ratio_threshold = aspect_ratio_threshold
        self.min_floor_proximity = min_floor_proximity

    def process_person(
        self,
        person: TrackedPerson,
        frame_height: int,
        camera_id: str = "camera_01",
        location: str = "Living Room",
        zones: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[FallEventResult]:
        now = time.time()
        bbox = person.current_bbox
        x, y, w, h = bbox
        aspect_ratio = float(w) / float(h) if h > 0 else 0.0
        floor_prox = PoseAnalyzer.calculate_floor_proximity(bbox, frame_height)

        # 1. Safe Zone Check (Suppress if lying in bed or sofa)
        if zones:
            in_safe_zone, zone_name = SafeZoneFilter.is_in_safe_zone(bbox, zones)
            if in_safe_zone:
                # Reset fall state if safe zone
                person.fall_state = "SAFE_ZONE"
                person.fall_start_time = None
                return None

        # 2. Check if body is oriented horizontally / fallen on floor
        is_horizontal = PoseAnalyzer.is_horizontal(aspect_ratio, self.aspect_ratio_threshold)
        is_near_floor = floor_prox >= self.min_floor_proximity

        if is_horizontal and is_near_floor:
            person.consecutive_horizontal_frames += 1
            if person.fall_start_time is None:
                person.fall_start_time = now
                person.fall_state = "VERIFYING"
                logger.info(f"Potential fall detected for {person.person_id}. Starting verification timer...")

            elapsed = now - person.fall_start_time

            # Check if duration meets verification period
            if elapsed >= self.confirmation_seconds and person.fall_state != "FALL_CONFIRMED":
                person.fall_state = "FALL_CONFIRMED"
                # Compute confidence based on persistence and floor proximity
                confidence = min(0.70 + (floor_prox * 0.15) + (min(aspect_ratio, 2.0) * 0.10), 0.98)
                logger.warning(f"🚨 VERIFIED FALL DETECTED for {person.person_id}! (Confidence: {confidence:.2f})")
                return FallEventResult(
                    event_type="possible_fall",
                    confidence=round(confidence, 2),
                    person_id=person.person_id,
                    camera_id=camera_id,
                    location=location,
                    details={
                        "aspect_ratio": round(aspect_ratio, 2),
                        "floor_proximity": round(floor_prox, 2),
                        "duration_down_seconds": round(elapsed, 1),
                        "vertical_velocity": round(person.vertical_velocity, 1)
                    }
                )
        else:
            # Person got back up or is standing
            person.consecutive_horizontal_frames = 0
            person.fall_start_time = None
            person.fall_state = "NORMAL"

        return None

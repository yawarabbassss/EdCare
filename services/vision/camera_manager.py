import cv2
import time
import math
import numpy as np
import logging
from typing import Optional, Tuple, Dict, Any, List
from services.vision.detector import PersonDetector, PersonDetection
from services.vision.tracker import PersonTracker
from services.vision.fall_detector import FallDetector, FallEventResult

logger = logging.getLogger("leo.camera_manager")

class CameraStream:
    def __init__(self, camera_id: str, name: str, location: str, stream_source: str = "0"):
        self.camera_id = camera_id
        self.name = name
        self.location = location
        self.stream_source = stream_source
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_synthetic = False
        self.sim_state = "WALKING"  # WALKING, SITTING, BED_SAFE, FALLING, DOWN
        self.sim_t = 0.0
        self.zones: List[Dict[str, Any]] = []

        # Vision pipeline components
        self.detector = PersonDetector()
        self.tracker = PersonTracker()
        self.fall_detector = FallDetector()

        self._init_source()

    def _init_source(self):
        if self.stream_source.isdigit():
            # Webcam index
            try:
                self.cap = cv2.VideoCapture(int(self.stream_source))
                if not self.cap.isOpened():
                    logger.warning(f"Webcam {self.stream_source} not accessible, activating realistic synthetic generator.")
                    self.is_synthetic = True
            except Exception:
                self.is_synthetic = True
        elif self.stream_source.startswith("rtsp://") or self.stream_source.startswith("http://") or self.stream_source.endswith(".mp4"):
            try:
                self.cap = cv2.VideoCapture(self.stream_source)
                if not self.cap.isOpened():
                    self.is_synthetic = True
            except Exception:
                self.is_synthetic = True
        else:
            self.is_synthetic = True

    def set_simulation_action(self, action: str):
        """Allows dashboard to trigger test simulations: WALKING, SITTING, BED_SAFE, FALL"""
        self.sim_state = action.upper()
        self.sim_t = 0.0
        logger.info(f"Camera {self.camera_id} simulation action set to: {self.sim_state}")

    def generate_synthetic_frame(self) -> Tuple[np.ndarray, List[PersonDetection]]:
        """Generates realistic synthetic room camera frame with moving person silhouette"""
        width, height = 640, 480
        # Create comfortable warm room background
        frame = np.full((height, width, 3), (245, 240, 235), dtype=np.uint8)

        # Draw room walls and floor perspective
        floor_y = 360
        cv2.line(frame, (0, floor_y), (width, floor_y), (200, 190, 180), 2)
        cv2.rectangle(frame, (0, floor_y), (width, height), (220, 215, 205), -1)

        # Draw Safe Zone (Bed) on right side
        bed_x1, bed_y1, bed_x2, bed_y2 = 420, 280, 600, 420
        cv2.rectangle(frame, (bed_x1, bed_y1), (bed_x2, bed_y2), (200, 230, 200), -1)
        cv2.rectangle(frame, (bed_x1, bed_y1), (bed_x2, bed_y2), (70, 150, 70), 2)
        cv2.putText(frame, "Safe Zone: Bed", (bed_x1 + 10, bed_y1 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (40, 100, 40), 1)

        # Compute person position based on current simulation state
        self.sim_t += 0.05
        t = self.sim_t

        px, py, pw, ph = 200, 180, 60, 180  # Default standing person

        if self.sim_state == "WALKING":
            # Walk left and right smoothly
            offset_x = int(math.sin(t) * 120)
            px = 250 + offset_x
            py = 180
            pw, ph = 60, 180

        elif self.sim_state == "SITTING":
            px = 240
            py = 240
            pw, ph = 70, 120  # Shorter height

        elif self.sim_state == "BED_SAFE":
            # Person lying on the bed
            px = 450
            py = 320
            pw, ph = 130, 60

        elif self.sim_state in ["FALL", "FALLING", "DOWN"]:
            # Rapid descent down to the floor then stay horizontal
            fall_progress = min(t / 1.5, 1.0)
            py = int(180 + fall_progress * (360 - 180))
            pw = int(60 + fall_progress * (160 - 60))
            ph = int(180 - fall_progress * (180 - 55))
            px = 200 + int(fall_progress * 40)

        # Draw Person Silhouette
        cv2.rectangle(frame, (px, py), (px + pw, py + ph), (90, 80, 70), -1)
        # Draw head
        if pw > ph:
            # Horizontal / lying
            cv2.circle(frame, (px + 20, py + ph // 2), 18, (80, 70, 60), -1)
        else:
            # Vertical / standing
            cv2.circle(frame, (px + pw // 2, max(py - 15, 20)), 20, (80, 70, 60), -1)

        detection = PersonDetection(bbox=(px, py, pw, ph), confidence=0.96)
        return frame, [detection]

    def read_frame(self) -> Tuple[bool, np.ndarray, List[PersonDetection], Optional[FallEventResult]]:
        frame = None
        detections: List[PersonDetection] = []

        if not self.is_synthetic and self.cap and self.cap.isOpened():
            ret, cap_frame = self.cap.read()
            if ret and cap_frame is not None:
                frame = cap_frame
                detections = self.detector.detect(frame)
            else:
                frame, detections = self.generate_synthetic_frame()
        else:
            frame, detections = self.generate_synthetic_frame()

        h, w = frame.shape[:2]

        # Update tracker
        tracked_persons = self.tracker.update(detections)

        # Check fall detector for each person
        fall_alert: Optional[FallEventResult] = None
        for pid, person in tracked_persons.items():
            alert = self.fall_detector.process_person(
                person=person,
                frame_height=h,
                camera_id=self.camera_id,
                location=self.location,
                zones=self.zones
            )
            if alert:
                fall_alert = alert

        # Render overlays on frame
        self._render_overlays(frame, tracked_persons, fall_alert)

        return True, frame, detections, fall_alert

    def _render_overlays(
        self,
        frame: np.ndarray,
        tracked: Dict[str, Any],
        alert: Optional[FallEventResult]
    ):
        # Draw camera name & timestamp
        time_str = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, f"CAM: {self.name} ({self.location}) | {time_str}", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (30, 30, 30), 2)

        # Draw tracked bounding boxes
        for pid, person in tracked.items():
            x, y, w, h = person.current_bbox
            color = (0, 200, 0)  # Green for normal
            if person.fall_state == "VERIFYING":
                color = (0, 165, 255)  # Orange
            elif person.fall_state == "FALL_CONFIRMED":
                color = (0, 0, 255)  # Red alert
            elif person.fall_state == "SAFE_ZONE":
                color = (180, 130, 0)

            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            label = f"{pid}: {person.fall_state} (AR: {person.current_bbox[2]/max(person.current_bbox[3],1):.2f})"
            cv2.putText(frame, label, (x, max(y - 8, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

        # Draw alert banner if active
        if alert:
            cv2.rectangle(frame, (0, 0), (frame.shape[1], 40), (0, 0, 220), -1)
            cv2.putText(frame, "EMERGENCY: POSSIBLE FALL DETECTED", (20, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)

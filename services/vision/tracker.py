import time
import math
from typing import Dict, List, Tuple, Optional
from services.vision.detector import PersonDetection

class TrackedPerson:
    def __init__(self, person_id: str, detection: PersonDetection):
        self.person_id = person_id
        self.history: List[Tuple[float, Tuple[int, int, int, int]]] = [(time.time(), detection.bbox)]
        self.current_bbox = detection.bbox
        self.last_seen = time.time()
        self.vertical_velocity = 0.0  # pixels per second (positive = downwards)
        self.aspect_ratio_history: List[float] = [detection.aspect_ratio]
        self.consecutive_horizontal_frames = 0
        self.fall_state = "NORMAL"  # NORMAL, DESCENDING, DOWN, VERIFYING, FALL_CONFIRMED
        self.fall_start_time: Optional[float] = None

    def update(self, detection: PersonDetection):
        now = time.time()
        prev_time, (px, py, pw, ph) = self.history[-1]
        dt = max(now - prev_time, 0.001)

        # Center Y change
        prev_center_y = py + ph / 2.0
        curr_center_y = detection.y + detection.h / 2.0
        self.vertical_velocity = (curr_center_y - prev_center_y) / dt

        self.current_bbox = detection.bbox
        self.last_seen = now
        self.history.append((now, detection.bbox))
        if len(self.history) > 60:
            self.history.pop(0)

        self.aspect_ratio_history.append(detection.aspect_ratio)
        if len(self.aspect_ratio_history) > 30:
            self.aspect_ratio_history.pop(0)

class PersonTracker:
    def __init__(self, max_disappeared_seconds: float = 2.0, max_distance: float = 280.0):
        self.next_person_id = 1
        self.tracked_persons: Dict[str, TrackedPerson] = {}
        self.max_disappeared = max_disappeared_seconds
        self.max_distance = max_distance

    def update(self, detections: List[PersonDetection]) -> Dict[str, TrackedPerson]:
        now = time.time()

        # Remove dead tracks
        dead_ids = [pid for pid, tp in self.tracked_persons.items() if (now - tp.last_seen) > self.max_disappeared]
        for pid in dead_ids:
            del self.tracked_persons[pid]

        if not detections:
            return self.tracked_persons

        # Match detections to tracked persons by Euclidean center distance
        for det in detections:
            best_id = None
            min_dist = float("inf")
            for pid, tp in self.tracked_persons.items():
                tx, ty, tw, th = tp.current_bbox
                t_center = (tx + tw / 2.0, ty + th / 2.0)
                dist = math.dist(det.center, t_center)
                if dist < min_dist and dist < self.max_distance:
                    min_dist = dist
                    best_id = pid

            if best_id is not None:
                self.tracked_persons[best_id].update(det)
            else:
                new_id = f"person_{self.next_person_id:02d}"
                self.next_person_id += 1
                self.tracked_persons[new_id] = TrackedPerson(new_id, det)

        return self.tracked_persons

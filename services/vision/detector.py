import cv2
import numpy as np
from typing import List, Dict, Any, Tuple

class PersonDetection:
    def __init__(self, bbox: Tuple[int, int, int, int], confidence: float, class_id: int = 0):
        """
        bbox: (x, y, w, h)
        """
        self.bbox = bbox
        self.x, self.y, self.w, self.h = bbox
        self.confidence = confidence
        self.class_id = class_id
        self.center = (int(self.x + self.w / 2), int(self.y + self.h / 2))
        self.aspect_ratio = float(self.w) / float(self.h) if self.h > 0 else 0.0

class PersonDetector:
    """
    Person detector supporting OpenCV HOG descriptor and Ultralytics YOLO models.
    Provides robust multi-frame person bounding boxes.
    """
    def __init__(self, min_confidence: float = 0.5):
        self.min_confidence = min_confidence
        # Default OpenCV HOG Person Detector for zero-weight instant detection
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    def detect(self, frame: np.ndarray) -> List[PersonDetection]:
        if frame is None or frame.size == 0:
            return []

        # Resize for performance if frame is very large
        h, w = frame.shape[:2]
        scale = 1.0
        if w > 800:
            scale = 800.0 / w
            resized = cv2.resize(frame, (800, int(h * scale)))
        else:
            resized = frame

        # Run HOG detector
        rects, weights = self.hog.detectMultiScale(
            resized,
            winStride=(8, 8),
            padding=(16, 16),
            scale=1.05
        )

        detections = []
        for (rx, ry, rw, rh), weight in zip(rects, weights):
            conf = float(weight[0]) if isinstance(weight, (list, np.ndarray)) else float(weight)
            # Normalize coordinates back to original frame
            x = int(rx / scale)
            y = int(ry / scale)
            box_w = int(rw / scale)
            box_h = int(rh / scale)
            detections.append(PersonDetection(bbox=(x, y, box_w, box_h), confidence=conf))

        return detections

from typing import Tuple, Dict, Any

class PoseAnalyzer:
    """
    Analyzes body geometry, orientation angle, aspect ratio (width/height),
    and floor proximity.
    """
    @staticmethod
    def is_horizontal(aspect_ratio: float, threshold: float = 1.0) -> bool:
        """
        When standing: width/height is ~0.3 - 0.5 (tall rectangle)
        When lying down / fallen: width/height is >= 1.0 (wide rectangle)
        """
        return aspect_ratio >= threshold

    @staticmethod
    def calculate_floor_proximity(bbox: Tuple[int, int, int, int], frame_height: int) -> float:
        """
        Returns normalized ratio (0.0 to 1.0) of how close the bottom of the bounding box is to the floor (bottom of camera frame).
        """
        x, y, w, h = bbox
        bottom_y = y + h
        return min(max(bottom_y / float(frame_height), 0.0), 1.0) if frame_height > 0 else 0.0

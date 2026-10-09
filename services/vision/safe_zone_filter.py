import json
from typing import List, Tuple, Dict, Any, Optional

class SafeZoneFilter:
    """
    Evaluates whether a detected person's bounding box is inside a safe zone
    (e.g., Bed, Sofa, Recliner Chair) where lying down is normal behavior.
    """
    @staticmethod
    def point_in_polygon(point: Tuple[float, float], polygon: List[Tuple[float, float]]) -> bool:
        x, y = point
        n = len(polygon)
        inside = False
        p1x, p1y = polygon[0]
        for i in range(n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside

    @classmethod
    def is_in_safe_zone(
        cls,
        bbox: Tuple[int, int, int, int],
        zones: List[Dict[str, Any]]
    ) -> Tuple[bool, Optional[str]]:
        x, y, w, h = bbox
        center_bottom = (x + w / 2.0, y + h)

        for zone in zones:
            if not zone.get("enabled", True) or not zone.get("suppress_fall_alerts", True):
                continue

            coords_raw = zone.get("coordinates_json", "[]")
            try:
                coords = json.loads(coords_raw) if isinstance(coords_raw, str) else coords_raw
                if len(coords) >= 3:
                    poly = [(float(p[0]), float(p[1])) for p in coords]
                    if cls.point_in_polygon(center_bottom, poly):
                        return True, zone.get("name", "Safe Zone")
            except Exception:
                continue

        return False, None

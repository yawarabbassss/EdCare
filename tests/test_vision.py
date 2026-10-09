import time
from services.vision.detector import PersonDetection
from services.vision.tracker import PersonTracker
from services.vision.pose_analyzer import PoseAnalyzer
from services.vision.safe_zone_filter import SafeZoneFilter
from services.vision.fall_detector import FallDetector
from services.vision.camera_manager import CameraStream

def test_pose_analyzer():
    # Standing person (tall aspect ratio)
    assert not PoseAnalyzer.is_horizontal(0.35)
    # Fallen person (wide aspect ratio)
    assert PoseAnalyzer.is_horizontal(1.40)

    # Floor proximity
    standing_bbox = (100, 100, 60, 180)
    frame_height = 480
    prox = PoseAnalyzer.calculate_floor_proximity(standing_bbox, frame_height)
    assert prox == (100 + 180) / 480.0

def test_safe_zone_filter():
    bed_zone = {
        "name": "Bed Safe Zone",
        "coordinates_json": "[[300, 200], [500, 200], [500, 400], [300, 400]]",
        "suppress_fall_alerts": True,
        "enabled": True
    }
    # Person inside bed zone
    inside_bbox = (350, 250, 100, 60)
    is_safe, zone_name = SafeZoneFilter.is_in_safe_zone(inside_bbox, [bed_zone])
    assert is_safe
    assert zone_name == "Bed Safe Zone"

    # Person outside bed zone
    outside_bbox = (50, 50, 100, 60)
    is_safe_out, _ = SafeZoneFilter.is_in_safe_zone(outside_bbox, [bed_zone])
    assert not is_safe_out

def test_fall_detector_multi_frame():
    detector = FallDetector(confirmation_seconds=0.1)  # fast for test
    tracker = PersonTracker()

    # Frame 1: Standing
    det1 = PersonDetection(bbox=(200, 100, 50, 160), confidence=0.9)
    tracked = tracker.update([det1])
    person = tracked["person_01"]
    alert1 = detector.process_person(person, frame_height=480)
    assert alert1 is None

    # Frame 2: Person falls on floor
    det2 = PersonDetection(bbox=(200, 350, 150, 60), confidence=0.9)
    tracked = tracker.update([det2])
    person = tracked["person_01"]

    # Initial frame sets state to VERIFYING
    detector.process_person(person, frame_height=480)
    assert person.fall_state == "VERIFYING"

    # Wait confirmation window
    time.sleep(0.15)
    alert2 = detector.process_person(person, frame_height=480)
    assert alert2 is not None
    assert alert2.event_type == "possible_fall"
    assert alert2.confidence > 0.7

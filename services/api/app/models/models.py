import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Float, Integer, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship as orm_relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="CAREGIVER", nullable=False)  # ADMIN, CAREGIVER, ELDERLY_USER
    phone_number = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    elderly_profile = orm_relationship("ElderlyProfile", back_populates="user", uselist=False)
    caregiver_links = orm_relationship("CaregiverRelationship", foreign_keys="[CaregiverRelationship.caregiver_id]", back_populates="caregiver")
    elderly_links = orm_relationship("CaregiverRelationship", foreign_keys="[CaregiverRelationship.elderly_id]", back_populates="elderly_user")
    notifications = orm_relationship("Notification", back_populates="user")
    audit_logs = orm_relationship("AuditLog", back_populates="user")

class ElderlyProfile(Base):
    __tablename__ = "elderly_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    date_of_birth = Column(String(50), nullable=True)
    blood_type = Column(String(10), nullable=True)
    room_number = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    emergency_notes = Column(Text, nullable=True)
    fall_risk_level = Column(String(50), default="MEDIUM")  # LOW, MEDIUM, HIGH
    preferred_language = Column(String(50), default="en")
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = orm_relationship("User", back_populates="elderly_profile")
    cameras = orm_relationship("Camera", back_populates="elderly")
    medications = orm_relationship("Medication", back_populates="elderly")
    health_records = orm_relationship("HealthRecord", back_populates="elderly")
    health_thresholds = orm_relationship("HealthThreshold", back_populates="elderly")
    emergency_contacts = orm_relationship("EmergencyContact", back_populates="elderly")
    alerts = orm_relationship("Alert", back_populates="elderly")
    events = orm_relationship("Event", back_populates="elderly")

class CaregiverRelationship(Base):
    __tablename__ = "caregiver_relationships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    caregiver_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    elderly_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String(100), default="Family Member")  # Family, Nurse, Doctor, Guardian
    is_primary = Column(Boolean, default=True)
    permissions = Column(String(255), default="FULL_ACCESS")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    caregiver = orm_relationship("User", foreign_keys=[caregiver_id], back_populates="caregiver_links")
    elderly_user = orm_relationship("User", foreign_keys=[elderly_id], back_populates="elderly_links")

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    elderly_id = Column(String(36), ForeignKey("elderly_profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(String(255), default="Living Room")
    stream_url = Column(String(500), default="0")  # 0 for webcam, or rtsp/video path
    is_online = Column(Boolean, default=True)
    detection_enabled = Column(Boolean, default=True)
    fps = Column(Integer, default=15)
    resolution = Column(String(50), default="1280x720")
    sensitivity = Column(Float, default=0.85)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    elderly = orm_relationship("ElderlyProfile", back_populates="cameras")
    zones = orm_relationship("CameraZone", back_populates="camera", cascade="all, delete-orphan")
    alerts = orm_relationship("Alert", back_populates="camera")

class CameraZone(Base):
    __tablename__ = "camera_zones"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    camera_id = Column(String(36), ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    zone_type = Column(String(50), default="BED")  # BED, SOFA, CHAIR, BATHROOM, DOOR, DANGER
    coordinates_json = Column(Text, nullable=False)  # JSON array of points [[x1, y1], [x2, y2], ...]
    suppress_fall_alerts = Column(Boolean, default=True)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    camera = orm_relationship("Camera", back_populates="zones")

class Medication(Base):
    __tablename__ = "medications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    elderly_id = Column(String(36), ForeignKey("elderly_profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)  # e.g., "10mg", "1 tablet"
    instructions = Column(String(500), nullable=True)  # e.g., "Take after breakfast with water"
    frequency = Column(String(100), default="ONCE_DAILY")  # ONCE_DAILY, TWICE_DAILY, THRICE_DAILY, AS_NEEDED
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    elderly = orm_relationship("ElderlyProfile", back_populates="medications")
    schedules = orm_relationship("MedicationSchedule", back_populates="medication", cascade="all, delete-orphan")
    logs = orm_relationship("MedicationLog", back_populates="medication", cascade="all, delete-orphan")

class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    medication_id = Column(String(36), ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)
    reminder_time = Column(String(10), nullable=False)  # e.g. "08:00", "20:00" (HH:MM 24hr)
    days_of_week = Column(String(100), default="ALL")  # ALL or comma-separated "MON,TUE,WED"
    is_active = Column(Boolean, default=True)

    medication = orm_relationship("Medication", back_populates="schedules")
    logs = orm_relationship("MedicationLog", back_populates="schedule")

class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    schedule_id = Column(String(36), ForeignKey("medication_schedules.id", ondelete="SET NULL"), nullable=True)
    medication_id = Column(String(36), ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)
    elderly_id = Column(String(36), ForeignKey("elderly_profiles.id", ondelete="CASCADE"), nullable=False)
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="UPCOMING")  # UPCOMING, DUE, TAKEN, MISSED, SKIPPED
    taken_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    recorded_by_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    schedule = orm_relationship("MedicationSchedule", back_populates="logs")
    medication = orm_relationship("Medication", back_populates="logs")

class HealthRecord(Base):
    __tablename__ = "health_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    elderly_id = Column(String(36), ForeignKey("elderly_profiles.id", ondelete="CASCADE"), nullable=False)
    metric_type = Column(String(50), nullable=False)  # heart_rate, blood_pressure, blood_oxygen, temperature, glucose, weight
    value = Column(Float, nullable=False)
    secondary_value = Column(Float, nullable=True)  # e.g. diastolic for blood pressure
    unit = Column(String(50), nullable=False)  # bpm, mmHg, %, °C, mg/dL, kg
    timestamp = Column(DateTime(timezone=True), default=utc_now)
    source = Column(String(50), default="MANUAL")  # MANUAL, SMARTWATCH, BLE_DEVICE, SENSOR
    notes = Column(Text, nullable=True)
    recorded_by_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    elderly = orm_relationship("ElderlyProfile", back_populates="health_records")

class HealthThreshold(Base):
    __tablename__ = "health_thresholds"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    elderly_id = Column(String(36), ForeignKey("elderly_profiles.id", ondelete="CASCADE"), nullable=False)
    metric_type = Column(String(50), nullable=False)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    elderly = orm_relationship("ElderlyProfile", back_populates="health_thresholds")

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    elderly_id = Column(String(36), ForeignKey("elderly_profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    relationship = Column(String(100), default="Family Member")
    phone_number = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False)
    priority_order = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    elderly = orm_relationship("ElderlyProfile", back_populates="emergency_contacts")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    elderly_id = Column(String(36), ForeignKey("elderly_profiles.id", ondelete="CASCADE"), nullable=False)
    camera_id = Column(String(36), ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True)
    alert_type = Column(String(50), nullable=False)  # POSSIBLE_FALL, SOS_BUTTON, MISSED_MEDICATION, HEALTH_ANOMALY, CAMERA_OFFLINE
    status = Column(String(50), default="DETECTED")  # DETECTED, ACKNOWLEDGED, RESOLVED, ESCALATED, FALSE_ALARM
    confidence = Column(Float, default=1.0)
    location = Column(String(255), default="Living Room")
    details_json = Column(Text, default="{}")
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by_id = Column(String(36), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    elderly = orm_relationship("ElderlyProfile", back_populates="alerts")
    camera = orm_relationship("Camera", back_populates="alerts")

class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    elderly_id = Column(String(36), ForeignKey("elderly_profiles.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(50), default="INFO")  # INFO, WARNING, CRITICAL
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    elderly = orm_relationship("ElderlyProfile", back_populates="events")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    notification_type = Column(String(50), default="ALERT")
    is_read = Column(Boolean, default=False)
    data_json = Column(Text, default="{}")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = orm_relationship("User", back_populates="notifications")

class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="Care Assistant Session")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    messages = orm_relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan")

class AIMessage(Base):
    __tablename__ = "ai_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String(50), nullable=False)  # user, assistant, system, tool
    content = Column(Text, nullable=False)
    tool_calls_json = Column(Text, nullable=True)
    tool_results_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    conversation = orm_relationship("AIConversation", back_populates="messages")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(255), nullable=False)  # e.g., "ACKNOWLEDGE_FALL", "CREATE_MEDICATION"
    target_type = Column(String(100), nullable=True)
    target_id = Column(String(100), nullable=True)
    details_json = Column(Text, default="{}")
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = orm_relationship("User", back_populates="audit_logs")

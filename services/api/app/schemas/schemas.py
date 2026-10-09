from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth & User Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str
    email: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "CAREGIVER"  # ADMIN, CAREGIVER, ELDERLY_USER
    phone_number: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone_number: Optional[str] = None
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Elderly Profile Schemas ---
class ElderlyProfileCreate(BaseModel):
    user_id: str
    date_of_birth: Optional[str] = None
    blood_type: Optional[str] = "O+"
    room_number: Optional[str] = "Room 101"
    address: Optional[str] = None
    emergency_notes: Optional[str] = None
    fall_risk_level: Optional[str] = "MEDIUM"
    preferred_language: Optional[str] = "en"

class ElderlyProfileUpdate(BaseModel):
    date_of_birth: Optional[str] = None
    blood_type: Optional[str] = None
    room_number: Optional[str] = None
    address: Optional[str] = None
    emergency_notes: Optional[str] = None
    fall_risk_level: Optional[str] = None
    preferred_language: Optional[str] = None

class ElderlyProfileResponse(BaseModel):
    id: str
    user_id: str
    date_of_birth: Optional[str] = None
    blood_type: Optional[str] = None
    room_number: Optional[str] = None
    address: Optional[str] = None
    emergency_notes: Optional[str] = None
    fall_risk_level: str
    preferred_language: str
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- Caregiver Relationship Schemas ---
class CaregiverLinkCreate(BaseModel):
    caregiver_id: str
    elderly_id: str
    relationship_type: str = "Family Member"
    is_primary: bool = True
    permissions: str = "FULL_ACCESS"

class CaregiverLinkResponse(BaseModel):
    id: str
    caregiver_id: str
    elderly_id: str
    relationship_type: str
    is_primary: bool
    permissions: str
    created_at: datetime
    caregiver: Optional[UserResponse] = None
    elderly_user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- Camera & Safe Zones ---
class CameraZoneCreate(BaseModel):
    name: str
    zone_type: str = "BED"  # BED, SOFA, CHAIR, BATHROOM, DOOR, DANGER
    coordinates_json: str  # e.g. "[[100,150],[400,150],[400,350],[100,350]]"
    suppress_fall_alerts: bool = True
    enabled: bool = True

class CameraZoneResponse(BaseModel):
    id: str
    camera_id: str
    name: str
    zone_type: str
    coordinates_json: str
    suppress_fall_alerts: bool
    enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

class CameraCreate(BaseModel):
    elderly_id: str
    name: str
    location: str = "Living Room"
    stream_url: str = "0"
    fps: int = 15
    resolution: str = "1280x720"
    sensitivity: float = 0.85

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    stream_url: Optional[str] = None
    is_online: Optional[bool] = None
    detection_enabled: Optional[bool] = None
    fps: Optional[int] = None
    resolution: Optional[str] = None
    sensitivity: Optional[float] = None

class CameraResponse(BaseModel):
    id: str
    elderly_id: str
    name: str
    location: str
    stream_url: str
    is_online: bool
    detection_enabled: bool
    fps: int
    resolution: str
    sensitivity: float
    created_at: datetime
    zones: List[CameraZoneResponse] = []

    class Config:
        from_attributes = True

# --- Medication Schemas ---
class MedicationScheduleCreate(BaseModel):
    reminder_time: str = "08:00"  # HH:MM
    days_of_week: str = "ALL"
    is_active: bool = True

class MedicationScheduleResponse(BaseModel):
    id: str
    medication_id: str
    reminder_time: str
    days_of_week: str
    is_active: bool

    class Config:
        from_attributes = True

class MedicationCreate(BaseModel):
    elderly_id: str
    name: str
    dosage: str
    instructions: Optional[str] = None
    frequency: str = "ONCE_DAILY"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    schedules: List[MedicationScheduleCreate] = []

class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    instructions: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class MedicationResponse(BaseModel):
    id: str
    elderly_id: str
    name: str
    dosage: str
    instructions: Optional[str] = None
    frequency: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime
    schedules: List[MedicationScheduleResponse] = []

    class Config:
        from_attributes = True

class MedicationLogCreate(BaseModel):
    schedule_id: Optional[str] = None
    medication_id: str
    elderly_id: str
    scheduled_for: datetime
    status: str = "TAKEN"  # UPCOMING, DUE, TAKEN, MISSED, SKIPPED
    notes: Optional[str] = None

class MedicationLogUpdate(BaseModel):
    status: str  # TAKEN, MISSED, SKIPPED
    notes: Optional[str] = None

class MedicationLogResponse(BaseModel):
    id: str
    schedule_id: Optional[str] = None
    medication_id: str
    elderly_id: str
    scheduled_for: datetime
    status: str
    taken_at: Optional[datetime] = None
    notes: Optional[str] = None
    recorded_by_id: Optional[str] = None
    created_at: datetime
    medication: Optional[MedicationResponse] = None

    class Config:
        from_attributes = True

# --- Health Records & Thresholds ---
class HealthRecordCreate(BaseModel):
    elderly_id: str
    metric_type: str  # heart_rate, blood_pressure, blood_oxygen, temperature, glucose, weight
    value: float
    secondary_value: Optional[float] = None
    unit: str  # bpm, mmHg, %, °C, mg/dL, kg
    timestamp: Optional[datetime] = None
    source: str = "MANUAL"
    notes: Optional[str] = None

class HealthRecordResponse(BaseModel):
    id: str
    elderly_id: str
    metric_type: str
    value: float
    secondary_value: Optional[float] = None
    unit: str
    timestamp: datetime
    source: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class HealthThresholdCreate(BaseModel):
    elderly_id: str
    metric_type: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    is_active: bool = True

class HealthThresholdResponse(BaseModel):
    id: str
    elderly_id: str
    metric_type: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Emergency Contact Schemas ---
class EmergencyContactCreate(BaseModel):
    elderly_id: str
    name: str
    relationship: str = "Family Member"
    phone_number: str
    email: Optional[str] = None
    is_primary: bool = False
    priority_order: int = 1

class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    is_primary: Optional[bool] = None
    priority_order: Optional[int] = None

class EmergencyContactResponse(BaseModel):
    id: str
    elderly_id: str
    name: str
    relationship: str
    phone_number: str
    email: Optional[str] = None
    is_primary: bool
    priority_order: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Alert Schemas ---
class AlertCreate(BaseModel):
    elderly_id: str
    camera_id: Optional[str] = None
    alert_type: str  # POSSIBLE_FALL, SOS_BUTTON, MISSED_MEDICATION, HEALTH_ANOMALY, CAMERA_OFFLINE
    confidence: float = 1.0
    location: str = "Living Room"
    details_json: Optional[str] = "{}"

class AlertStatusUpdate(BaseModel):
    status: str  # ACKNOWLEDGED, RESOLVED, ESCALATED, FALSE_ALARM
    notes: Optional[str] = None

class AlertResponse(BaseModel):
    id: str
    elderly_id: str
    camera_id: Optional[str] = None
    alert_type: str
    status: str
    confidence: float
    location: str
    details_json: str
    acknowledged_at: Optional[datetime] = None
    acknowledged_by_id: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[str] = None
    created_at: datetime
    elderly: Optional[ElderlyProfileResponse] = None

    class Config:
        from_attributes = True

# --- Event & Notification Schemas ---
class EventResponse(BaseModel):
    id: str
    elderly_id: str
    event_type: str
    description: str
    severity: str
    metadata_json: str
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    notification_type: str
    is_read: bool
    data_json: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- AI Assistant Schemas ---
class AIChatRequest(BaseModel):
    user_id: str
    message: str
    conversation_id: Optional[str] = None

class AIChatResponse(BaseModel):
    conversation_id: str
    response: str
    audio_url: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    disclaimer: str = "This system is for assistance only and is not a substitute for professional medical care."

# --- Vision & Fall Ingestion ---
class FallDetectionWebhook(BaseModel):
    camera_id: str
    elderly_id: str
    event_type: str = "possible_fall"
    confidence: float
    location: str = "Bedroom"
    details: Dict[str, Any] = {}
    is_demo: bool = False

# --- Audit Log Schema ---
class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details_json: str
    ip_address: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

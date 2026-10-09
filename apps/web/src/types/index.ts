export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "ADMIN" | "CAREGIVER" | "ELDERLY_USER";
  phone_number?: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface ElderlyProfile {
  id: string;
  user_id: string;
  date_of_birth?: string;
  blood_type?: string;
  room_number?: string;
  address?: string;
  emergency_notes?: string;
  fall_risk_level: "LOW" | "MEDIUM" | "HIGH";
  preferred_language: string;
  created_at: string;
  user?: User;
}

export interface CameraZone {
  id: string;
  camera_id: string;
  name: string;
  zone_type: "BED" | "SOFA" | "CHAIR" | "BATHROOM" | "DOOR" | "DANGER";
  coordinates_json: string;
  suppress_fall_alerts: boolean;
  enabled: boolean;
  created_at: string;
}

export interface Camera {
  id: string;
  elderly_id: string;
  name: string;
  location: string;
  stream_url: string;
  is_online: boolean;
  detection_enabled: boolean;
  fps: number;
  resolution: string;
  sensitivity: number;
  created_at: string;
  zones?: CameraZone[];
}

export interface MedicationSchedule {
  id: string;
  medication_id: string;
  reminder_time: string;
  days_of_week: string;
  is_active: boolean;
}

export interface Medication {
  id: string;
  elderly_id: string;
  name: string;
  dosage: string;
  instructions?: string;
  frequency: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  schedules?: MedicationSchedule[];
}

export interface MedicationLog {
  id: string;
  schedule_id?: string;
  medication_id: string;
  elderly_id: string;
  scheduled_for: string;
  status: "UPCOMING" | "DUE" | "TAKEN" | "MISSED" | "SKIPPED";
  taken_at?: string;
  notes?: string;
  recorded_by_id?: string;
  created_at: string;
  medication?: Medication;
}

export interface HealthRecord {
  id: string;
  elderly_id: string;
  metric_type: "heart_rate" | "blood_pressure" | "blood_oxygen" | "temperature" | "blood_glucose" | "weight";
  value: number;
  secondary_value?: number;
  unit: string;
  timestamp: string;
  source: string;
  notes?: string;
  created_at: string;
}

export interface HealthThreshold {
  id: string;
  elderly_id: string;
  metric_type: string;
  min_value?: number;
  max_value?: number;
  is_active: boolean;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  elderly_id: string;
  name: string;
  relationship: string;
  phone_number: string;
  email?: string;
  is_primary: boolean;
  priority_order: number;
  created_at: string;
}

export interface Alert {
  id: string;
  elderly_id: string;
  camera_id?: string;
  alert_type: "POSSIBLE_FALL" | "SOS_BUTTON" | "MISSED_MEDICATION" | "HEALTH_ANOMALY" | "CAMERA_OFFLINE";
  status: "DETECTED" | "ACKNOWLEDGED" | "RESOLVED" | "ESCALATED" | "FALSE_ALARM";
  confidence: number;
  location: string;
  details_json: string;
  acknowledged_at?: string;
  acknowledged_by_id?: string;
  resolved_at?: string;
  resolved_by_id?: string;
  created_at: string;
  elderly?: ElderlyProfile;
}

export interface SystemEvent {
  id: string;
  elderly_id: string;
  event_type: string;
  description: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  metadata_json: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details_json: string;
  ip_address?: string;
  created_at: string;
  user?: User;
}

export interface DashboardSummary {
  profile: {
    id: string;
    full_name: string;
    blood_type?: string;
    room_number?: string;
    fall_risk_level: string;
  };
  stats: {
    active_alerts_count: number;
    medications_today: {
      total: number;
      taken: number;
      due: number;
      missed: number;
    };
    adherence_rate: number;
    cameras: {
      total: number;
      online: number;
    };
  };
  latest_vitals: Record<string, { value: string; unit: string; timestamp: string }>;
  active_alerts: Alert[];
}

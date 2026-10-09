import json
import logging
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal, engine, Base
from app.models.models import (
    User,
    ElderlyProfile,
    CaregiverRelationship,
    Camera,
    CameraZone,
    Medication,
    MedicationSchedule,
    MedicationLog,
    HealthRecord,
    HealthThreshold,
    EmergencyContact,
    Alert,
    Event,
    Notification,
    AuditLog
)
from app.services.auth_service import get_password_hash
from app.services.medication_service import generate_daily_medication_logs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("leo.seed")

def run_seed():
    logger.info("Initializing schema tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_caregiver = db.query(User).filter(User.email == "caregiver@leocare.ai").first()
        if existing_caregiver:
            logger.info("Database already seeded with demo users. Generating today's medication logs...")
            generate_daily_medication_logs(db)
            return

        logger.info("Seeding demo accounts and medical data...")

        # 1. Admin User
        admin = User(
            email="admin@leocare.ai",
            hashed_password=get_password_hash("password123"),
            full_name="Chief Medical Admin",
            role="ADMIN",
            phone_number="+1 (555) 000-1111"
        )
        db.add(admin)

        # 2. Demo Caregiver
        caregiver = User(
            email="caregiver@leocare.ai",
            hashed_password=get_password_hash("password123"),
            full_name="Sarah Jenkins, RN",
            role="CAREGIVER",
            phone_number="+1 (555) 234-5678"
        )
        db.add(caregiver)

        # 3. Demo Elderly User
        elderly_user = User(
            email="elderly@leocare.ai",
            hashed_password=get_password_hash("password123"),
            full_name="Muhammad Ali",
            role="ELDERLY_USER",
            phone_number="+1 (555) 987-6543"
        )
        db.add(elderly_user)
        db.commit()

        # 4. Elderly Profile
        profile = ElderlyProfile(
            user_id=elderly_user.id,
            date_of_birth="1948-03-15",
            blood_type="O+",
            room_number="Suite 102 - Garden Wing",
            address="742 Evergreen Terrace, Springfield",
            emergency_notes="Mild hypertension, history of balance issues when waking up quickly. Penicillin allergy.",
            fall_risk_level="HIGH",
            preferred_language="en"
        )
        db.add(profile)
        db.commit()

        # 5. Caregiver Link
        link = CaregiverRelationship(
            caregiver_id=caregiver.id,
            elderly_id=elderly_user.id,
            relationship_type="Daughter & Primary Caregiver",
            is_primary=True,
            permissions="FULL_ACCESS"
        )
        db.add(link)

        # 6. Cameras & Safe Zones
        living_cam = Camera(
            elderly_id=profile.id,
            name="Living Room Main Cam",
            location="Living Room",
            stream_url="0",
            fps=15,
            resolution="1280x720",
            sensitivity=0.85
        )
        db.add(living_cam)
        db.commit()

        zone_sofa = CameraZone(
            camera_id=living_cam.id,
            name="Sofa Safe Zone",
            zone_type="SOFA",
            coordinates_json=json.dumps([[150, 200], [380, 200], [380, 380], [150, 380]]),
            suppress_fall_alerts=True,
            enabled=True
        )
        db.add(zone_sofa)

        bed_cam = Camera(
            elderly_id=profile.id,
            name="Master Bedroom Cam",
            location="Bedroom",
            stream_url="0",
            fps=15,
            resolution="1280x720",
            sensitivity=0.90
        )
        db.add(bed_cam)
        db.commit()

        zone_bed = CameraZone(
            camera_id=bed_cam.id,
            name="Bed Resting Zone",
            zone_type="BED",
            coordinates_json=json.dumps([[400, 250], [620, 250], [620, 440], [400, 440]]),
            suppress_fall_alerts=True,
            enabled=True
        )
        db.add(zone_bed)

        # 7. Medications
        med_lisinopril = Medication(
            elderly_id=profile.id,
            name="Lisinopril",
            dosage="10mg",
            instructions="Take 1 tablet every morning with water for blood pressure management",
            frequency="ONCE_DAILY",
            notes="Do not skip morning dose"
        )
        db.add(med_lisinopril)
        db.commit()

        db.add(MedicationSchedule(medication_id=med_lisinopril.id, reminder_time="08:00", days_of_week="ALL"))

        med_metformin = Medication(
            elderly_id=profile.id,
            name="Metformin",
            dosage="500mg",
            instructions="Take 1 tablet twice daily with meals for blood sugar control",
            frequency="TWICE_DAILY"
        )
        db.add(med_metformin)
        db.commit()

        db.add(MedicationSchedule(medication_id=med_metformin.id, reminder_time="08:30", days_of_week="ALL"))
        db.add(MedicationSchedule(medication_id=med_metformin.id, reminder_time="19:30", days_of_week="ALL"))

        med_atorvastatin = Medication(
            elderly_id=profile.id,
            name="Atorvastatin",
            dosage="20mg",
            instructions="Take 1 tablet at bedtime for cholesterol support",
            frequency="ONCE_DAILY"
        )
        db.add(med_atorvastatin)
        db.commit()

        db.add(MedicationSchedule(medication_id=med_atorvastatin.id, reminder_time="21:00", days_of_week="ALL"))
        db.commit()

        # Generate logs for today
        generate_daily_medication_logs(db)

        # 8. Health Thresholds
        db.add(HealthThreshold(elderly_id=profile.id, metric_type="heart_rate", min_value=55.0, max_value=105.0))
        db.add(HealthThreshold(elderly_id=profile.id, metric_type="blood_oxygen", min_value=93.0, max_value=100.0))
        db.add(HealthThreshold(elderly_id=profile.id, metric_type="temperature", min_value=36.0, max_value=37.8))
        db.add(HealthThreshold(elderly_id=profile.id, metric_type="blood_glucose", min_value=70.0, max_value=160.0))

        # 9. Historical Health Records (past 7 days for rich charts)
        now = datetime.now(timezone.utc)
        for d in range(7, -1, -1):
            day_t = now - timedelta(days=d)
            # Morning Vitals
            db.add(HealthRecord(
                elderly_id=profile.id,
                metric_type="heart_rate",
                value=float(72 + (d % 3) * 2),
                unit="bpm",
                timestamp=day_t.replace(hour=8, minute=15),
                source="SMARTWATCH"
            ))
            db.add(HealthRecord(
                elderly_id=profile.id,
                metric_type="blood_pressure",
                value=float(122 + (d % 4)),
                secondary_value=float(78 + (d % 3)),
                unit="mmHg",
                timestamp=day_t.replace(hour=8, minute=15),
                source="BLE_CUFF"
            ))
            db.add(HealthRecord(
                elderly_id=profile.id,
                metric_type="blood_oxygen",
                value=float(97 + (d % 2)),
                unit="%",
                timestamp=day_t.replace(hour=8, minute=16),
                source="PULSE_OX"
            ))
            db.add(HealthRecord(
                elderly_id=profile.id,
                metric_type="temperature",
                value=36.6 + (0.1 * (d % 3)),
                unit="°C",
                timestamp=day_t.replace(hour=8, minute=17),
                source="SENSOR"
            ))
            db.add(HealthRecord(
                elderly_id=profile.id,
                metric_type="blood_glucose",
                value=float(110 + (d % 5) * 4),
                unit="mg/dL",
                timestamp=day_t.replace(hour=8, minute=20),
                source="MANUAL"
            ))

        # 10. Emergency Contacts
        db.add(EmergencyContact(
            elderly_id=profile.id,
            name="Sarah Jenkins",
            relationship="Daughter (Primary Caregiver)",
            phone_number="+1 (555) 234-5678",
            email="sarah.jenkins@family.com",
            is_primary=True,
            priority_order=1
        ))
        db.add(EmergencyContact(
            elderly_id=profile.id,
            name="Dr. Robert Chen",
            relationship="Primary Care Cardiologist",
            phone_number="+1 (555) 890-1234",
            email="dr.chen@springfieldclinic.org",
            is_primary=False,
            priority_order=2
        ))
        db.add(EmergencyContact(
            elderly_id=profile.id,
            name="Emergency Services (EMS / 911)",
            relationship="First Responders",
            phone_number="911",
            is_primary=False,
            priority_order=3
        ))

        # 11. Initial Events
        db.add(Event(
            elderly_id=profile.id,
            event_type="SYSTEM_INITIALIZED",
            description="LEO AI Care Assistant system activated for Suite 102",
            severity="INFO"
        ))
        db.add(Event(
            elderly_id=profile.id,
            event_type="MEDICATION_TAKEN",
            description="Lisinopril 10mg morning dose taken on time",
            severity="INFO"
        ))

        # 12. Audit Log
        db.add(AuditLog(
            user_id=admin.id,
            action="INITIAL_SEED_COMPLETE",
            target_type="System",
            details_json=json.dumps({"demo_users_created": ["admin", "caregiver", "elderly"]})
        ))

        db.commit()
        logger.info("Database successfully seeded with realistic healthcare data!")

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()

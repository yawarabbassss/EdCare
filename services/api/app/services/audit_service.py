import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.models import AuditLog

def log_audit_event(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    details_str = json.dumps(details) if isinstance(details, (dict, list)) else (details or "{}")
    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details_json=details_str,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

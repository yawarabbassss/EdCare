import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LEO Elderly Care Assistant"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Security & Auth
    SECRET_KEY: str = "leo-care-secret-key-super-secure-production-ready-2026-xyz"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Database (SQLite by default for zero-setup local dev; seamlessly supports PostgreSQL)
    DATABASE_URL: str = "sqlite:///./leo_care.db"
    
    # Redis / Event Bus (Optional)
    REDIS_URL: Optional[str] = None
    
    # AI Assistant Provider
    AI_PROVIDER: str = "local"  # "openai", "grok", "gemini", "local"
    AI_API_KEY: Optional[str] = None
    AI_MODEL: str = "gpt-4o-mini"
    
    # Fall Detection Thresholds
    FALL_CONFIDENCE_THRESHOLD: float = 0.85
    FALL_CONFIRMATION_SECONDS: float = 3.0
    MIN_FALL_DURATION_FRAMES: int = 8
    PERSON_DETECTION_CONFIDENCE: float = 0.60
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "*"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

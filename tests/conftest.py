import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "api"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.database import SessionLocal, Base, engine

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def caregiver_token(client):
    resp = client.post("/api/v1/auth/login", json={"email": "caregiver@leocare.ai", "password": "password123"})
    assert resp.status_code == 200
    return resp.json()["access_token"]

@pytest.fixture
def elderly_token(client):
    resp = client.post("/api/v1/auth/login", json={"email": "elderly@leocare.ai", "password": "password123"})
    assert resp.status_code == 200
    return resp.json()["access_token"]

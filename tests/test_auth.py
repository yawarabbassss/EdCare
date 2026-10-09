def test_login_success(client):
    resp = client.post("/api/v1/auth/login", json={"email": "caregiver@leocare.ai", "password": "password123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "CAREGIVER"
    assert data["full_name"] == "Sarah Jenkins, RN"

def test_login_invalid_password(client):
    resp = client.post("/api/v1/auth/login", json={"email": "caregiver@leocare.ai", "password": "wrongpassword"})
    assert resp.status_code == 401

def test_get_me_authorized(client, caregiver_token):
    headers = {"Authorization": f"Bearer {caregiver_token}"}
    resp = client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "caregiver@leocare.ai"

def test_unauthorized_access(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401

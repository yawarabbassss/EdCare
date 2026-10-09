def test_get_medications(client, caregiver_token):
    headers = {"Authorization": f"Bearer {caregiver_token}"}
    resp = client.get("/api/v1/medications", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    names = [m["name"] for m in data]
    assert "Lisinopril" in names

def test_get_medication_logs(client, caregiver_token):
    headers = {"Authorization": f"Bearer {caregiver_token}"}
    resp = client.get("/api/v1/medications/logs", headers=headers)
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) >= 1

def test_update_medication_status(client, caregiver_token):
    headers = {"Authorization": f"Bearer {caregiver_token}"}
    logs_resp = client.get("/api/v1/medications/logs", headers=headers)
    logs = logs_resp.json()
    assert len(logs) > 0
    target_log_id = logs[0]["id"]

    resp = client.put(
        f"/api/v1/medications/logs/{target_log_id}/status",
        headers=headers,
        json={"status": "TAKEN", "notes": "Taken with water"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "TAKEN"

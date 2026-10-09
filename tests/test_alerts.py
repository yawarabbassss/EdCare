def test_trigger_manual_sos(client, elderly_token):
    headers = {"Authorization": f"Bearer {elderly_token}"}
    resp = client.post("/api/v1/alerts/trigger-sos", headers=headers, json={"location": "Bathroom"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert "alert_id" in data

def test_alert_lifecycle(client, caregiver_token):
    headers = {"Authorization": f"Bearer {caregiver_token}"}
    # List alerts
    resp = client.get("/api/v1/alerts", headers=headers)
    assert resp.status_code == 200
    alerts = resp.json()
    assert len(alerts) > 0
    alert_id = alerts[0]["id"]

    # Acknowledge
    ack_resp = client.put(f"/api/v1/alerts/{alert_id}/status", headers=headers, json={"status": "ACKNOWLEDGED", "notes": "On my way"})
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "ACKNOWLEDGED"

    # Resolve
    res_resp = client.put(f"/api/v1/alerts/{alert_id}/status", headers=headers, json={"status": "RESOLVED", "notes": "Resident assisted and resting safely"})
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "RESOLVED"

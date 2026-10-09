def test_get_health_records(client, caregiver_token):
    headers = {"Authorization": f"Bearer {caregiver_token}"}
    resp = client.get("/api/v1/health/records?metric_type=heart_rate", headers=headers)
    assert resp.status_code == 200
    records = resp.json()
    assert len(records) > 0
    assert records[0]["metric_type"] == "heart_rate"

def test_add_health_record(client, caregiver_token):
    headers = {"Authorization": f"Bearer {caregiver_token}"}
    # Get elderly profile id
    prof_resp = client.get("/api/v1/elderly/list", headers=headers)
    assert prof_resp.status_code == 200
    elderly_id = prof_resp.json()[0]["id"]

    resp = client.post(
        "/api/v1/health/records",
        headers=headers,
        json={
            "elderly_id": elderly_id,
            "metric_type": "heart_rate",
            "value": 75.0,
            "unit": "bpm",
            "source": "SMARTWATCH"
        }
    )
    assert resp.status_code == 200
    assert resp.json()["value"] == 75.0

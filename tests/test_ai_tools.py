def test_ai_chat_assistant(client, elderly_token):
    headers = {"Authorization": f"Bearer {elderly_token}"}
    # Ask about next medicine
    resp = client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={"user_id": "test_id", "message": "When is my next medication?"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "response" in data
    assert "disclaimer" in data
    assert "is not a substitute" in data["disclaimer"]

def test_ai_emergency_intent(client, elderly_token):
    headers = {"Authorization": f"Bearer {elderly_token}"}
    resp = client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={"user_id": "test_id", "message": "I fell and need emergency help!"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "emergency" in data["response"].lower() or "alert" in data["response"].lower()

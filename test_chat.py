from fastapi.testclient import TestClient
from app.main import app

def test_chat_persists_user_and_assistant_messages(monkeypatch):
    async def fake_reply(messages):
        assert messages[-1]["role"] == "user"
        return "At your service, Sir."

    monkeypatch.setattr("app.main.generate_reply", fake_reply)
    with TestClient(app) as client:
        payload = {
            "conversation_id": "test-conversation",
            "messages": [{"role": "user", "content": "Hello JARVIS"}]
        }
        response = client.post("/api/chat", json=payload)
        assert response.status_code == 200
        assert response.json()["reply"] == "At your service, Sir."
        history = client.get("/api/conversations/test-conversation")
        assert history.status_code == 200
        assert [m["role"] for m in history.json()["messages"]] == ["user", "assistant"]

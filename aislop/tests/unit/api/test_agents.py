import pytest

pytestmark = pytest.mark.asyncio

async def test_trigger_agent(client, auth_headers):
    resp = await client.post("/api/v1/agents/trigger?task=hello", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"

async def test_agent_status(client, auth_headers):
    resp = await client.get("/api/v1/agents/status/default", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "idle"

async def test_agents_requires_auth(client):
    resp = await client.post("/api/v1/agents/trigger", json={"task": "x"})
    assert resp.status_code == 401

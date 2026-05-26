import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_task_create_and_retrieve_roundtrip(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/v1/tasks", json={
        "title": "Integration Task",
        "metadata": "roundtrip",
    }, headers=auth_headers)
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]

    get_resp = await client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["title"] == "Integration Task"


@pytest.mark.asyncio
async def test_config_roundtrip(client: AsyncClient, auth_headers: dict):
    put_resp = await client.put("/api/v1/config?company_name=RoundTripInc&industry=integration", headers=auth_headers)
    assert put_resp.status_code == 200

    get_resp = await client.get("/api/v1/config", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["company_name"] == "RoundTripInc"

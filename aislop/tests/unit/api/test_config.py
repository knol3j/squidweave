import pytest

pytestmark = pytest.mark.asyncio

async def test_get_config_not_found(client, auth_headers):
    resp = await client.get("/api/v1/config", headers=auth_headers)
    assert resp.status_code == 404

async def test_upsert_config(client, auth_headers):
    resp = await client.put("/api/v1/config?company_name=TestCorp&industry=tech", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["company_name"] == "TestCorp"

async def test_get_config_after_upsert(client, auth_headers):
    await client.put("/api/v1/config?company_name=MyCo", headers=auth_headers)
    resp = await client.get("/api/v1/config", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["company_name"] == "MyCo"

async def test_config_requires_auth(client):
    resp = await client.get("/api/v1/config")
    assert resp.status_code == 401

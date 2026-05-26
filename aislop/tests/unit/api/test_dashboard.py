import pytest

pytestmark = pytest.mark.asyncio

async def test_dashboard_summary(client, auth_headers):
    resp = await client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_posts" in data
    assert "total_tasks" in data

async def test_dashboard_activity(client, auth_headers):
    resp = await client.get("/api/v1/dashboard/activity", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

async def test_dashboard_daily_report(client, auth_headers):
    resp = await client.get("/api/v1/dashboard/reports/daily", headers=auth_headers)
    assert resp.status_code == 200
    assert "date" in resp.json()

async def test_dashboard_requires_auth(client):
    resp = await client.get("/api/v1/dashboard/summary")
    assert resp.status_code == 401

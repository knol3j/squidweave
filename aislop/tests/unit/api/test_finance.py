import pytest

pytestmark = pytest.mark.asyncio

async def test_finance_summary(client, auth_headers):
    resp = await client.get("/api/v1/finance/summary", headers=auth_headers)
    assert resp.status_code == 200
    assert "mrr_cents" in resp.json()

async def test_finance_revenue(client, auth_headers):
    resp = await client.get("/api/v1/finance/revenue", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

async def test_stripe_webhook_no_auth_required(client):
    resp = await client.post("/api/v1/finance/stripe/webhook", json={})
    assert resp.status_code == 500

async def test_finance_requires_auth(client):
    resp = await client.get("/api/v1/finance/summary")
    assert resp.status_code == 401

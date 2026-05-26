import pytest

pytestmark = pytest.mark.asyncio

async def test_list_posts_empty(client, auth_headers):
    resp = await client.get("/api/v1/social/posts", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []

async def test_list_posts_requires_auth(client):
    resp = await client.get("/api/v1/social/posts")
    assert resp.status_code == 401

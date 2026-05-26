import pytest

pytestmark = pytest.mark.asyncio

async def test_create_memory(client, auth_headers, mock_chroma):
    resp = await client.post("/api/v1/memory", json={
        "category": "test",
        "title": "My Memory",
        "content": "some content",
        "tags": ["a", "b"],
    }, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["title"] == "My Memory"

async def test_list_memory(client, auth_headers, mock_chroma):
    resp = await client.get("/api/v1/memory", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

async def test_search_memory(client, auth_headers, mock_chroma):
    resp = await client.get("/api/v1/memory?q=test", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

async def test_memory_requires_auth(client):
    resp = await client.post("/api/v1/memory", json={
        "category": "test", "title": "x", "content": "y"
    })
    assert resp.status_code == 401

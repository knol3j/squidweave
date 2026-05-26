import pytest

pytestmark = pytest.mark.asyncio

async def test_create_task(client, auth_headers):
    resp = await client.post("/api/v1/tasks", json={
        "title": "Test Task",
        "description": "desc",
        "metadata": "some meta",
    }, headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test Task"

async def test_list_tasks_empty(client, auth_headers):
    resp = await client.get("/api/v1/tasks", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []

async def test_create_and_get_task(client, auth_headers):
    create_resp = await client.post("/api/v1/tasks", json={
        "title": "My Task",
        "metadata": "xyz",
    }, headers=auth_headers)
    task_id = create_resp.json()["id"]

    get_resp = await client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["title"] == "My Task"

async def test_get_task_not_found(client, auth_headers):
    resp = await client.get("/api/v1/tasks/9999", headers=auth_headers)
    assert resp.status_code == 404

async def test_tasks_require_auth(client):
    resp = await client.post("/api/v1/tasks", json={"title": "No Auth"})
    assert resp.status_code == 401

import pytest
from app.services.memory_service import store_memory, search_memory, list_memories

@pytest.mark.usefixtures("mock_chroma")
@pytest.mark.asyncio
async def test_store_memory():
    result = await store_memory("test", "my title", "some content", tags=["a", "b"])
    assert result["category"] == "test"

@pytest.mark.usefixtures("mock_chroma")
@pytest.mark.asyncio
async def test_search_memory():
    results = await search_memory("test query")
    assert isinstance(results, list)

@pytest.mark.usefixtures("mock_chroma")
@pytest.mark.asyncio
async def test_list_memories():
    results = await list_memories()
    assert isinstance(results, list)

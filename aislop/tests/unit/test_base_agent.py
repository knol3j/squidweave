import pytest
from app.agents.base_agent import BaseAgent

@pytest.mark.asyncio
async def test_agent_run_returns_string():
    agent = BaseAgent(name="test")
    result = await agent.run("do something")
    assert isinstance(result, str)
    assert "test" in result

@pytest.mark.asyncio
async def test_agent_default_name():
    agent = BaseAgent()
    assert agent.name == "default"

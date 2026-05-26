from app.agents.crew_factory import get_agent


async def run_agent_task(task_description: str, agent_name: str = "default") -> str:
    agent = get_agent(agent_name)
    return await agent.run(task_description)

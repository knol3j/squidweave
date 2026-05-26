from app.agents.base_agent import BaseAgent

_agents: dict[str, BaseAgent] = {}

def get_agent(name: str = "default") -> BaseAgent:
    if name not in _agents:
        _agents[name] = BaseAgent(name=name)
    return _agents[name]

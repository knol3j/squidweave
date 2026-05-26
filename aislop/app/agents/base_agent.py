class BaseAgent:
    def __init__(self, name: str = "default"):
        self.name = name

    async def run(self, task: str) -> str:
        return f"Agent {self.name} processed: {task}"

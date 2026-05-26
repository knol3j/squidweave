from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    api_key: str = ""
    database_url: str = "sqlite+aiosqlite:///:memory:"
    redis_url: str = "redis://localhost:6379"
    chroma_persist_dir: str = "./chroma_db"
    debug: bool = True
    stripe_webhook_secret: str = ""

    model_config = {"env_prefix": "AISLOP_", "env_file": ".env"}

settings = Settings()

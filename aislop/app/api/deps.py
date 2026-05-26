from fastapi import Header, HTTPException

from app.config import settings


async def verify_api_key(
    x_api_key: str | None = Header(None),
    authorization: str | None = Header(None),
):
    if x_api_key == settings.api_key:
        return
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ")
        if token == settings.api_key:
            return
    raise HTTPException(status_code=401, detail="Invalid or missing API key")

"""Application configuration. Swap DATABASE_URL for PostgreSQL in production."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "FlowPilot API"
    debug: bool = True
    database_url: str = f"sqlite:///{(BACKEND_ROOT / 'data' / 'flowpilot.db').as_posix()}"
    upload_dir: Path = BACKEND_ROOT / "uploads"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
(BACKEND_ROOT / "data").mkdir(parents=True, exist_ok=True)

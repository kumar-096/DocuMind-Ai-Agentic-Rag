from functools import lru_cache
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = "Agentic RAG Backend"
    environment: str = Field(default="development")
    debug: bool = Field(default=True)
    cors_allow_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )
    cors_allow_origin_regex: str | None = None

    # LLM / Gemini
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-1.5-flash"

    # Vector store
    vector_store_backend: str = "faiss"  # future: pgvector

    # Storage
    storage_backend: str = "local"  # future: supabase

    # Database
    database_url: str = "sqlite:///./backend_data.db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    app_name: str = "Agentic RAG Backend"
    environment: str = "development"
    debug: bool = False

    cors_allow_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://documind-ai-five.vercel.app",
        ]
    )

    # Authentication
    secret_key: str
    access_token_expire_minutes: int = 60 * 24
    google_client_id: str

    # Gemini
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"

    # Vector + storage
    vector_store_backend: str = "faiss"
    storage_backend: str = "local"

    # Database
    DATABASE_URL: str

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
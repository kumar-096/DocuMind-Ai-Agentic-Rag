from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()


class Settings(BaseSettings):
    # App configuration
    app_name: str = "Agentic RAG Backend"
    environment: str = "development"
    debug: bool = True

    # CORS configuration
    cors_allow_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
    cors_allow_origin_regex: str | None = None

    # Gemini configuration
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    gemini_model: str = "gemini-2.5-flash"

    # Vector store
    vector_store_backend: str = "faiss"

    # Storage
    storage_backend: str = "local"

    # Database
    database_url: str = "sqlite:///./backend_data.db"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
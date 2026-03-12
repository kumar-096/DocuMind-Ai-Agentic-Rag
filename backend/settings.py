from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv

# ensure .env is loaded
load_dotenv()

class Settings(BaseSettings):
    # App configuration
    app_name: str = "Agentic RAG Backend"
    environment: str = Field(default="development")
    debug: bool = Field(default=True)

    # CORS configuration
    cors_allow_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
    cors_allow_origin_regex: str | None = None

    # Gemini configuration
    gemini_api_key: str | None = Field(default=None)
    gemini_model: str = Field(default="gemini-2.5-flash")

    # Vector store configuration
    vector_store_backend: str = Field(default="faiss")

    # Storage configuration
    storage_backend: str = Field(default="local")

    # Database configuration
    database_url: str = Field(default="sqlite:///./backend_data.db")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
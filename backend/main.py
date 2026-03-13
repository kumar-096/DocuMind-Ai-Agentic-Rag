from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import api_router
from logging_config import configure_logging
from settings import get_settings


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
    )

    from fastapi.middleware.cors import CORSMiddleware

    origins = [
    "http://localhost:5173",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    return app


app = create_app()


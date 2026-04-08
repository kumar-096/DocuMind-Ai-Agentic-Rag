from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from api import api_router
from api.chat_routes import router as chat_router
from api.chat_sessions_routes import router as session_router
from api.auth_routes import router as auth_router
from api.settings_routes import router as settings_router

from logging_config import configure_logging
from settings import get_settings
from db import Base, engine

# IMPORTANT: ensure models are imported before create_all
import models


def create_app() -> FastAPI:
    configure_logging()

    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
    )

    # CRITICAL: trust Render/Vercel proxy forwarded headers
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

    # centralized CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def startup():
        print("Creating database tables...")

        try:
            Base.metadata.create_all(bind=engine)
            print("✅ Database connected successfully")
            print("✅ Allowed origins:", settings.cors_allow_origins)
            print("✅ Environment:", settings.environment)

        except Exception as e:
            print("⚠️ Database failed — running WITHOUT DB")
            print("ERROR:", e)

    # existing API routes
    app.include_router(api_router)

    # feature routers
    app.include_router(session_router)
    app.include_router(auth_router)
    app.include_router(chat_router)
    app.include_router(settings_router)

    return app


app = create_app()
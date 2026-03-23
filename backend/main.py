from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.chat_routes import router as chat_router
from api import api_router
from logging_config import configure_logging
from settings import get_settings
from db import Base, engine
from api.chat_sessions_routes import router as session_router
from api.auth_routes import router as auth_router
from api.settings_routes import router as settings_router
# IMPORTANT: ensure models are imported before create_all
import models

origins = [
    "http://localhost:5173",
    "https://documind-ai-five.vercel.app"  # placeholder (we update later)
]
def create_app() -> FastAPI:

    configure_logging()

    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
    )

    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    @app.on_event("startup")
    def startup():
        print("Creating database tables...")
        try:
            Base.metadata.create_all(bind=engine)
            print("Database connected successfully")
        except Exception as e:
            print("Database connection failed:", e)

    # existing API routes
    app.include_router(api_router)

    # NEW: session routes
    app.include_router(session_router)
    app.include_router(auth_router)
    app.include_router(chat_router)
    app.include_router(settings_router)

    return app


app = create_app()
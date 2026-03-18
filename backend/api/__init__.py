from fastapi import APIRouter

from .health_routes import router as health_router
from .ingestion_routes import router as ingestion_router
from .chat_routes import router as chat_router
from .auth_routes import router as auth_router
from .chat_sessions_routes import router as sessions_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(sessions_router)
api_router.include_router(ingestion_router)
api_router.include_router(chat_router)
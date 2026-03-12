from fastapi import APIRouter

from . import health_routes, ingestion_routes, chat_routes

api_router = APIRouter()

api_router.include_router(health_routes.router)
api_router.include_router(ingestion_routes.router)
api_router.include_router(chat_routes.router)


from fastapi import APIRouter

from . import health_routes


api_router = APIRouter()

api_router.include_router(health_routes.router)


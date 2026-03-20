from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from db import get_db
from models import QueryLog, User
from core.auth_dependency import get_current_user

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("/overview")
def get_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    total_queries = db.query(func.count(QueryLog.id)).filter(
        QueryLog.user_id == current_user.id
    ).scalar()

    avg_latency = db.query(func.avg(QueryLog.latency_ms)).filter(
        QueryLog.user_id == current_user.id
    ).scalar()

    avg_results = db.query(func.avg(QueryLog.num_results)).filter(
        QueryLog.user_id == current_user.id
    ).scalar()

    return {
        "total_queries": total_queries or 0,
        "avg_latency_ms": round(avg_latency or 0, 2),
        "avg_results": round(avg_results or 0, 2),
    }
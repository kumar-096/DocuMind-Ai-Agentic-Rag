from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from models import UserSettings, User
from core.auth_dependency import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/")
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    settings = db.query(UserSettings).filter(
        UserSettings.user_id == current_user.id
    ).first()

    # 🔴 CRITICAL FIX
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return {
        "top_k": settings.top_k,
        "retrieval_mode": settings.retrieval_mode,
        "temperature": settings.temperature,
        "model": settings.model,
        "streaming": settings.streaming,
    }


@router.put("/")
def update_settings(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    settings = db.query(UserSettings).filter(
        UserSettings.user_id == current_user.id
    ).first()

    # 🔴 SAME FIX
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit() 
        db.refresh(settings)

    for key, value in payload.items():
        if hasattr(settings, key):
            setattr(settings, key, value)

    db.commit()

    return {"message": "Settings updated"}
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import ChatSession, ChatMessage, User
from core.auth_dependency import get_current_user

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("/")
def create_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    session = ChatSession(
        user_id=current_user.id,
        title="New Chat"
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at
    }


@router.get("/")
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )

    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at
        }
        for s in sessions
    ]


@router.get("/{session_id}/messages")
def get_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(ChatMessage)
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .filter(
            ChatMessage.session_id == session_id,
            ChatSession.user_id == current_user.id
        )
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at
        }
        for m in messages
    ]
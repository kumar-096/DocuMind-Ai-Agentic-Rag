from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import ChatSession, ChatMessage, User
from core.auth_dependency import get_current_user
from pydantic import BaseModel
router = APIRouter(prefix="/api/sessions", tags=["sessions"])


# ---------------- CREATE SESSION ----------------
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

    return session


# ---------------- LIST SESSIONS ----------------
@router.get("/")
def list_sessions(
    search: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ChatSession).filter(ChatSession.user_id == current_user.id)

    #   filter archived
    q = q.filter(ChatSession.is_archived == False)

    #   search
    if search:
        q = q.filter(ChatSession.title.ilike(f"%{search}%"))

    return q.order_by(
        ChatSession.is_pinned.desc(),
        ChatSession.created_at.desc()
    ).all()


# ---------------- GET MESSAGES ----------------
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
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return messages


# ---------------- RENAME SESSION ----------------
@router.put("/{session_id}")
def rename_session(
    session_id: int,
    title: str,
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

    session.title = title
    db.commit()

    return {"message": "updated"}


# ---------------- DELETE SESSION ----------------
@router.delete("/{session_id}")
def delete_session(
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

    db.delete(session)
    db.commit()

    return {"message": "deleted"}
class RenamePayload(BaseModel):
    title: str


@router.put("/{session_id}/rename")
def rename_session(
    session_id: int,
    payload: RenamePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.title = payload.title
    db.commit()

    return {"message": "renamed"}


@router.put("/{session_id}/archive")
def archive_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.is_archived = True
    db.commit()

    return {"message": "archived"}


@router.put("/{session_id}/pin")
def toggle_pin(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.is_pinned = not session.is_pinned
    db.commit()

    return {"message": "toggled"}
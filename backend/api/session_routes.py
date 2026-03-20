from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from db import get_db
from models import ChatSession, ChatMessage, User
from core.auth_dependency import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class RenamePayload(BaseModel):
    title: str


@router.get("/")
def list_sessions(
    search: str = Query(default=""),
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ChatSession).filter(ChatSession.user_id == current_user.id)

    if not include_archived:
        q = q.filter(ChatSession.is_archived == False)

    if search:
        q = q.filter(ChatSession.title.ilike(f"%{search}%"))

    return q.order_by(
        ChatSession.is_pinned.desc(),
        ChatSession.created_at.desc()
    ).all()


@router.post("/")
def create_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ChatSession(user_id=current_user.id, title="New Chat")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{session_id}/messages")
def get_messages(
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

    return db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at).all()


@router.delete("/{session_id}")
def delete_session(
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

    db.delete(session)
    db.commit()

    return {"message": "Deleted"}


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

    return {"message": "Renamed"}


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

    return {"message": "Archived"}


@router.put("/{session_id}/pin")
def pin_session(
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

    return {"pinned": session.is_pinned}
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import asyncio

from db import get_db, engine
from models import Base, ChatMessage, ChatSession, User
from core.auth_dependency import get_current_user
from .schemas import ChatRequest
from rag_pipeline import RagPipeline

# ✅ MUST COME BEFORE ROUTES
router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@router.post("/ask")
async def ask_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")

    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == payload.session_id,
            ChatSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    db.add(ChatMessage(
        session_id=payload.session_id,
        role="user",
        content=payload.query,
    ))
    db.commit()

    pipeline = RagPipeline()

    async def event_stream():
        import json

        full_answer = ""

        try:
            # ✅ LOAD SETTINGS
            settings = pipeline._get_user_settings(db, current_user.id)

            if settings.streaming:
                async for token in pipeline.stream_answer(
                    db=db,
                    query=payload.query,
                    user_id=current_user.id,
                    top_k=payload.top_k,
                    document_ids=payload.document_ids,
                ):
                    full_answer += token
                    yield f"data: {json.dumps({'token': token})}\n\n"

            else:
                response = await asyncio.to_thread(
                    pipeline.answer_question,
                    db,
                    payload.query,
                    current_user.id,
                    payload.top_k,
                    payload.document_ids,
                )

                full_answer = response.answer

                yield f"data: {json.dumps({'full': full_answer})}\n\n"

        except Exception as e:
            import traceback
            traceback.print_exc()

            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        finally:

            def save():
                try:
                    db.add(ChatMessage(
                        session_id=payload.session_id,
                        role="assistant",
                        content=full_answer,
                    ))
                    db.commit()
                except Exception as e:
                    print("DB SAVE ERROR:", str(e))

            await asyncio.to_thread(save)

            yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
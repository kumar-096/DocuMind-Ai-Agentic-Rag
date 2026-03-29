from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import asyncio
import time
import json

from db import get_db, engine
from models import Base, ChatMessage, ChatSession, User
from core.auth_dependency import get_current_user
from .schemas import ChatRequest
from rag_pipeline import RagPipeline

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


# ==============================
# 🔥 RATE LIMIT
# ==============================
last_request_time = {}

def allow_request(user_id: int):
    now = time.time()

    if user_id in last_request_time:
        if now - last_request_time[user_id] < 3:
            return False

    last_request_time[user_id] = now
    return True


@router.post("/ask")
async def ask_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if not payload.query.strip():
        raise HTTPException(400, "Query must not be empty")

    if not allow_request(current_user.id):
        raise HTTPException(429, "Too many requests. Wait a few seconds.")

    session = db.query(ChatSession).filter(
        ChatSession.id == payload.session_id,
        ChatSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(404, "Chat session not found")

    # Save user message
    db.add(ChatMessage(
        session_id=payload.session_id,
        role="user",
        content=payload.query,
    ))
    db.commit()

    pipeline = RagPipeline()

    async def event_stream():
        full_answer = ""

        # 🔥 Initial ping (important for frontend)
        yield "data: {}\n\n"

        try:
            settings = pipeline._get_user_settings(db, current_user.id)

            temperature = float(settings.temperature or 0.7)
            model = settings.model or "gemini-2.5-flash"
            retrieval_mode = settings.retrieval_mode or "semantic"

            if settings.streaming:

                try:
                    async for token in pipeline.stream_answer(
                        db=db,
                        query=payload.query,
                        user_id=current_user.id,
                        top_k=payload.top_k,
                        document_ids=payload.document_ids,
                        temperature=temperature,
                        model=model,
                        retrieval_mode=retrieval_mode
                    ):
                        if token:
                            full_answer += token

                            # 🔥 CRITICAL: flush each chunk properly
                            yield f"data: {json.dumps({'token': token})}\n\n"

                            await asyncio.sleep(0)  # force flush

                except Exception as e:
                    print("STREAM ERROR:", str(e))

                    fallback = "⚠️ Unable to generate response."
                    full_answer = fallback

                    for word in fallback.split():
                        yield f"data: {json.dumps({'token': word + ' '})}\n\n"
                        await asyncio.sleep(0.03)

            else:
                try:
                    response = await asyncio.to_thread(
                        lambda: pipeline.answer_question(
                            db,
                            payload.query,
                            current_user.id,
                            payload.top_k,
                            payload.document_ids,
                            temperature,
                            model,
                            retrieval_mode
                        )
                    )

                    full_answer = response.answer

                    yield f"data: {json.dumps({'full': full_answer})}\n\n"

                except Exception:
                    fallback = "⚠️ Unable to generate response."
                    full_answer = fallback
                    yield f"data: {json.dumps({'full': fallback})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        finally:
            # 🔥 SAVE RESPONSE
            try:
                db.add(ChatMessage(
                    session_id=payload.session_id,
                    role="assistant",
                    content=full_answer,
                ))
                db.commit()
            except Exception as e:
                print("DB SAVE ERROR:", str(e))

            # 🔥 FINAL SIGNAL (MANDATORY)
            yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
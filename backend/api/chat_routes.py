from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import asyncio
import time

from db import get_db, engine
from models import Base, ChatMessage, ChatSession, User
from core.auth_dependency import get_current_user
from .schemas import ChatRequest
from rag_pipeline import RagPipeline

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


# 🔥 RETRY WRAPPER
def retry_operation(fn, retries=3, delay=2):
    for attempt in range(retries):
        try:
            return fn()
        except Exception as e:
            if attempt == retries - 1:
                raise e
            time.sleep(delay * (attempt + 1))


@router.post("/ask")
async def ask_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")

    session = db.query(ChatSession).filter(
        ChatSession.id == payload.session_id,
        ChatSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # ✅ Save user message
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
            settings = pipeline._get_user_settings(db, current_user.id)

            temperature = float(settings.temperature or 0.7)
            model = settings.model or "gemini"
            retrieval_mode = settings.retrieval_mode or "semantic"

            # 🔥 STREAMING MODE
            if settings.streaming:

                async def stream_fn():
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
                        return token  # handled below

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
                        full_answer += token
                        yield f"data: {json.dumps({'token': str(token)})}\n\n"

                except Exception as e:
                    # 🔥 QUOTA / FAILURE FALLBACK
                    error_text = str(e)

                    if "RESOURCE_EXHAUSTED" in error_text:
                        fallback = "⚠️ Rate limit reached. Please try again in a few seconds."
                    else:
                        fallback = "⚠️ Something went wrong while generating response."

                    for word in fallback.split(" "):
                        yield f"data: {json.dumps({'token': word + ' '})}\n\n"
                        await asyncio.sleep(0.05)

                    full_answer = fallback

            # 🔥 NON-STREAM MODE
            else:
                try:
                    response = await asyncio.to_thread(
                        lambda: retry_operation(
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
                    )

                    full_answer = response.answer
                    yield f"data: {json.dumps({'full': full_answer})}\n\n"

                except Exception:
                    fallback = "⚠️ Unable to generate response right now."
                    full_answer = fallback
                    yield f"data: {json.dumps({'full': fallback})}\n\n"

        except Exception as e:
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
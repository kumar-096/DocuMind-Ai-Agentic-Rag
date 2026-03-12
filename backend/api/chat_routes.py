from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db, engine
from models import Base
from .schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@router.post("/ask", response_model=ChatResponse)
def ask_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
) -> ChatResponse:
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty.")

    from rag_pipeline import RagPipeline

    pipeline = RagPipeline()
    return pipeline.answer_question(
        db=db,
        query=payload.query,
        top_k=payload.top_k,
        document_ids=payload.document_ids,
    )


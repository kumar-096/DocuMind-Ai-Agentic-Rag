from __future__ import annotations

from time import perf_counter
from typing import List, Optional

from sqlalchemy.orm import Session

from api.schemas import ChatResponse, Citation, RetrievedChunk
from llm_client import LlmClient
from models import QueryLog, UserSettings
from retrieval import RetrievalEngine
from security.prompt_guard import sanitize_context

import retrieval
print("RETRIEVAL FILE:", retrieval.__file__)


class RagPipeline:

    def __init__(self) -> None:
        self.retrieval_engine = RetrievalEngine()
        self.llm_client = LlmClient()

    # -----------------------------
    # LOAD USER SETTINGS (NEW)
    # -----------------------------
    def _get_user_settings(self, db: Session, user_id: int) -> UserSettings:

        settings = db.query(UserSettings).filter(
            UserSettings.user_id == user_id
        ).first()

        if not settings:
            # fallback safety (should not happen if auth is correct)
            settings = UserSettings(user_id=user_id)
            db.add(settings)
            db.commit()
            db.refresh(settings)

        return settings

    # -----------------------------
    # NON-STREAM RESPONSE
    # -----------------------------
    def answer_question(
        self,
        db: Session,
        query: str,
        user_id: int,
        top_k: Optional[int] = None,
        document_ids: Optional[List[int]] = None,
    ):

        start = perf_counter()

        # 🔴 LOAD SETTINGS
        settings = self._get_user_settings(db, user_id)

        # 🔴 OVERRIDE top_k
        effective_top_k = top_k if top_k is not None else settings.top_k

        retrieved = self.retrieval_engine.search(
            db=db,
            query=query,
            user_id=user_id,
            top_k=effective_top_k,
            document_ids=document_ids,
        )

        latency_ms = int((perf_counter() - start) * 1000)

        if not retrieved:
            return ChatResponse(
                answer="No relevant information found.",
                citations=[],
                retrieved_chunks=[]
            )

        context_blocks = []

        for r in retrieved:
            meta = r.chunk.meta or {}
            page = meta.get("page")

            source_label = f"{r.document.filename}"
            if page:
                source_label += f" page {page}"

            context_blocks.append(
                f"[source: {source_label} chunk {r.chunk.chunk_index}]\n{r.chunk.text}"
            )

        context_text = "\n\n".join(context_blocks)

        # 🔴 sanitize context
        context_text = sanitize_context(context_text)

        system_prompt = f"""
You are a professional AI knowledge assistant.

Always answer in structured markdown format:

# Short Answer
2–3 sentence summary.

## Explanation
Detailed explanation.

## Key Points
Bullet points summarizing the important ideas.

## Example
Provide a practical example.

## Flow Diagram
Use ASCII diagrams when useful.

## Sources
Mention document references.

Use only the provided context.

Temperature: {settings.temperature}
Model: {settings.model}
"""

        user_prompt = f"""
Context:
{context_text}

Question:
{query}
"""

        answer = self.llm_client.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )

        citations: List[Citation] = []
        retrieved_chunks: List[RetrievedChunk] = []

        for r in retrieved:
            meta = r.chunk.meta or {}
            page = meta.get("page")

            citations.append(
                Citation(
                    document_id=r.document.id,
                    filename=r.document.filename,
                    page=page,
                    chunk_index=r.chunk.chunk_index,
                )
            )

            retrieved_chunks.append(
                RetrievedChunk(
                    document_id=r.document.id,
                    chunk_index=r.chunk.chunk_index,
                    text=r.chunk.text,
                    score=r.score,
                    filename=r.document.filename,
                    page=page,
                )
            )

        self._log_query(db, query, user_id, latency_ms, len(retrieved))

        return ChatResponse(
            answer=answer,
            citations=citations,
            retrieved_chunks=retrieved_chunks
        )

    # -----------------------------
    # STREAMING RESPONSE
    # -----------------------------
    async def stream_answer(
        self,
        db: Session,
        query: str,
        user_id: int,
        top_k: Optional[int] = None,
        document_ids: Optional[List[int]] = None,
    ):
        import asyncio
        from services.llm_service import llm_stream_async

        # 🔴 LOAD SETTINGS
        settings = self._get_user_settings(db, user_id)

        effective_top_k = top_k if top_k is not None else settings.top_k

        def run_retrieval():
            return self.retrieval_engine.search(
                db=db,
                query=query,
                user_id=user_id,
                top_k=effective_top_k,
                document_ids=document_ids,
            )

        retrieved = await asyncio.to_thread(run_retrieval)

        if not retrieved:
            yield "No relevant information found."
            return

        context_blocks = []

        for r in retrieved:
            meta = r.chunk.meta or {}
            page = meta.get("page")

            source_label = r.document.filename
            if page:
                source_label += f" page {page}"

            context_blocks.append(
                f"[source: {source_label} chunk {r.chunk.chunk_index}]\n{r.chunk.text}"
            )

        context_text = "\n\n".join(context_blocks)
        context_text = sanitize_context(context_text)

        prompt = f"""
You are a professional AI assistant.

Answer ONLY using the provided context.

Temperature: {settings.temperature}
Model: {settings.model}

Context:
{context_text}

Question:
{query}
"""

        async for token in llm_stream_async(prompt):
            yield token

    # -----------------------------
    # LOGGING
    # -----------------------------
    def _log_query(
        self,
        db: Session,
        query: str,
        user_id: int,
        latency_ms: int,
        num_results: int
    ):
        log = QueryLog(
            user_id=user_id,
            query_text=query,
            latency_ms=latency_ms,
            num_results=num_results,
        )   

        db.add(log)
        db.commit()
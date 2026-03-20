from __future__ import annotations

from time import perf_counter
from typing import List, Optional

from sqlalchemy.orm import Session

from api.schemas import ChatResponse, Citation, RetrievedChunk
from llm_client import LlmClient
from models import QueryLog, UserSettings
from retrieval import RetrievalEngine
from security.prompt_guard import sanitize_context


def build_structured_prompt(context_text: str, query: str) -> str:
    return f"""
You are an expert AI assistant.

Your response MUST be:
- visually structured
- easy to scan
- professionally formatted

STRICT RULES:

1. Use emojis in ALL section headings
2. Use short paragraphs (max 2 lines)
3. NEVER write long paragraphs
4. Use bullet points for clarity
5. Add spacing between sections
6. Make it visually appealing like ChatGPT

REQUIRED FORMAT:

## 🚀 Answer
Short, clear answer (3–4 lines max)

## 🧠 Key Idea
Explain simply

## 🔍 Breakdown
- Point 1
- Point 2
- Point 3

## 📌 Example
Short example

## ⚡ Summary
1–2 lines max

Context:
{context_text}

Question:
{query}

IMPORTANT:
- Include emojis exactly as shown
- Do NOT return plain text
- Do NOT skip sections
"""


class RagPipeline:

    def __init__(self) -> None:
        self.retrieval_engine = RetrievalEngine()
        self.llm_client = LlmClient()

    def _get_user_settings(self, db: Session, user_id: int) -> UserSettings:
        settings = db.query(UserSettings).filter(
            UserSettings.user_id == user_id
        ).first()

        if not settings:
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

        settings = self._get_user_settings(db, user_id)
        effective_top_k = top_k if top_k is not None else settings.top_k

        retrieved = self.retrieval_engine.search(
            db=db,
            query=query,
            user_id=user_id,
            top_k=effective_top_k,
            document_ids=document_ids,
            mode=settings.retrieval_mode,
        )

        latency_ms = int((perf_counter() - start) * 1000)

        if not retrieved:
            return ChatResponse(
                answer="No relevant information found.",
                citations=[],
                retrieved_chunks=[]
            )

        context_blocks = []

        for i, r in enumerate(retrieved, start=1):
            meta = r.chunk.meta or {}
            page = meta.get("page")

            source_label = f"{r.document.filename}"
            if page:
                source_label += f" page {page}"

            context_blocks.append(
                f"[{i}] {source_label} (chunk {r.chunk.chunk_index})\n{r.chunk.text}"
            )

        context_text = sanitize_context("\n\n".join(context_blocks))

        prompt = build_structured_prompt(context_text, query)

        answer = self.llm_client.generate(
            system_prompt="You are a structured AI assistant.",
            user_prompt=prompt,
            temperature=float(settings.temperature),
            model=settings.model,
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

        avg_score = sum(r.score for r in retrieved) / len(retrieved)

        final_answer = f"{answer}\n\n---\n**Confidence Score:** {round(avg_score, 2)}"

        self._log_query(
            db,
            query,
            user_id,
            latency_ms,
            len(retrieved),
            settings,
            len(answer),
        )

        return ChatResponse(
            answer=final_answer,
            citations=citations,
            retrieved_chunks=retrieved_chunks
        )

    # -----------------------------
    # STREAMING
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

        settings = self._get_user_settings(db, user_id)
        effective_top_k = top_k if top_k is not None else settings.top_k

        def run_retrieval():
            return self.retrieval_engine.search(
                db=db,
                query=query,
                user_id=user_id,
                top_k=effective_top_k,
                document_ids=document_ids,
                mode=settings.retrieval_mode,
            )

        retrieved = await asyncio.to_thread(run_retrieval)

        if not retrieved:
            yield "No relevant information found."
            return

        context_blocks = []

        for i, r in enumerate(retrieved, start=1):
            meta = r.chunk.meta or {}
            page = meta.get("page")

            source_label = r.document.filename
            if page:
                source_label += f" page {page}"

            context_blocks.append(
                f"[{i}] {source_label} (chunk {r.chunk.chunk_index})\n{r.chunk.text}"
            )

        context_text = sanitize_context("\n\n".join(context_blocks))

        prompt = build_structured_prompt(context_text, query)

        async for token in llm_stream_async(prompt):
            yield token

    def _log_query(
        self,
        db: Session,
        query: str,
        user_id: int,
        latency_ms: int,
        num_results: int,
        settings: UserSettings,
        response_length: int
    ):
        log = QueryLog(
            user_id=user_id,
            query_text=query,
            latency_ms=latency_ms,
            num_results=num_results,
            retrieval_mode=settings.retrieval_mode,
            model_used=settings.model,
            temperature=settings.temperature,
            response_length=response_length,
        )

        db.add(log)
        db.commit()
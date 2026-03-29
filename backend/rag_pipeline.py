from __future__ import annotations

from time import perf_counter
from typing import List, Optional

from sqlalchemy.orm import Session

from api.schemas import ChatResponse, Citation, RetrievedChunk
from llm_client import LlmClient
from models import QueryLog, UserSettings
from retrieval import RetrievalEngine
from security.prompt_guard import sanitize_context
from cache import get_cache, set_cache


# ==============================
# STRUCTURED PROMPT
# ==============================
def build_structured_prompt(context_text: str, query: str) -> str:
    return f"""
You are a helpful AI assistant.

Use the context if relevant. If not, answer using your own knowledge.

## 🚀 Answer
Provide a detailed explanation (at least 5–6 lines)

## 🧠 Key Idea
Explain simply

## 🔍 Breakdown
- Key concept
- How it works
- Why it matters

## ⚡ Summary
1–2 line takeaway

Context:
{context_text[:300]}

Question:
{query}
IMPORTANT: Do NOT stop early. Complete all sections fully.
"""


def should_use_rag(query: str, retrieved) -> bool:
    if not retrieved:
        return False

    # 🔥 remove short / useless words
    query_words = [w for w in query.lower().split() if len(w) > 4]

    if not query_words:
        return False

    chunk_text = retrieved[0].chunk.text.lower()

    overlap = sum(1 for w in query_words if w in chunk_text)

    print("DEBUG → OVERLAP:", overlap)

    # 🔥 STRICT condition (main fix)
    return overlap >= 2


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
        temperature: float = 0.7,
        model: str = "gemini-2.5-flash",
        retrieval_mode: str = "semantic"
    ):

        cache_key = query.strip().lower()

        cached = get_cache(cache_key)
        if cached:
            return ChatResponse(**cached)

        start = perf_counter()

        settings = self._get_user_settings(db, user_id)
        effective_top_k = top_k if top_k is not None else settings.top_k

        retrieved = self.retrieval_engine.search(
            db=db,
            query=query,
            user_id=user_id,
            top_k=effective_top_k,
            document_ids=document_ids,
            mode=retrieval_mode,
        )

        latency_ms = int((perf_counter() - start) * 1000)

        # 🔥 SMART DECISION
        use_rag = should_use_rag(query, retrieved)

        print("USE_RAG:", use_rag)

        context_text = ""

        if use_rag:
            context_blocks = []

            for i, r in enumerate(retrieved[:1], start=1):
                context_blocks.append(
                    f"[{i}] {r.document.filename}\n{r.chunk.text[:200]}"
                )

            context_text = sanitize_context("\n\n".join(context_blocks))

            prompt = build_structured_prompt(context_text, query)

        else:
            prompt = f"""
Answer clearly:

## 🚀 Answer
Provide a clear answer

## 🧠 Key Idea
Explain simply

## 🔍 Breakdown
- key point
- key point
- key point

## ⚡ Summary
1–2 lines

Question:
{query}
"""

        answer = self.llm_client.generate(
            system_prompt="",
            user_prompt=prompt,
            temperature=temperature,
            model=model,
        )

        # -----------------------------
        # RESPONSE BUILD
        # -----------------------------
        citations: List[Citation] = []
        retrieved_chunks: List[RetrievedChunk] = []

        for r in retrieved:
            citations.append(
                Citation(
                    document_id=r.document.id,
                    filename=r.document.filename,
                    page=(r.chunk.meta or {}).get("page"),
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
                    page=(r.chunk.meta or {}).get("page"),
                )
            )

        final_answer = answer

        if retrieved:
            avg_score = sum(r.score for r in retrieved) / len(retrieved)
            final_answer += f"\n\n---\n**Confidence Score:** {round(avg_score, 2)}"

        response = ChatResponse(
            answer=final_answer,
            citations=citations,
            retrieved_chunks=retrieved_chunks
        )

        set_cache(cache_key, response.dict())

        self._log_query(
            db,
            query,
            user_id,
            latency_ms,
            len(retrieved),
            settings,
            len(answer),
        )

        return response

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
        temperature: float = 0.7,
        model: str = "gemini-2.5-flash",
        retrieval_mode: str = "semantic"
    ):
        import asyncio
        from services.llm_service import llm_stream_async

        settings = self._get_user_settings(db, user_id)
        effective_top_k = top_k if top_k is not None else settings.top_k or 3

        def run_retrieval():
            return self.retrieval_engine.search(
                db=db,
                query=query,
                user_id=user_id,
                top_k=effective_top_k,
                document_ids=document_ids,
                mode=retrieval_mode,
            )

        retrieved = await asyncio.to_thread(run_retrieval)

        use_rag = should_use_rag(query, retrieved)

        print("STREAM USE_RAG:", use_rag)

        if use_rag:
            context_blocks = []
            for i, r in enumerate(retrieved[:1], start=1):
                context_blocks.append(
                    f"[{i}] {r.document.filename}\n{r.chunk.text[:200]}"
                )

            context_text = sanitize_context("\n\n".join(context_blocks))
            prompt = build_structured_prompt(context_text, query)

        else:
            prompt = f"""
        You are a helpful AI assistant.

        Answer in a detailed and structured way.

        ## 🚀 Answer
        Provide a complete explanation (minimum 5–6 lines)

        ## 🧠 Key Idea
        Explain simply

        ## 🔍 Breakdown
        - Explain how it works
        - Mention key components
        - Give intuition

        ## ⚡ Summary
        Short takeaway

        Question:
        {query}
        """

        async for token in llm_stream_async(prompt, temperature):
            if token:
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
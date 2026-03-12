from __future__ import annotations

from time import perf_counter
from typing import List, Optional

from sqlalchemy.orm import Session

from api.schemas import ChatResponse, Citation, RetrievedChunk
from llm_client import LlmClient
from models import QueryLog
from retrieval import RetrievalEngine


class RagPipeline:
    def __init__(self) -> None:
        self.retrieval_engine = RetrievalEngine()
        self.llm_client = LlmClient()

    def answer_question(
        self,
        db: Session,
        query: str,
        top_k: int = 5,
        document_ids: Optional[List[int]] = None,
    ) -> ChatResponse:
        start = perf_counter()
        retrieved = self.retrieval_engine.search(
            db=db,
            query=query,
            top_k=top_k,
            document_ids=document_ids,
        )
        latency_ms = int((perf_counter() - start) * 1000)

        if not retrieved:
            answer = "I could not find relevant information in the indexed documents for your question."
            response = ChatResponse(answer=answer, citations=[], retrieved_chunks=[])
            self._log_query(db, query, latency_ms, num_results=0)
            return response

        context_blocks = []
        for r in retrieved:
            meta = r.chunk.meta or {}
            page = meta.get("page")
            source_label = f"{r.document.filename}"
            if page is not None:
                source_label += f" page {page}"
            source_tag = f"[source: {source_label}, chunk {r.chunk.chunk_index}]"
            context_blocks.append(f"{source_tag}\n{r.chunk.text}")

        context_text = "\n\n".join(context_blocks)

        system_prompt = (
            "You are a helpful assistant that answers user questions strictly based on the provided context.\n"
            "Use only the information in the context to answer.\n"
            "When you state facts, reference the sources in parentheses like (document.pdf page 3).\n"
            "If the answer is not contained in the context, say you don't know."
        )

        user_prompt = (
            f"Context:\n{context_text}\n\n"
            f"Question: {query}\n\n"
            "Answer clearly and concisely, and include source references."
        )

        answer_text = self.llm_client.generate(system_prompt=system_prompt, user_prompt=user_prompt)

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

        self._log_query(db, query, latency_ms, num_results=len(retrieved))
        return ChatResponse(answer=answer_text, citations=citations, retrieved_chunks=retrieved_chunks)

    def _log_query(self, db: Session, query: str, latency_ms: int, num_results: int) -> None:
        log = QueryLog(
            query_text=query,
            latency_ms=latency_ms,
            num_results=num_results,
        )
        db.add(log)
        db.commit()


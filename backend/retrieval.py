from __future__ import annotations

from typing import List, Optional, Dict, Tuple
import numpy as np
from collections import Counter

from sqlalchemy.orm import Session

from embeddings import EmbeddingModel
from models import Chunk, Document
from vector_store import get_vector_store


class RetrievedChunkDTO:
    def __init__(
        self,
        chunk: Chunk,
        score: float,
        document: Document,
    ) -> None:
        self.chunk = chunk
        self.score = score
        self.document = document


class RetrievalEngine:
    def __init__(self, embedding_model: Optional[EmbeddingModel] = None) -> None:
        self.embedding_model = embedding_model or EmbeddingModel()
        self.vector_store = get_vector_store(dim=self.embedding_model.dimension)

        # 🔥 NEW CACHE
        self.embedding_cache = {}
    # -----------------------------
    # FETCH DB CHUNKS (UNCHANGED)
    # -----------------------------
    def _fetch_chunks(
        self,
        db: Session,
        vec_ids: List[int],
        user_id: int,
        document_ids: Optional[List[int]],
    ):
        if not vec_ids:
            return {}

        q = db.query(Chunk, Document).join(Document, Chunk.document_id == Document.id)

        q = q.filter(Chunk.user_id == user_id)
        q = q.filter(Chunk.embedding_id.in_(vec_ids))

        if document_ids:
            valid_docs = db.query(Document.id).filter(
                Document.id.in_(document_ids),
                Document.user_id == user_id
            ).all()

            valid_doc_ids = [d.id for d in valid_docs]

            if not valid_doc_ids:
                return {}

            q = q.filter(Chunk.document_id.in_(valid_doc_ids))

        rows = q.all()

        return {
            c.embedding_id: (c, d)
            for c, d in rows
            if c.embedding_id is not None
        }

    # -----------------------------
    # SEMANTIC SEARCH
    # -----------------------------
    def _semantic_search(
        self,
        db: Session,
        query: str,
        user_id: int,
        top_k: int,
        document_ids: Optional[List[int]],
    ):
        if query in self.embedding_cache:
            query_emb = self.embedding_cache[query]
        else:
            query_emb = self.embedding_model.embed_text(query)
            self.embedding_cache[query] = query_emb
        query_vec = np.array(query_emb, dtype=np.float32).reshape(1, -1)

        vec_ids, scores = self.vector_store.search(query_vec, top_k=top_k * 10)

        if not vec_ids:
            return []

        by_vec_id = self._fetch_chunks(db, vec_ids, user_id, document_ids)

        results: List[RetrievedChunkDTO] = []

        for vid, score in zip(vec_ids, scores):
            if vid in by_vec_id:
                chunk, doc = by_vec_id[vid]
                results.append(
                    RetrievedChunkDTO(
                        chunk=chunk,
                        score=float(score),
                        document=doc,
                    )
                )

        return results

    # -----------------------------
    # KEYWORD SCORE
    # -----------------------------
    def _keyword_score(self, query: str, text: str) -> float:
        query_terms = query.lower().split()
        text_terms = text.lower().split()

        text_counter = Counter(text_terms)

        score = 0.0
        for term in query_terms:
            score += text_counter.get(term, 0)

        return score

    # -----------------------------
    # RERANK FUNCTION (🔥 CORE)
    # -----------------------------
    def _rerank(
        self,
        query: str,
        results: List[RetrievedChunkDTO],
    ):
        if not results:
            return results

        reranked = []

        for r in results:
            keyword_boost = self._keyword_score(query, r.chunk.text)

            # 🔥 rerank formula
            final_score = r.score + 0.3 * keyword_boost

            reranked.append(
                RetrievedChunkDTO(
                    chunk=r.chunk,
                    document=r.document,
                    score=final_score,
                )
            )

        reranked.sort(key=lambda x: x.score, reverse=True)

        return reranked

    # -----------------------------
    # HYBRID SEARCH
    # -----------------------------
    def _hybrid_search(
        self,
        db: Session,
        query: str,
        user_id: int,
        top_k: int,
        document_ids: Optional[List[int]],
        alpha: float = 0.7,
    ):
        semantic_results = self._semantic_search(
            db=db,
            query=query,
            user_id=user_id,
            top_k=top_k,
            document_ids=document_ids,
        )

        if not semantic_results:
            return []

        combined = []

        for r in semantic_results:
            keyword_score = self._keyword_score(query, r.chunk.text)

            final_score = alpha * r.score + (1 - alpha) * keyword_score

            combined.append(
                RetrievedChunkDTO(
                    chunk=r.chunk,
                    document=r.document,
                    score=final_score,
                )
            )

        combined.sort(key=lambda x: x.score, reverse=True)

        return combined

    # -----------------------------
    # MAIN SEARCH (WITH RERANK)
    # -----------------------------
    def search(
        self,
        db: Session,
        query: str,
        user_id: int,
        top_k: int = 5,
        document_ids: Optional[List[int]] = None,
        mode: str = "semantic",
    ):
        # STEP 1: retrieval
        if mode == "hybrid":
            results = self._hybrid_search(
                db=db,
                query=query,
                user_id=user_id,
                top_k=top_k,
                document_ids=document_ids,
            )
        else:
            results = self._semantic_search(
                db=db,
                query=query,
                user_id=user_id,
                top_k=top_k,
                document_ids=document_ids,
            )

        if not results:
            return []

        # STEP 2: rerank
        reranked = self._rerank(query, results)

        # STEP 3: top_k cut
        return reranked[:top_k]
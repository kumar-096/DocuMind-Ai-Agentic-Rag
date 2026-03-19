from __future__ import annotations

from typing import List, Optional, Dict, Tuple

import numpy as np
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
        # Load embedding model
        self.embedding_model = embedding_model or EmbeddingModel()

        # Get shared vector store instance
        self.vector_store = get_vector_store(dim=self.embedding_model.dimension)

    def search(
        self,
        db: Session,
        query: str,
        user_id: int,   # ✅ make optional
        top_k: int = 5,
        document_ids: Optional[List[int]] = None,
    ):
        print("DEBUG: CORRECT search() LOADED")
        print("SEARCH CALLED WITH:", user_id)
        # Generate query embedding
        query_emb = self.embedding_model.embed_text(query)

        # Ensure correct numpy shape (1, dimension)
        query_vec = np.array(query_emb, dtype=np.float32).reshape(1, -1)

        # Search FAISS index
        vec_ids, scores = self.vector_store.search(query_vec, top_k=top_k * 10)

        print("FAISS returned ids:", vec_ids)

        if not vec_ids:
            return []

        # Fetch matching chunks from database
        q = db.query(Chunk, Document).join(Document, Chunk.document_id == Document.id)
        if user_id is None:
            raise ValueError("user_id is required")
# ✅ only apply filter if provided
        if user_id is not None:
            q = q.filter(Chunk.user_id == user_id)
        q = q.filter(Chunk.embedding_id.in_(vec_ids))

        if document_ids:
    # 🔴 validate ownership FIRST
            valid_docs = db.query(Document.id).filter(
                Document.id.in_(document_ids),
                Document.user_id == user_id
            ).all()

            valid_doc_ids = [d.id for d in valid_docs]

            if not valid_doc_ids:
                return []  # or raise error

            q = q.filter(Chunk.document_id.in_(valid_doc_ids))

        rows = q.all()

        # Map embedding_id → (chunk, document)
        by_vec_id: Dict[int, Tuple[Chunk, Document]] = {
            c.embedding_id: (c, d)
            for c, d in rows
            if c.embedding_id is not None
        }

        results: List[RetrievedChunkDTO] = []

        # Preserve FAISS ranking order
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
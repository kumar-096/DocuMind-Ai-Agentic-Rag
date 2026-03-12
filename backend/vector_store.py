from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import List, Tuple

import faiss
import numpy as np

from settings import get_settings


class VectorStore(ABC):

    @abstractmethod
    def add_embeddings(self, embeddings: np.ndarray) -> List[int]:
        pass

    @abstractmethod
    def search(self, query_embedding: np.ndarray, top_k: int) -> Tuple[List[int], List[float]]:
        pass

    @abstractmethod
    def save(self) -> None:
        pass


class FaissVectorStore(VectorStore):

    def __init__(self, dim: int, index_path: str | None = None) -> None:
        self.dim = dim

        base_dir = os.path.join("backend", "data", "index")
        os.makedirs(base_dir, exist_ok=True)

        self.index_path = index_path or os.path.join(base_dir, "faiss.index")

        # Load existing index if present
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            base_index = faiss.IndexFlatL2(self.dim)
            self.index = faiss.IndexIDMap(base_index)

        if self.index.ntotal > 0:
            ids = faiss.vector_to_array(self.index.id_map)
            self._next_id = int(ids.max()) + 1
        else:
            self._next_id = 0

    def add_embeddings(self, embeddings: np.ndarray) -> List[int]:
        if embeddings.ndim == 1:
            embeddings = embeddings.reshape(1, -1)

        count = embeddings.shape[0]
        ids = np.arange(self._next_id, self._next_id + count, dtype="int64")

        self.index.add_with_ids(embeddings.astype("float32"), ids)

        self._next_id += count
        self.save()

        return ids.tolist()

    def search(self, query_embedding: np.ndarray, top_k: int) -> Tuple[List[int], List[float]]:
        if self.index.ntotal == 0:
            return [], []

        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)

        distances, indices = self.index.search(query_embedding.astype("float32"), top_k)

        ids = indices[0].tolist()
        scores = [1 / (1 + d) for d in distances[0].tolist()]
        results = [(i, s) for i, s in zip(ids, scores) if i != -1]

        if not results:
            return [], []

        vec_ids, vec_scores = zip(*results)

        return list(vec_ids), list(vec_scores)

    def save(self) -> None:
        faiss.write_index(self.index, self.index_path)


_vector_store_instance: FaissVectorStore | None = None


def get_vector_store(dim: int) -> VectorStore:
    global _vector_store_instance

    if _vector_store_instance is None:
        settings = get_settings()

        if settings.vector_store_backend != "faiss":
            raise ValueError("Only FAISS vector store is supported")

        _vector_store_instance = FaissVectorStore(dim=dim)

    return _vector_store_instance
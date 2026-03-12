from functools import lru_cache
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer


@lru_cache(maxsize=1)
def _get_model(model_name: str) -> SentenceTransformer:
    return SentenceTransformer(model_name)


class EmbeddingModel:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> None:
        self.model_name = model_name
        self._model = _get_model(self.model_name)

    @property
    def dimension(self) -> int:
        # run a tiny dummy encode once to infer size
        test_vec = self._model.encode(["test"], convert_to_numpy=True)
        return int(test_vec.shape[1])

    def embed_text(self, text: str) -> np.ndarray:
        return self._model.encode([text], convert_to_numpy=True)[0]

    def embed_documents(self, texts: List[str]) -> np.ndarray:
        return self._model.encode(texts, convert_to_numpy=True)


from typing import List
import numpy as np

from services.embedding_model import get_embedding_model


_model = None


class EmbeddingModel:

    def __init__(self) -> None:
        global _model

        if _model is None:
            _model = get_embedding_model()

        self._model = _model

        # compute once
        if not hasattr(self._model, "_cached_dimension"):
            test_vec = self._model.encode(
                ["test"],
                convert_to_numpy=True,
                batch_size=1,
            )
            self._model._cached_dimension = int(test_vec.shape[1])

        self._dimension = self._model._cached_dimension

    @property
    def dimension(self) -> int:
        return self._dimension

    def embed_text(self, text: str) -> np.ndarray:
        return self._model.encode(
            [text],
            convert_to_numpy=True,
            batch_size=1,
        )[0]

    def embed_documents(self, texts: List[str]) -> np.ndarray:

        if not texts:
            return np.array([])

        return self._model.encode(
            texts,
            convert_to_numpy=True,
            batch_size=64,
            show_progress_bar=False,
        )
from __future__ import annotations

import os
from typing import List, Tuple

import docx2txt
from pypdf import PdfReader

from db import db_session
from embeddings import EmbeddingModel
from models import Chunk, Document
from storage import get_document_storage
from vector_store import get_vector_store


def _extract_text_pdf(path: str) -> List[Tuple[str, dict]]:
    reader = PdfReader(path)
    chunks: List[Tuple[str, dict]] = []

    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if not text.strip():
            continue

        chunks.append((text, {"page": i + 1}))

    return chunks


def _extract_text_txt(path: str) -> List[Tuple[str, dict]]:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()

    return [(text, {})]


def _extract_text_docx(path: str) -> List[Tuple[str, dict]]:
    text = docx2txt.process(path) or ""
    return [(text, {})]


def _chunk_text(
    text: str,
    base_metadata: dict,
    chunk_size: int = 800,
    overlap: int = 200,
) -> List[Tuple[str, dict]]:

    tokens = text.split()

    chunks: List[Tuple[str, dict]] = []

    start = 0

    while start < len(tokens):

        end = min(start + chunk_size, len(tokens))

        chunk_tokens = tokens[start:end]

        chunk_text = " ".join(chunk_tokens).strip()

        if chunk_text:
            chunks.append((chunk_text, dict(base_metadata)))

        if end == len(tokens):
            break

        start = end - overlap

    return chunks


class DocumentIngestionService:

    def __init__(self, embedding_model: EmbeddingModel | None = None) -> None:

        self.embedding_model = embedding_model or EmbeddingModel()

        self.vector_store = get_vector_store(dim=self.embedding_model.dimension)

    def ingest_file(
        self,
        contents: bytes,
        filename: str,
        content_type: str,
        user_id: int,
    ):

        storage = get_document_storage()

        with db_session() as db:

            # Save file
            path = storage.save(
                file_obj=_BytesIOView(contents),
                filename=filename,
                user_id=user_id,
            )

            doc = Document(
                filename=filename,
                content_type=content_type,
                original_path=path,
                user_id=user_id,
            )

            db.add(doc)
            db.flush()

            # Extract and chunk text
            text_chunks_with_meta = self._load_and_chunk(path, content_type)

            if not text_chunks_with_meta:
                return doc

            texts = [t for t, _ in text_chunks_with_meta]
            metas = [m for _, m in text_chunks_with_meta]

            # Generate embeddings (batched)
            embeddings = self.embedding_model.embed_documents(texts)

            # Insert vectors into FAISS
            vector_ids = self.vector_store.add_embeddings(embeddings)

            # Prepare chunk objects
            chunk_objects = []

            for idx, (text, meta) in enumerate(zip(texts, metas)):

                chunk_objects.append(
                    Chunk(
                        document_id=doc.id,
                        user_id=user_id,
                        chunk_index=idx,
                        text=text,
                        embedding_id=int(vector_ids[idx]),
                        meta=meta,
                    )
                )

            # FAST bulk insert instead of loop inserts
            db.add_all(chunk_objects)

            doc.num_chunks = len(texts)

            db.add(doc)

        return doc
    def _load_and_chunk(self, path: str, content_type: str):

        ext = os.path.splitext(path)[1].lower()

        if content_type == "application/pdf" or ext == ".pdf":
            raw_segments = _extract_text_pdf(path)

        elif content_type == "text/plain" or ext == ".txt":
            raw_segments = _extract_text_txt(path)

        elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or ext == ".docx":
            raw_segments = _extract_text_docx(path)

        else:
            raw_segments = _extract_text_txt(path)

        all_chunks: List[Tuple[str, dict]] = []

        for text, meta in raw_segments:

            for chunk_text, chunk_meta in _chunk_text(text, meta):

                all_chunks.append((chunk_text, chunk_meta))

        return all_chunks


class _BytesIOView:

    def __init__(self, data: bytes) -> None:
        self._data = data
        self._pos = 0

    def read(self, size: int | None = None) -> bytes:

        if size is None or size < 0:
            size = len(self._data) - self._pos

        start = self._pos
        end = min(len(self._data), self._pos + size)

        self._pos = end

        return self._data[start:end]
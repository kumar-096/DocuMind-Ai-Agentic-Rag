import io
from typing import Generator

import pytest

from backend.db import Base, engine, db_session  # type: ignore[import-not-found]
from backend.ingestion import DocumentIngestionService  # type: ignore[import-not-found]
from backend import rag_pipeline as rag_module  # type: ignore[import-not-found]


@pytest.fixture(scope="session", autouse=True)
def _prepare_db() -> Generator[None, None, None]:
    # Ensure a clean SQLite schema for tests
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_ingestion_and_chat_txt_document(monkeypatch: pytest.MonkeyPatch) -> None:
    # Monkeypatch LlmClient.generate to avoid calling the real Gemini API
    def fake_generate(self, system_prompt: str, user_prompt: str) -> str:  # type: ignore[override]
        return "This is a fake answer for testing. Source: sample.txt page 1."

    monkeypatch.setattr(rag_module.LlmClient, "generate", fake_generate, raising=True)

    content = "RAG stands for Retrieval-Augmented Generation. It combines retrieval with generation."
    file_bytes = content.encode("utf-8")

    service = DocumentIngestionService()
    doc = service.ingest_file(file_bytes, "sample.txt", "text/plain")
    doc_id = doc.id

    # Verify chunks were written
    with db_session() as verify_db:
        from backend.models import Document as DbDocument  # type: ignore[import-not-found]

        stored = verify_db.get(DbDocument, doc_id)
        assert stored is not None
        assert stored.num_chunks > 0

    with db_session() as db:
        pipeline = rag_module.RagPipeline()
        response = pipeline.answer_question(
            db=db,
            query="What does RAG stand for?",
            top_k=3,
        )

    assert "answer" in response.model_dump()
    assert isinstance(response.citations, list)
    assert len(response.citations) >= 1


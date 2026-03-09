from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class DocumentMetadata(BaseModel):
    id: int
    filename: str
    content_type: str
    num_chunks: int
    created_at: datetime


class UploadedDocumentResponse(BaseModel):
    document: DocumentMetadata


class ChatRequest(BaseModel):
    query: str
    top_k: int = 5
    document_ids: Optional[List[int]] = None


class Citation(BaseModel):
    document_id: int
    filename: str
    page: Optional[int] = None
    chunk_index: Optional[int] = None


class RetrievedChunk(BaseModel):
    document_id: int
    chunk_index: int
    text: str
    score: float
    filename: str
    page: Optional[int] = None


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    retrieved_chunks: List[RetrievedChunk]


from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from db import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_path = Column(String, nullable=True)
    content_type = Column(String, nullable=False)
    num_chunks = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    embedding_id = Column(Integer, nullable=True)  # position in FAISS index
    meta = Column(JSON, nullable=True)

    document = relationship("Document", back_populates="chunks")


class QueryLog(Base):
    __tablename__ = "queries"

    id = Column(Integer, primary_key=True, index=True)
    query_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    latency_ms = Column(Integer, nullable=True)
    num_results = Column(Integer, nullable=True)
    user_id = Column(Integer, nullable=True)


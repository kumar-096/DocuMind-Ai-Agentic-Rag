from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    token_version = Column(Integer, default=0)
    documents = relationship(
        "Document",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    queries = relationship(
        "QueryLog",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    sessions = relationship(
        "ChatSession",
        back_populates="user",
        cascade="all, delete-orphan"
    )
# ADD BELOW User model

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from datetime import datetime


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    refresh_token_hash = Column(String, nullable=False)

    ip_address = Column(String)
    user_agent = Column(String)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, default=datetime.utcnow)


class LoginAudit(Base):
    __tablename__ = "login_audit"

    id = Column(Integer, primary_key=True)
    email = Column(String)
    ip_address = Column(String)
    user_agent = Column(String)

    success = Column(Boolean)
    reason = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        index=True
    )

    filename = Column(String, nullable=False)
    original_path = Column(String, nullable=True)
    content_type = Column(String, nullable=False)

    num_chunks = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="documents")

    chunks = relationship(
        "Chunk",
        back_populates="document",
        cascade="all, delete-orphan"
    )


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)

    document_id = Column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        index=True,
    )

    chunk_index = Column(Integer, nullable=False)

    text = Column(Text, nullable=False)

    embedding_id = Column(Integer, nullable=True)

    meta = Column(JSON, nullable=True)

    document = relationship(
        "Document",
        back_populates="chunks"
    )


class QueryLog(Base):
    __tablename__ = "queries"

    id = Column(Integer, primary_key=True, index=True)

    query_text = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    latency_ms = Column(Integer, nullable=True)

    num_results = Column(Integer, nullable=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship(
        "User",
        back_populates="queries"
    )


class ChatSession(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        index=True
    )

    title = Column(String, default="New Chat")

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship(
        "User",
        back_populates="sessions"
    )

    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class ChatMessage(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(
        Integer,
        ForeignKey("sessions.id", ondelete="CASCADE"),
        index=True,
    )

    role = Column(String, nullable=False)

    content = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship(
        "ChatSession",
        back_populates="messages"
    )
class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)

    # RAG controls
    top_k = Column(Integer, default=5)
    retrieval_mode = Column(String, default="semantic")  # semantic | hybrid

    # LLM controls
    temperature = Column(String, default="0.7")
    model = Column(String, default="gemini")

    # UX controls
    streaming = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
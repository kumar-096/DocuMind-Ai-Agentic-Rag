from typing import List

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db, engine
from ingestion import DocumentIngestionService
from models import Base, Document, User
from .schemas import DocumentMetadata, UploadedDocumentResponse
from core.auth_dependency import get_current_user

router = APIRouter(prefix="/api/ingest", tags=["ingestion"])
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

@router.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@router.post("/upload", response_model=UploadedDocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in (
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Please upload PDF, TXT, or DOCX files.",
        )

    contents = await file.read()

    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File exceeds 10MB limit"
        )

    service = DocumentIngestionService()

    doc = service.ingest_file(
        contents,
        file.filename,
        file.content_type,
        user_id=current_user.id,
    )

    # refresh from DB to ensure latest values
    db_doc = db.query(Document).filter_by(id=doc.id).first()

    if not db_doc:
        raise HTTPException(status_code=500, detail="Failed to persist document.")

    metadata = DocumentMetadata(
        id=db_doc.id,
        filename=db_doc.filename,
        content_type=db_doc.content_type,
        num_chunks=db_doc.num_chunks,
        created_at=db_doc.created_at,
    )

    return UploadedDocumentResponse(document=metadata)


@router.get("/documents", response_model=List[DocumentMetadata])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )

    return [
        DocumentMetadata(
            id=d.id,
            filename=d.filename,
            content_type=d.content_type,
            num_chunks=d.num_chunks,
            created_at=d.created_at,
        )
        for d in docs
    ]


@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = (
        db.query(Document)
        .filter(
            Document.id == doc_id,
            Document.user_id == current_user.id,
        )
        .first()
    )

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(doc)
    db.commit()

    return {"status": "deleted"}
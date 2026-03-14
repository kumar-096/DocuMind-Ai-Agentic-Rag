from typing import List

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db, engine
from ingestion import DocumentIngestionService
from models import Base, Document
from .schemas import DocumentMetadata, UploadedDocumentResponse

router = APIRouter(prefix="/api/ingest", tags=["ingestion"])


@router.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@router.post("/upload", response_model=UploadedDocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
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
    service = DocumentIngestionService()
    doc = service.ingest_file(contents, file.filename, file.content_type)

    # refresh from DB to ensure we have latest values
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
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
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
def delete_document(doc_id: int, db: Session = Depends(get_db)):

    doc = db.query(Document).filter(Document.id == doc_id).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(doc)
    db.commit()

    return {"status": "deleted"}
"""Document endpoints: upload, parse, analyze, inspect."""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from config import settings
from models.enums import AuditActorType, DocumentStatus
from models.mappers import document_to_read
from models.orm import DocumentORM
from models.schemas import AIStatus, DocumentRead, DocumentSectionRead, DocumentTextRead
from services.ai_service import get_ai_service
from services.analysis_service import extract_document_text, run_analysis
from services.audit import record_event
from services.database import get_db
from services.demo import load_demo
from services.document_parser import SUPPORTED_EXTENSIONS, UnsupportedDocumentError

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_filename(name: str) -> str:
    return _SAFE_NAME.sub("_", Path(name).name)[:180] or "upload"


@router.get("", response_model=list[DocumentRead])
def list_documents(db: Session = Depends(get_db)) -> list[DocumentRead]:
    rows = db.query(DocumentORM).order_by(DocumentORM.uploaded_at.desc()).all()
    return [document_to_read(r) for r in rows]


@router.get("/ai-status", response_model=AIStatus)
def ai_status() -> AIStatus:
    ai = get_ai_service()
    return AIStatus(
        provider=ai.name,
        available=ai.available,
        model=settings.openai_model if ai.available else None,
        demo_mode=not ai.available,
    )


@router.post("/demo", response_model=DocumentRead)
def load_demo_document(reset: bool = False, db: Session = Depends(get_db)) -> DocumentRead:
    """Load the bundled fictional SOP with its cached analysis (works offline)."""
    document = load_demo(db, reset=reset)
    return document_to_read(document)


@router.post("/upload", response_model=DocumentRead, status_code=201)
async def upload_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> DocumentRead:
    """Store the file, extract text immediately, then analyze in the background."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=415, detail=f"Unsupported file type '{ext}'. Use PDF, DOCX or TXT.")

    payload = await file.read()
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 15 MB upload limit.")
    if not payload:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    doc_id = str(uuid.uuid4())
    target = settings.upload_dir / f"{doc_id}_{_safe_filename(file.filename or 'upload')}"
    target.write_bytes(payload)

    document = DocumentORM(
        id=doc_id,
        filename=file.filename or target.name,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(payload),
        storage_path=str(target),
        status=DocumentStatus.UPLOADED,
    )
    db.add(document)
    record_event(
        db,
        actor_type=AuditActorType.HUMAN,
        actor_name="Uploader",
        action=f"Uploaded SOP {document.filename}",
        details={"document_id": doc_id, "size_bytes": len(payload), "content_type": document.content_type},
    )
    db.commit()

    try:
        extract_document_text(db, document)
    except UnsupportedDocumentError as exc:
        document.status = DocumentStatus.FAILED
        document.error_message = str(exc)
        db.commit()
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        document.status = DocumentStatus.FAILED
        document.error_message = f"Text extraction failed: {exc}"
        db.commit()
        raise HTTPException(status_code=422, detail=document.error_message) from exc

    if not (document.extracted_text or "").strip():
        document.status = DocumentStatus.FAILED
        document.error_message = "No readable text found. Scanned PDFs need OCR before upload."
        db.commit()
        raise HTTPException(status_code=422, detail=document.error_message)

    background.add_task(run_analysis, doc_id)
    return document_to_read(document)


@router.post("/{document_id}/analyze", response_model=DocumentRead, status_code=202)
def analyze_document(
    document_id: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> DocumentRead:
    """(Re)run the Process Analyzer on an existing document."""
    document = db.get(DocumentORM, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.status in {DocumentStatus.EXTRACTING, DocumentStatus.ANALYZING, DocumentStatus.MAPPING}:
        raise HTTPException(status_code=409, detail="Analysis already in progress")
    document.status = DocumentStatus.EXTRACTED if document.extracted_text else DocumentStatus.UPLOADED
    document.error_message = None
    db.commit()
    background.add_task(run_analysis, document_id)
    return document_to_read(document)


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(document_id: str, db: Session = Depends(get_db)) -> DocumentRead:
    row = db.get(DocumentORM, document_id)
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return document_to_read(row)


@router.get("/{document_id}/text", response_model=DocumentTextRead)
def get_document_text(document_id: str, db: Session = Depends(get_db)) -> DocumentTextRead:
    row = db.get(DocumentORM, document_id)
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentTextRead(
        id=row.id,
        filename=row.filename,
        text=row.extracted_text or "",
        sections=[DocumentSectionRead(**s) for s in row.sections],
    )

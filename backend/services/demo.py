"""Demo mode: load the bundled fictional SOP with a cached, pre-validated analysis.

This guarantees the full pipeline is demonstrable even without network access or
an API key. When a key IS configured, callers may request a live re-analysis.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from sqlalchemy.orm import Session

from config import BACKEND_ROOT, settings
from models.ai_outputs import ProcessExtraction
from models.enums import AuditActorType
from models.orm import DocumentORM, ProcessORM
from services.analysis_service import extract_document_text, persist_extraction
from services.audit import record_event

DEMO_DIR = BACKEND_ROOT / "demo"
DEMO_SOP_PATH = DEMO_DIR / "regulatory_change_management_sop.txt"
DEMO_EXTRACTION_PATH = DEMO_DIR / "demo_process_extraction.json"
DEMO_SOURCE_LABEL = "demo-cache"


def load_cached_extraction() -> ProcessExtraction:
    return ProcessExtraction.model_validate_json(DEMO_EXTRACTION_PATH.read_text(encoding="utf-8"))


def find_existing_demo_process(db: Session) -> ProcessORM | None:
    doc = (
        db.query(DocumentORM)
        .filter(DocumentORM.is_demo.is_(True), DocumentORM.process_id.isnot(None))
        .order_by(DocumentORM.uploaded_at.desc())
        .first()
    )
    if doc and doc.process_id:
        return db.get(ProcessORM, doc.process_id)
    return None


def load_demo(db: Session, *, reset: bool = False) -> DocumentORM:
    """Create the demo document + process from the cached extraction.

    If a demo process already exists and `reset` is False, it is returned as-is so
    repeated clicks on 'Load Demo SOP' are idempotent.
    """
    if not reset:
        existing = find_existing_demo_process(db)
        if existing is not None:
            return db.get(DocumentORM, existing.source_document_id)

    if reset:
        for doc in db.query(DocumentORM).filter(DocumentORM.is_demo.is_(True)).all():
            if doc.process_id:
                proc = db.get(ProcessORM, doc.process_id)
                if proc:
                    db.delete(proc)
            db.delete(doc)
        db.commit()

    storage_dir: Path = settings.upload_dir
    storage_dir.mkdir(parents=True, exist_ok=True)
    target = storage_dir / DEMO_SOP_PATH.name
    shutil.copyfile(DEMO_SOP_PATH, target)

    document = DocumentORM(
        filename=DEMO_SOP_PATH.name,
        content_type="text/plain",
        size_bytes=target.stat().st_size,
        storage_path=str(target),
        is_demo=True,
    )
    db.add(document)
    db.flush()
    record_event(
        db,
        actor_type=AuditActorType.SYSTEM,
        actor_name="Demo Loader",
        action="Loaded fictional demo SOP (SOP-QA-042 Regulatory Change Management)",
        details={"document_id": document.id, "source": DEMO_SOURCE_LABEL},
    )
    db.commit()

    extract_document_text(db, document)
    extraction = load_cached_extraction()
    persist_extraction(db, document, extraction, analysis_source=DEMO_SOURCE_LABEL)
    db.refresh(document)
    return document

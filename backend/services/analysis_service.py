"""Orchestrates SOP ingestion: parse text, run the Process Analyzer, persist results.

The pipeline is deliberately split into small functions so later phases
(bottlenecks, classification, future-state) can chain onto `persist_extraction`.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict
from pathlib import Path

from sqlalchemy.orm import Session

from agents.process_analyzer import ProcessAnalyzerAgent
from models.ai_outputs import ProcessExtraction
from models.enums import AuditActorType, DocumentStatus
from models.orm import DocumentORM, ProcessORM, ProcessStepORM
from services.ai_service import AIUnavailableError, get_ai_service
from services.audit import record_event
from services.database import SessionLocal
from services.document_parser import DocumentParser, ParsedDocument

logger = logging.getLogger(__name__)


def extract_document_text(db: Session, document: DocumentORM) -> ParsedDocument:
    """Parse the stored file and update the document row with text + sections."""
    document.status = DocumentStatus.EXTRACTING
    db.commit()

    parsed = DocumentParser().parse(Path(document.storage_path))
    document.extracted_text = parsed.text
    document.page_count = parsed.page_count
    document.extract_preview = parsed.preview
    document.sections_json = json.dumps([asdict(s) for s in parsed.sections])
    document.status = DocumentStatus.EXTRACTED
    record_event(
        db,
        actor_type=AuditActorType.SYSTEM,
        actor_name="Document Parser",
        action=f"Extracted text from {document.filename}",
        details={
            "document_id": document.id,
            "characters": len(parsed.text),
            "pages": parsed.page_count,
            "sections_detected": len(parsed.sections),
        },
    )
    db.commit()
    return parsed


def persist_extraction(
    db: Session,
    document: DocumentORM,
    extraction: ProcessExtraction,
    *,
    analysis_source: str,
) -> ProcessORM:
    """Write a ProcessExtraction into Process/ProcessStep rows and link the document."""
    document.status = DocumentStatus.MAPPING
    db.commit()

    process = ProcessORM(
        name=extraction.process_name,
        description=extraction.summary,
        source_document_id=document.id,
        roles_json=json.dumps([r.model_dump() for r in extraction.roles]),
        systems_json=json.dumps([s.model_dump() for s in extraction.systems]),
        pain_points_json=json.dumps(extraction.key_pain_points),
        regulatory_references_json=json.dumps(extraction.regulatory_references),
        total_cycle_time_days=extraction.total_cycle_time_days,
        extraction_confidence=extraction.confidence,
        analysis_source=analysis_source,
    )
    db.add(process)
    db.flush()

    for idx, step in enumerate(extraction.steps):
        db.add(
            ProcessStepORM(
                process_id=process.id,
                sequence=idx,
                name=step.name,
                description=step.description,
                actor=step.actor,
                input_desc=step.input,
                output_desc=step.output,
                duration_minutes=step.duration_minutes,
                elapsed_days=step.elapsed_days,
                decision_required=step.decision_required,
                decision_description=step.decision_description or None,
                automation_potential=step.automation_potential,
                ai_suitability=step.ai_suitability,
                evidence_json=json.dumps(step.evidence),
                systems_json=json.dumps(step.systems),
                pain_points_json=json.dumps(step.pain_points),
                handoff_to=step.handoff_to or None,
            )
        )

    document.process_id = process.id
    document.status = DocumentStatus.READY
    document.error_message = None
    record_event(
        db,
        actor_type=AuditActorType.AI_AGENT,
        actor_name=ProcessAnalyzerAgent.name,
        action=f"Mapped {len(extraction.steps)} process steps for '{extraction.process_name}'",
        details={
            "document_id": document.id,
            "process_id": process.id,
            "roles": len(extraction.roles),
            "systems": len(extraction.systems),
            "confidence": extraction.confidence,
            "source": analysis_source,
        },
    )
    db.commit()
    db.refresh(process)
    return process


async def run_analysis(document_id: str) -> None:
    """Background task: analyze an already-uploaded document end to end."""
    db = SessionLocal()
    try:
        document = db.get(DocumentORM, document_id)
        if document is None:
            logger.warning("run_analysis: document %s not found", document_id)
            return

        if not document.extracted_text:
            extract_document_text(db, document)

        ai = get_ai_service()
        if not ai.available:
            raise AIUnavailableError(
                "No AI provider configured. Add OPENAI_API_KEY to backend/.env to analyze uploaded SOPs, "
                "or use 'Load Demo SOP' which ships with a cached analysis."
            )

        document.status = DocumentStatus.ANALYZING
        record_event(
            db,
            actor_type=AuditActorType.AI_AGENT,
            actor_name=ProcessAnalyzerAgent.name,
            action=f"Started process extraction for {document.filename}",
            details={"document_id": document.id, "provider": ai.name},
        )
        db.commit()

        agent = ProcessAnalyzerAgent(ai)
        result = await agent.analyze(document.extracted_text or "", document.filename)
        record_event(
            db,
            actor_type=AuditActorType.AI_AGENT,
            actor_name=ProcessAnalyzerAgent.name,
            action="Received structured extraction from model",
            details={
                "document_id": document.id,
                "model": result.model,
                "prompt_tokens": result.prompt_tokens,
                "completion_tokens": result.completion_tokens,
                "steps": len(result.data.steps),
                "confidence": result.data.confidence,
            },
        )
        persist_extraction(db, document, result.data, analysis_source=f"{ai.name}:{result.model}")

    except Exception as exc:  # noqa: BLE001 - surface any failure to the UI
        if isinstance(exc, AIUnavailableError):
            logger.info("Analysis skipped for document %s: %s", document_id, exc)
        else:
            logger.exception("Analysis failed for document %s", document_id)
        db.rollback()
        document = db.get(DocumentORM, document_id)
        if document is not None:
            document.status = DocumentStatus.FAILED
            document.error_message = str(exc)
            record_event(
                db,
                actor_type=AuditActorType.SYSTEM,
                actor_name="Analysis Pipeline",
                action=f"Analysis failed for {document.filename}",
                details={"document_id": document_id, "error": str(exc)},
            )
            db.commit()
    finally:
        db.close()

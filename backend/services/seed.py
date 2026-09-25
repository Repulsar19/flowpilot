"""Startup seeding: load the demo SOP so the app is demonstrable immediately."""

from __future__ import annotations

import json
import logging

from sqlalchemy.orm import Session

from models.enums import AgentStatus
from models.orm import AgentORM, ProcessORM, WorkflowORM
from services.demo import load_demo

logger = logging.getLogger(__name__)


def seed_if_empty(db: Session) -> None:
    if db.query(ProcessORM).count() > 0:
        return

    try:
        document = load_demo(db)
    except Exception:  # noqa: BLE001
        logger.exception("Demo SOP could not be loaded at startup")
        return

    process = db.get(ProcessORM, document.process_id) if document.process_id else None
    if process is None:
        return

    # Placeholder workflows + agents so Phase 1 dashboard cards are populated.
    # Phase 3/4 replace these with generated future-state artefacts.
    workflow_current = WorkflowORM(
        name=f"Current State — {process.name}",
        process_id=process.id,
        is_future_state=False,
        description="As-is workflow mapped from the demo SOP.",
    )
    workflow_future = WorkflowORM(
        name=f"Future State — {process.name}",
        process_id=process.id,
        is_future_state=True,
        description="AI-augmented redesign (generated in Phase 3).",
    )
    db.add_all([workflow_current, workflow_future])
    db.flush()

    db.add_all(
        [
            AgentORM(
                workflow_id=workflow_future.id,
                name="Regulatory Intake Agent",
                purpose="Monitor regulatory sources, classify incoming updates and pre-screen applicability.",
                input_description="Regulatory publications, e-mail digest, product and site registration list",
                output_description="Logged update with document class, applicability score and draft rationale",
                tools_json=json.dumps(["web_monitor", "document_parser", "classifier"]),
                permissions_json=json.dumps(["read:regulatory_sources", "write:regulatory_intelligence_log"]),
                confidence_threshold=0.85,
                escalation_conditions="Applicability confidence < 0.85, or update references a registered product",
                human_approval_required=False,
                status=AgentStatus.ACTIVE,
            ),
            AgentORM(
                workflow_id=workflow_future.id,
                name="Impact Assessment Agent",
                purpose="Identify affected SOPs, processes, products and systems for an applicable regulatory update.",
                input_description="Regulatory Summary, SOP master list, product register, validated systems inventory",
                output_description="Draft Impact Assessment with affected documents, impact level and SME questions",
                tools_json=json.dumps(["document_retrieval", "semantic_search", "reasoning"]),
                permissions_json=json.dumps(["read:dms", "read:eqms", "write:impact_assessment_draft"]),
                confidence_threshold=0.85,
                escalation_conditions="Confidence < 0.85, or any High-risk indicator detected",
                human_approval_required=True,
                status=AgentStatus.ACTIVE,
            ),
        ]
    )
    db.commit()

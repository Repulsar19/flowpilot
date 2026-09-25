"""Redesign pipeline: bottlenecks → classification → future-state workflow + agents.

Runs as a background task. Each stage persists its output and writes audit
events before the next stage starts, so a failure leaves earlier results intact
and the UI can show partial progress.
"""

from __future__ import annotations

import json
import logging

from pydantic import BaseModel
from sqlalchemy.orm import Session

from agents.bottleneck_agent import BottleneckAgent
from agents.classification_agent import ClassificationAgent
from agents.future_state_agent import FutureStateAgent
from config import BACKEND_ROOT
from models.ai_outputs import (
    BottleneckAnalysis,
    ClassificationResult,
    ExtractedRole,
    ExtractedStep,
    ExtractedSystem,
    FutureStateWorkflow,
    ProcessExtraction,
)
from models.enums import AgentStatus, AuditActorType, RedesignStage, RedesignStatus
from models.orm import AgentORM, BottleneckORM, DocumentORM, ProcessORM, ProcessStepORM, WorkflowORM
from models.schemas import AIRecommendation
from services.ai_service import AIUnavailableError, get_ai_service
from services.audit import record_event
from services.database import SessionLocal

logger = logging.getLogger(__name__)

DEMO_DIR = BACKEND_ROOT / "demo"
DEMO_SOURCE_LABEL = "demo-cache"


# --------------------------------------------------------------------------- helpers


def step_key(step: ProcessStepORM) -> str:
    """Stable id used in AI payloads: step_01, step_02, ... (sequence-based)."""
    return f"step_{step.sequence + 1:02d}"


def reconstruct_extraction(process: ProcessORM) -> ProcessExtraction:
    """Rebuild the ProcessExtraction payload from persisted rows for downstream agents."""
    steps = sorted(process.steps, key=lambda s: s.sequence)
    return ProcessExtraction(
        process_name=process.name,
        summary=process.description or "",
        roles=[ExtractedRole(**r) for r in process.roles],
        systems=[ExtractedSystem(**s) for s in process.systems],
        steps=[
            ExtractedStep(
                step_id=step_key(s),
                name=s.name,
                description=s.description or "",
                actor=s.actor or "",
                input=s.input_desc or "",
                output=s.output_desc or "",
                duration_minutes=s.duration_minutes or 0.0,
                elapsed_days=s.elapsed_days or 0.0,
                decision_required=s.decision_required,
                decision_description=s.decision_description or "",
                systems=s.systems,
                handoff_to=s.handoff_to or "",
                automation_potential=s.automation_potential or 0.0,
                ai_suitability=s.ai_suitability or 0.0,
                pain_points=s.pain_points,
                evidence=s.evidence,
            )
            for s in steps
        ],
        total_cycle_time_days=process.total_cycle_time_days or 0.0,
        key_pain_points=process.pain_points,
        confidence=process.extraction_confidence or 0.0,
        regulatory_references=process.regulatory_references,
    )


def _is_demo_process(db: Session, process: ProcessORM) -> bool:
    if not process.source_document_id:
        return False
    doc = db.get(DocumentORM, process.source_document_id)
    return bool(doc and doc.is_demo)


def _load_cached[T: BaseModel](filename: str, model: type[T]) -> T:
    return model.model_validate_json((DEMO_DIR / filename).read_text(encoding="utf-8"))


# --------------------------------------------------------------------------- persistence


def persist_bottlenecks(db: Session, process: ProcessORM, analysis: BottleneckAnalysis, *, source: str) -> None:
    for existing in list(process.bottlenecks):
        db.delete(existing)
    db.flush()

    by_key = {step_key(s): s for s in process.steps}
    for rank, b in enumerate(analysis.bottlenecks):
        step = by_key.get(b.step_id)
        db.add(
            BottleneckORM(
                process_id=process.id,
                process_step_id=step.id if step else None,
                rank=rank,
                problem=b.problem,
                cause=b.cause,
                estimated_delay_hours=b.estimated_delay_hours,
                frequency=b.frequency,
                suggested_improvement=b.suggested_improvement,
                opportunity=b.opportunity,
                severity=b.severity,
                confidence=b.confidence,
                evidence_json=json.dumps(b.evidence),
            )
        )
    process.bottleneck_summary = analysis.summary
    record_event(
        db,
        actor_type=AuditActorType.AI_AGENT,
        actor_name=BottleneckAgent.name,
        action=f"Identified {len(analysis.bottlenecks)} bottlenecks in '{process.name}'",
        details={
            "process_id": process.id,
            "addressable_delay_hours": analysis.total_addressable_delay_hours,
            "confidence": analysis.confidence,
            "source": source,
        },
    )
    db.commit()


def persist_classification(db: Session, process: ProcessORM, result: ClassificationResult, *, source: str) -> None:
    by_key = {step_key(s): s for s in process.steps}
    counts: dict[str, int] = {}
    for decision in result.decisions:
        step = by_key.get(decision.step_id)
        if step is None:
            continue
        step.classification = decision.classification
        step.ai_recommendation_json = AIRecommendation(
            recommendation=decision.recommendation,
            reasoning=decision.reasoning,
            confidence=decision.confidence,
            evidence=decision.evidence,
            human_approval_required=decision.human_approval_required,
            escalation_condition=decision.escalation_condition,
            risk_level=decision.risk_level,
            ai_tasks=decision.ai_tasks,
            human_tasks=decision.human_tasks,
        ).model_dump_json()
        counts[decision.classification] = counts.get(decision.classification, 0) + 1

    process.classification_summary = result.summary
    process.governance_notes_json = json.dumps(result.governance_notes)
    record_event(
        db,
        actor_type=AuditActorType.AI_AGENT,
        actor_name=ClassificationAgent.name,
        action=f"Classified {len(result.decisions)} steps for '{process.name}'",
        details={"process_id": process.id, "counts": counts, "confidence": result.confidence, "source": source},
    )
    db.commit()


def persist_future_state(db: Session, process: ProcessORM, design: FutureStateWorkflow, *, source: str) -> WorkflowORM:
    # Replace any previous future-state workflow (and its agents) for this process.
    for old in db.query(WorkflowORM).filter(WorkflowORM.process_id == process.id, WorkflowORM.is_future_state.is_(True)).all():
        for agent in db.query(AgentORM).filter(AgentORM.workflow_id == old.id).all():
            db.delete(agent)
        db.delete(old)
    db.flush()

    workflow = WorkflowORM(
        name=design.name,
        description=design.summary,
        process_id=process.id,
        is_future_state=True,
        nodes_json=json.dumps([n.model_dump() for n in design.nodes]),
        edges_json=json.dumps([e.model_dump() for e in design.edges]),
        removed_step_ids_json=json.dumps(design.removed_step_ids),
        expected_improvements_json=json.dumps(design.expected_improvements),
        governance_controls_json=json.dumps(design.governance_controls),
        estimated_cycle_time_days=design.estimated_cycle_time_days,
        estimated_effort_minutes=design.estimated_effort_minutes,
        generation_source=source,
        confidence=design.confidence,
    )
    db.add(workflow)
    db.flush()

    automation_types = {n.node_id for n in design.nodes if n.type == "AUTOMATION"}
    for spec in design.agents:
        is_ai = not all(nid in automation_types for nid in spec.node_ids) if spec.node_ids else True
        db.add(
            AgentORM(
                workflow_id=workflow.id,
                name=spec.name,
                purpose=spec.purpose,
                input_description="; ".join(spec.inputs),
                output_description="; ".join(spec.outputs),
                inputs_json=json.dumps(spec.inputs),
                outputs_json=json.dumps(spec.outputs),
                tools_json=json.dumps(spec.tools),
                permissions_json=json.dumps(spec.permissions),
                prohibited_actions_json=json.dumps(spec.prohibited_actions),
                node_ids_json=json.dumps(spec.node_ids),
                confidence_threshold=spec.confidence_threshold,
                escalation_conditions=spec.escalation_conditions,
                human_approval_required=spec.human_approval_required,
                is_ai=is_ai,
                status=AgentStatus.ACTIVE,
            )
        )

    process.future_workflow_id = workflow.id
    record_event(
        db,
        actor_type=AuditActorType.AI_AGENT,
        actor_name=FutureStateAgent.name,
        action=f"Generated future-state workflow '{design.name}' with {len(design.nodes)} nodes and {len(design.agents)} agents",
        details={
            "process_id": process.id,
            "workflow_id": workflow.id,
            "estimated_cycle_time_days": design.estimated_cycle_time_days,
            "human_approval_gates": sum(1 for n in design.nodes if n.human_approval_gate),
            "confidence": design.confidence,
            "source": source,
        },
    )
    db.commit()
    return workflow


# --------------------------------------------------------------------------- pipeline


def _set_stage(db: Session, process: ProcessORM, stage: RedesignStage) -> None:
    process.redesign_stage = stage
    db.commit()


async def run_redesign(process_id: str, *, force_live: bool = False) -> None:
    """Background task entry point."""
    db = SessionLocal()
    try:
        process = db.get(ProcessORM, process_id)
        if process is None:
            logger.warning("run_redesign: process %s not found", process_id)
            return

        ai = get_ai_service()
        use_cache = _is_demo_process(db, process) and not (force_live and ai.available)
        if not use_cache and not ai.available:
            raise AIUnavailableError(
                "No AI provider configured. Add OPENAI_API_KEY to backend/.env to redesign uploaded SOPs; "
                "the demo process ships with a cached redesign."
            )
        source = DEMO_SOURCE_LABEL if use_cache else ai.name

        process.redesign_status = RedesignStatus.RUNNING
        process.redesign_error = None
        record_event(
            db,
            actor_type=AuditActorType.SYSTEM,
            actor_name="Redesign Pipeline",
            action=f"Started AI redesign for '{process.name}'",
            details={"process_id": process.id, "source": source},
        )
        db.commit()

        extraction = reconstruct_extraction(process)

        # Stage 1 — bottlenecks
        _set_stage(db, process, RedesignStage.BOTTLENECKS)
        if use_cache:
            bottlenecks = _load_cached("demo_bottlenecks.json", BottleneckAnalysis)
            stage_source = source
        else:
            result = await BottleneckAgent(ai).analyze(extraction)
            bottlenecks, stage_source = result.data, f"{ai.name}:{result.model}"
        persist_bottlenecks(db, process, bottlenecks, source=stage_source)

        # Stage 2 — classification
        _set_stage(db, process, RedesignStage.CLASSIFICATION)
        if use_cache:
            classification = _load_cached("demo_classification.json", ClassificationResult)
        else:
            result = await ClassificationAgent(ai).classify(extraction, bottlenecks)
            classification, stage_source = result.data, f"{ai.name}:{result.model}"
        persist_classification(db, process, classification, source=stage_source)

        # Stage 3 — future state
        _set_stage(db, process, RedesignStage.FUTURE_STATE)
        if use_cache:
            design = _load_cached("demo_future_state.json", FutureStateWorkflow)
        else:
            result = await FutureStateAgent(ai).design(extraction, bottlenecks, classification)
            design, stage_source = result.data, f"{ai.name}:{result.model}"
        persist_future_state(db, process, design, source=stage_source)

        process.redesign_stage = RedesignStage.DONE
        process.redesign_status = RedesignStatus.COMPLETED
        process.redesign_source = stage_source
        db.commit()

    except Exception as exc:  # noqa: BLE001
        if isinstance(exc, AIUnavailableError):
            logger.info("Redesign skipped for %s: %s", process_id, exc)
        else:
            logger.exception("Redesign failed for process %s", process_id)
        db.rollback()
        process = db.get(ProcessORM, process_id)
        if process is not None:
            process.redesign_status = RedesignStatus.FAILED
            process.redesign_error = str(exc)
            record_event(
                db,
                actor_type=AuditActorType.SYSTEM,
                actor_name="Redesign Pipeline",
                action=f"Redesign failed for '{process.name}'",
                details={"process_id": process_id, "error": str(exc), "stage": process.redesign_stage},
            )
            db.commit()
    finally:
        db.close()


def run_redesign_sync(db: Session, process: ProcessORM) -> None:
    """Synchronous cached redesign used at startup seeding (demo process only)."""
    bottlenecks = _load_cached("demo_bottlenecks.json", BottleneckAnalysis)
    classification = _load_cached("demo_classification.json", ClassificationResult)
    design = _load_cached("demo_future_state.json", FutureStateWorkflow)

    process.redesign_status = RedesignStatus.RUNNING
    db.commit()
    persist_bottlenecks(db, process, bottlenecks, source=DEMO_SOURCE_LABEL)
    persist_classification(db, process, classification, source=DEMO_SOURCE_LABEL)
    persist_future_state(db, process, design, source=DEMO_SOURCE_LABEL)
    process.redesign_stage = RedesignStage.DONE
    process.redesign_status = RedesignStatus.COMPLETED
    process.redesign_source = DEMO_SOURCE_LABEL
    db.commit()

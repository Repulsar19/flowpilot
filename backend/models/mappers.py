"""Map ORM rows to Pydantic response models."""

import json

from models.orm import (
    AgentORM,
    ApprovalORM,
    AuditEventORM,
    DocumentORM,
    ProcessORM,
    ProcessStepORM,
    WorkflowExecutionORM,
    WorkflowORM,
)
from models.schemas import (
    AIRecommendation,
    AgentRead,
    ApprovalRead,
    AuditEventRead,
    DocumentRead,
    DocumentSectionRead,
    ProcessRead,
    ProcessRole,
    ProcessStepRead,
    ProcessSummary,
    ProcessSystem,
    WorkflowExecutionRead,
    WorkflowRead,
)


def document_to_read(row: DocumentORM) -> DocumentRead:
    return DocumentRead(
        id=row.id,
        filename=row.filename,
        content_type=row.content_type,
        size_bytes=row.size_bytes,
        status=row.status,
        uploaded_at=row.uploaded_at,
        page_count=row.page_count,
        extract_preview=row.extract_preview,
        sections=[DocumentSectionRead(**s) for s in row.sections],
        is_demo=row.is_demo,
        error_message=row.error_message,
        process_id=row.process_id,
        text_length=len(row.extracted_text) if row.extracted_text else None,
    )


def process_to_summary(row: ProcessORM) -> ProcessSummary:
    return ProcessSummary(
        id=row.id,
        name=row.name,
        description=row.description,
        source_document_id=row.source_document_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
        step_count=len(row.steps),
        role_count=len(row.roles),
        total_cycle_time_days=row.total_cycle_time_days,
        extraction_confidence=row.extraction_confidence,
        analysis_source=row.analysis_source,
    )


def step_to_read(row: ProcessStepORM) -> ProcessStepRead:
    ai_rec = None
    if row.ai_recommendation_json:
        ai_rec = AIRecommendation.model_validate_json(row.ai_recommendation_json)
    return ProcessStepRead(
        id=row.id,
        process_id=row.process_id,
        sequence=row.sequence,
        name=row.name,
        description=row.description,
        actor=row.actor,
        input=row.input_desc,
        output=row.output_desc,
        duration_minutes=row.duration_minutes,
        elapsed_days=row.elapsed_days,
        decision_required=row.decision_required,
        decision_description=row.decision_description,
        automation_potential=row.automation_potential,
        ai_suitability=row.ai_suitability,
        classification=row.classification,
        evidence=row.evidence,
        systems=row.systems,
        pain_points=row.pain_points,
        handoff_to=row.handoff_to,
        ai_recommendation=ai_rec,
    )


def process_to_read(row: ProcessORM) -> ProcessRead:
    steps = sorted(row.steps, key=lambda s: s.sequence)
    return ProcessRead(
        id=row.id,
        name=row.name,
        description=row.description,
        source_document_id=row.source_document_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
        steps=[step_to_read(s) for s in steps],
        roles=[ProcessRole(**r) for r in row.roles],
        systems=[ProcessSystem(**s) for s in row.systems],
        pain_points=row.pain_points,
        regulatory_references=row.regulatory_references,
        total_cycle_time_days=row.total_cycle_time_days,
        extraction_confidence=row.extraction_confidence,
        analysis_source=row.analysis_source,
    )


def agent_to_read(row: AgentORM) -> AgentRead:
    return AgentRead(
        id=row.id,
        workflow_id=row.workflow_id,
        name=row.name,
        purpose=row.purpose,
        input_description=row.input_description,
        output_description=row.output_description,
        tools=json.loads(row.tools_json or "[]"),
        permissions=json.loads(row.permissions_json or "[]"),
        confidence_threshold=row.confidence_threshold,
        escalation_conditions=row.escalation_conditions,
        human_approval_required=row.human_approval_required,
        status=row.status,
        created_at=row.created_at,
    )


def workflow_to_read(row: WorkflowORM) -> WorkflowRead:
    return WorkflowRead.model_validate(row)


def execution_to_read(row: WorkflowExecutionORM) -> WorkflowExecutionRead:
    return WorkflowExecutionRead.model_validate(row)


def approval_to_read(row: ApprovalORM) -> ApprovalRead:
    ai_rec = None
    if row.ai_recommendation_json:
        ai_rec = AIRecommendation.model_validate_json(row.ai_recommendation_json)
    return ApprovalRead(
        id=row.id,
        execution_id=row.execution_id,
        step_id=row.step_id,
        status=row.status,
        ai_recommendation=ai_rec,
        reviewer=row.reviewer,
        decision_at=row.decision_at,
        comments=row.comments,
        created_at=row.created_at,
    )


def audit_to_read(row: AuditEventORM) -> AuditEventRead:
    return AuditEventRead(
        id=row.id,
        timestamp=row.timestamp,
        actor_type=row.actor_type,
        actor_name=row.actor_name,
        action=row.action,
        details=json.loads(row.details_json or "{}"),
        execution_id=row.execution_id,
    )

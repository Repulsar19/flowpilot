"""Map ORM rows to Pydantic response models."""

import json

from models.orm import (
    AgentORM,
    ApprovalORM,
    AuditEventORM,
    BottleneckORM,
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
    BottleneckRead,
    DocumentRead,
    DocumentSectionRead,
    ProcessRead,
    ProcessRole,
    ProcessStepRead,
    ProcessSummary,
    ProcessSystem,
    WorkflowEdge,
    WorkflowExecutionRead,
    WorkflowNode,
    WorkflowRead,
    WorkflowSummary,
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
        redesign_status=row.redesign_status,
        future_workflow_id=row.future_workflow_id,
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
        redesign_status=row.redesign_status,
        redesign_stage=row.redesign_stage,
        redesign_error=row.redesign_error,
        redesign_source=row.redesign_source,
        bottleneck_summary=row.bottleneck_summary,
        classification_summary=row.classification_summary,
        governance_notes=row.governance_notes,
        future_workflow_id=row.future_workflow_id,
    )


def bottleneck_to_read(row: BottleneckORM, step: ProcessStepORM | None) -> BottleneckRead:
    return BottleneckRead(
        id=row.id,
        process_id=row.process_id,
        process_step_id=row.process_step_id,
        step_name=step.name if step else "Process-level",
        step_sequence=step.sequence if step else None,
        rank=row.rank,
        problem=row.problem,
        cause=row.cause,
        estimated_delay_hours=row.estimated_delay_hours,
        frequency=row.frequency,
        suggested_improvement=row.suggested_improvement,
        opportunity=row.opportunity,
        severity=row.severity,
        confidence=row.confidence,
        evidence=row.evidence,
    )


def agent_to_read(row: AgentORM) -> AgentRead:
    return AgentRead(
        id=row.id,
        workflow_id=row.workflow_id,
        name=row.name,
        purpose=row.purpose,
        input_description=row.input_description,
        output_description=row.output_description,
        inputs=json.loads(row.inputs_json or "[]"),
        outputs=json.loads(row.outputs_json or "[]"),
        tools=json.loads(row.tools_json or "[]"),
        permissions=json.loads(row.permissions_json or "[]"),
        prohibited_actions=json.loads(row.prohibited_actions_json or "[]"),
        node_ids=json.loads(row.node_ids_json or "[]"),
        confidence_threshold=row.confidence_threshold,
        escalation_conditions=row.escalation_conditions,
        human_approval_required=row.human_approval_required,
        is_ai=row.is_ai,
        status=row.status,
        created_at=row.created_at,
    )


def workflow_to_summary(row: WorkflowORM, agent_count: int = 0) -> WorkflowSummary:
    return WorkflowSummary(
        id=row.id,
        name=row.name,
        description=row.description,
        process_id=row.process_id,
        is_future_state=row.is_future_state,
        created_at=row.created_at,
        updated_at=row.updated_at,
        node_count=len(row.nodes),
        agent_count=agent_count,
        estimated_cycle_time_days=row.estimated_cycle_time_days,
        generation_source=row.generation_source,
    )


def workflow_to_read(row: WorkflowORM, agents: list[AgentORM]) -> WorkflowRead:
    agent_reads = [agent_to_read(a) for a in agents]
    agent_by_node: dict[str, str] = {}
    for a in agent_reads:
        for nid in a.node_ids:
            agent_by_node[nid] = a.id
    nodes = [WorkflowNode(**n, agent_id=agent_by_node.get(n["node_id"])) for n in row.nodes]
    return WorkflowRead(
        id=row.id,
        name=row.name,
        description=row.description,
        process_id=row.process_id,
        is_future_state=row.is_future_state,
        created_at=row.created_at,
        updated_at=row.updated_at,
        nodes=nodes,
        edges=[WorkflowEdge(**e) for e in row.edges],
        agents=agent_reads,
        removed_step_ids=json.loads(row.removed_step_ids_json or "[]"),
        expected_improvements=json.loads(row.expected_improvements_json or "[]"),
        governance_controls=json.loads(row.governance_controls_json or "[]"),
        estimated_cycle_time_days=row.estimated_cycle_time_days,
        estimated_effort_minutes=row.estimated_effort_minutes,
        generation_source=row.generation_source,
        confidence=row.confidence,
    )


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

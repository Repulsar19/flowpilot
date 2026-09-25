"""Pydantic API contracts shared conceptually with the frontend."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from models.enums import (
    AgentStatus,
    ApprovalStatus,
    AuditActorType,
    DocumentStatus,
    RedesignStage,
    RedesignStatus,
    StepClassification,
    WorkflowExecutionStatus,
)


class EvidenceItem(BaseModel):
    source: str
    excerpt: str | None = None


class AIRecommendation(BaseModel):
    recommendation: str
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: list[str] = Field(default_factory=list)
    human_approval_required: bool = False
    escalation_condition: str | None = None
    risk_level: str | None = None
    ai_tasks: list[str] = Field(default_factory=list)
    human_tasks: list[str] = Field(default_factory=list)


class ProcessStepBase(BaseModel):
    name: str
    description: str | None = None
    actor: str | None = None
    input: str | None = None
    output: str | None = None
    duration_minutes: float | None = None
    elapsed_days: float | None = None
    decision_required: bool = False
    decision_description: str | None = None
    automation_potential: float | None = Field(default=None, ge=0.0, le=1.0)
    ai_suitability: float | None = Field(default=None, ge=0.0, le=1.0)
    classification: StepClassification = StepClassification.UNCLASSIFIED
    evidence: list[str] = Field(default_factory=list)
    systems: list[str] = Field(default_factory=list)
    pain_points: list[str] = Field(default_factory=list)
    handoff_to: str | None = None


class ProcessStepCreate(ProcessStepBase):
    sequence: int = 0


class ProcessStepRead(ProcessStepBase):
    id: str
    process_id: str
    sequence: int
    ai_recommendation: AIRecommendation | None = None

    model_config = {"from_attributes": True}


class ProcessBase(BaseModel):
    name: str
    description: str | None = None
    source_document_id: str | None = None


class ProcessCreate(ProcessBase):
    steps: list[ProcessStepCreate] = Field(default_factory=list)


class ProcessRole(BaseModel):
    name: str
    responsibilities: list[str] = Field(default_factory=list)


class ProcessSystem(BaseModel):
    name: str
    purpose: str


class ProcessSummary(ProcessBase):
    """Lightweight list view (no steps)."""

    id: str
    created_at: datetime
    updated_at: datetime
    step_count: int
    role_count: int
    total_cycle_time_days: float | None = None
    extraction_confidence: float | None = None
    analysis_source: str | None = None
    redesign_status: RedesignStatus = RedesignStatus.NOT_STARTED
    future_workflow_id: str | None = None


class ProcessRead(ProcessBase):
    id: str
    created_at: datetime
    updated_at: datetime
    steps: list[ProcessStepRead] = Field(default_factory=list)
    roles: list[ProcessRole] = Field(default_factory=list)
    systems: list[ProcessSystem] = Field(default_factory=list)
    pain_points: list[str] = Field(default_factory=list)
    regulatory_references: list[str] = Field(default_factory=list)
    total_cycle_time_days: float | None = None
    extraction_confidence: float | None = None
    analysis_source: str | None = None
    redesign_status: RedesignStatus = RedesignStatus.NOT_STARTED
    redesign_stage: RedesignStage | None = None
    redesign_error: str | None = None
    redesign_source: str | None = None
    bottleneck_summary: str | None = None
    classification_summary: str | None = None
    governance_notes: list[str] = Field(default_factory=list)
    future_workflow_id: str | None = None

    model_config = {"from_attributes": True}


class DocumentSectionRead(BaseModel):
    label: str
    title: str
    page: int | None = None


class DocumentBase(BaseModel):
    filename: str
    content_type: str
    size_bytes: int


class DocumentRead(DocumentBase):
    id: str
    status: DocumentStatus
    uploaded_at: datetime
    page_count: int | None = None
    extract_preview: str | None = None
    sections: list[DocumentSectionRead] = Field(default_factory=list)
    is_demo: bool = False
    error_message: str | None = None
    process_id: str | None = None
    text_length: int | None = None

    model_config = {"from_attributes": True}


class DocumentTextRead(BaseModel):
    id: str
    filename: str
    text: str
    sections: list[DocumentSectionRead] = Field(default_factory=list)


class AIStatus(BaseModel):
    provider: str
    available: bool
    model: str | None = None
    demo_mode: bool


class AgentBase(BaseModel):
    name: str
    purpose: str
    input_description: str
    output_description: str
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    prohibited_actions: list[str] = Field(default_factory=list)
    node_ids: list[str] = Field(default_factory=list)
    confidence_threshold: float = Field(default=0.85, ge=0.0, le=1.0)
    escalation_conditions: str | None = None
    human_approval_required: bool = False
    is_ai: bool = True
    status: AgentStatus = AgentStatus.DRAFT


class AgentCreate(AgentBase):
    workflow_id: str | None = None


class AgentRead(AgentBase):
    id: str
    workflow_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkflowBase(BaseModel):
    name: str
    description: str | None = None
    process_id: str | None = None
    is_future_state: bool = False


class WorkflowCreate(WorkflowBase):
    pass


class WorkflowNode(BaseModel):
    node_id: str
    name: str
    type: str
    actor: str = ""
    description: str = ""
    replaces_step_ids: list[str] = Field(default_factory=list)
    estimated_minutes: float = 0
    estimated_elapsed_days: float = 0
    human_approval_gate: bool = False
    escalation_to: str = ""
    agent_id: str | None = None


class WorkflowEdge(BaseModel):
    source: str
    target: str
    label: str = ""
    is_escalation: bool = False


class WorkflowSummary(WorkflowBase):
    id: str
    created_at: datetime
    updated_at: datetime
    node_count: int = 0
    agent_count: int = 0
    estimated_cycle_time_days: float | None = None
    generation_source: str | None = None


class WorkflowRead(WorkflowBase):
    id: str
    created_at: datetime
    updated_at: datetime
    nodes: list[WorkflowNode] = Field(default_factory=list)
    edges: list[WorkflowEdge] = Field(default_factory=list)
    agents: list[AgentRead] = Field(default_factory=list)
    removed_step_ids: list[str] = Field(default_factory=list)
    expected_improvements: list[str] = Field(default_factory=list)
    governance_controls: list[str] = Field(default_factory=list)
    estimated_cycle_time_days: float | None = None
    estimated_effort_minutes: float | None = None
    generation_source: str | None = None
    confidence: float | None = None

    model_config = {"from_attributes": True}


class WorkflowExecutionRead(BaseModel):
    id: str
    workflow_id: str
    status: WorkflowExecutionStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    current_step_id: str | None = None

    model_config = {"from_attributes": True}


class ApprovalRead(BaseModel):
    id: str
    execution_id: str
    step_id: str | None = None
    status: ApprovalStatus
    ai_recommendation: AIRecommendation | None = None
    reviewer: str | None = None
    decision_at: datetime | None = None
    comments: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditEventRead(BaseModel):
    id: str
    timestamp: datetime
    actor_type: AuditActorType
    actor_name: str
    action: str
    details: dict[str, Any] = Field(default_factory=dict)
    execution_id: str | None = None

    model_config = {"from_attributes": True}


class BusinessMetricAssumptions(BaseModel):
    hourly_labor_cost_usd: float = 75.0
    error_cost_per_incident_usd: float = 500.0
    working_days_per_year: int = 250


class BusinessMetricSnapshot(BaseModel):
    label: str
    processing_time_hours: float
    manual_steps: int
    human_handoffs: int
    labor_hours: float
    estimated_cost_usd: float
    error_opportunities: int
    ai_assisted_steps: int = 0
    automated_steps: int = 0
    human_approval_steps: int = 0


class BusinessImpactRead(BaseModel):
    process_id: str | None = None
    simulated: bool = True
    assumptions: BusinessMetricAssumptions
    before: BusinessMetricSnapshot
    after: BusinessMetricSnapshot
    time_saved_hours: float
    cost_saved_usd: float


class BottleneckRead(BaseModel):
    id: str
    process_id: str
    process_step_id: str | None = None
    step_name: str
    step_sequence: int | None = None
    rank: int
    problem: str
    cause: str
    estimated_delay_hours: float
    frequency: str
    suggested_improvement: str
    opportunity: str
    severity: str
    confidence: float
    evidence: list[str] = Field(default_factory=list)


class DashboardSummary(BaseModel):
    active_workflows: int
    processes_analyzed: int
    ai_agents: int
    pending_approvals: int
    estimated_time_saved_hours: float
    estimated_cost_saved_usd: float
    recent_activity: list[AuditEventRead] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str = "0.1.0-phase1"


class MessageResponse(BaseModel):
    message: str
    detail: str | None = None

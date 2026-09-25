"""SQLAlchemy ORM entities."""

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.enums import (
    AgentStatus,
    ApprovalStatus,
    AuditActorType,
    DocumentStatus,
    RedesignStatus,
    StepClassification,
    WorkflowExecutionStatus,
)
from services.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DocumentORM(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default=DocumentStatus.UPLOADED)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    storage_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extract_preview: Mapped[str | None] = mapped_column(Text, nullable=True)
    sections_json: Mapped[str] = mapped_column(Text, default="[]")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    process_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    @property
    def sections(self) -> list[dict]:
        return json.loads(self.sections_json or "[]")


class ProcessORM(Base):
    __tablename__ = "processes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_document_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("documents.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
    roles_json: Mapped[str] = mapped_column(Text, default="[]")
    systems_json: Mapped[str] = mapped_column(Text, default="[]")
    pain_points_json: Mapped[str] = mapped_column(Text, default="[]")
    regulatory_references_json: Mapped[str] = mapped_column(Text, default="[]")
    total_cycle_time_days: Mapped[float | None] = mapped_column(Float, nullable=True)
    extraction_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    analysis_source: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Phase 3 redesign pipeline state
    redesign_status: Mapped[str] = mapped_column(String(32), default=RedesignStatus.NOT_STARTED)
    redesign_stage: Mapped[str | None] = mapped_column(String(32), nullable=True)
    redesign_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    redesign_source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    bottleneck_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    classification_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    governance_notes_json: Mapped[str] = mapped_column(Text, default="[]")
    future_workflow_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    steps: Mapped[list["ProcessStepORM"]] = relationship(back_populates="process", cascade="all, delete-orphan")
    bottlenecks: Mapped[list["BottleneckORM"]] = relationship(back_populates="process", cascade="all, delete-orphan")

    @property
    def governance_notes(self) -> list[str]:
        return json.loads(self.governance_notes_json or "[]")

    @property
    def roles(self) -> list[dict]:
        return json.loads(self.roles_json or "[]")

    @property
    def systems(self) -> list[dict]:
        return json.loads(self.systems_json or "[]")

    @property
    def pain_points(self) -> list[str]:
        return json.loads(self.pain_points_json or "[]")

    @property
    def regulatory_references(self) -> list[str]:
        return json.loads(self.regulatory_references_json or "[]")


class ProcessStepORM(Base):
    __tablename__ = "process_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    process_id: Mapped[str] = mapped_column(String(36), ForeignKey("processes.id"), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor: Mapped[str | None] = mapped_column(String(128), nullable=True)
    input_desc: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_desc: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    elapsed_days: Mapped[float | None] = mapped_column(Float, nullable=True)
    decision_required: Mapped[bool] = mapped_column(Boolean, default=False)
    decision_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    automation_potential: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_suitability: Mapped[float | None] = mapped_column(Float, nullable=True)
    classification: Mapped[str] = mapped_column(String(32), default=StepClassification.UNCLASSIFIED)
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    systems_json: Mapped[str] = mapped_column(Text, default="[]")
    pain_points_json: Mapped[str] = mapped_column(Text, default="[]")
    handoff_to: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ai_recommendation_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    process: Mapped["ProcessORM"] = relationship(back_populates="steps")

    @property
    def evidence(self) -> list[str]:
        return json.loads(self.evidence_json or "[]")

    @property
    def systems(self) -> list[str]:
        return json.loads(self.systems_json or "[]")

    @property
    def pain_points(self) -> list[str]:
        return json.loads(self.pain_points_json or "[]")


class BottleneckORM(Base):
    __tablename__ = "bottlenecks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    process_id: Mapped[str] = mapped_column(String(36), ForeignKey("processes.id"), nullable=False)
    process_step_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("process_steps.id"), nullable=True)
    rank: Mapped[int] = mapped_column(Integer, default=0)
    problem: Mapped[str] = mapped_column(Text, nullable=False)
    cause: Mapped[str] = mapped_column(Text, nullable=False)
    estimated_delay_hours: Mapped[float] = mapped_column(Float, default=0.0)
    frequency: Mapped[str] = mapped_column(String(256), default="")
    suggested_improvement: Mapped[str] = mapped_column(Text, nullable=False)
    opportunity: Mapped[str] = mapped_column(String(32), default="PROCESS_CHANGE")
    severity: Mapped[str] = mapped_column(String(16), default="medium")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")

    process: Mapped["ProcessORM"] = relationship(back_populates="bottlenecks")

    @property
    def evidence(self) -> list[str]:
        return json.loads(self.evidence_json or "[]")


class AgentORM(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    workflow_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("workflows.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    input_description: Mapped[str] = mapped_column(Text, nullable=False)
    output_description: Mapped[str] = mapped_column(Text, nullable=False)
    inputs_json: Mapped[str] = mapped_column(Text, default="[]")
    outputs_json: Mapped[str] = mapped_column(Text, default="[]")
    tools_json: Mapped[str] = mapped_column(Text, default="[]")
    permissions_json: Mapped[str] = mapped_column(Text, default="[]")
    prohibited_actions_json: Mapped[str] = mapped_column(Text, default="[]")
    node_ids_json: Mapped[str] = mapped_column(Text, default="[]")
    confidence_threshold: Mapped[float] = mapped_column(Float, default=0.85)
    escalation_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    human_approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    is_ai: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(32), default=AgentStatus.DRAFT)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class WorkflowORM(Base):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    process_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("processes.id"), nullable=True)
    is_future_state: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
    # Future-state graph (Phase 3)
    nodes_json: Mapped[str] = mapped_column(Text, default="[]")
    edges_json: Mapped[str] = mapped_column(Text, default="[]")
    removed_step_ids_json: Mapped[str] = mapped_column(Text, default="[]")
    expected_improvements_json: Mapped[str] = mapped_column(Text, default="[]")
    governance_controls_json: Mapped[str] = mapped_column(Text, default="[]")
    estimated_cycle_time_days: Mapped[float | None] = mapped_column(Float, nullable=True)
    estimated_effort_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    generation_source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    @property
    def nodes(self) -> list[dict]:
        return json.loads(self.nodes_json or "[]")

    @property
    def edges(self) -> list[dict]:
        return json.loads(self.edges_json or "[]")


class WorkflowExecutionORM(Base):
    __tablename__ = "workflow_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflows.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default=WorkflowExecutionStatus.IDLE)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_step_id: Mapped[str | None] = mapped_column(String(36), nullable=True)


class ApprovalORM(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    execution_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_executions.id"), nullable=False)
    step_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default=ApprovalStatus.PENDING)
    ai_recommendation_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewer: Mapped[str | None] = mapped_column(String(256), nullable=True)
    decision_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class AuditEventORM(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    actor_type: Mapped[str] = mapped_column(String(32), default=AuditActorType.SYSTEM)
    actor_name: Mapped[str] = mapped_column(String(256), nullable=False)
    action: Mapped[str] = mapped_column(String(512), nullable=False)
    details_json: Mapped[str] = mapped_column(Text, default="{}")
    execution_id: Mapped[str | None] = mapped_column(String(36), nullable=True)


class BusinessMetricORM(Base):
    __tablename__ = "business_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    process_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("processes.id"), nullable=True)
    assumptions_json: Mapped[str] = mapped_column(Text, default="{}")
    before_json: Mapped[str] = mapped_column(Text, default="{}")
    after_json: Mapped[str] = mapped_column(Text, default="{}")

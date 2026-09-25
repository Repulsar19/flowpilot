from enum import StrEnum


class DocumentStatus(StrEnum):
    """Lifecycle of an uploaded SOP. The frontend maps these to progress stages."""

    UPLOADED = "uploaded"
    EXTRACTING = "extracting"
    EXTRACTED = "extracted"
    ANALYZING = "analyzing"
    MAPPING = "mapping"
    READY = "ready"
    FAILED = "failed"


class StepClassification(StrEnum):
    AI_AGENT = "AI_AGENT"
    AUTOMATION = "AUTOMATION"
    HUMAN = "HUMAN"
    HUMAN_AI = "HUMAN_AI"
    UNCLASSIFIED = "UNCLASSIFIED"


class AgentStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    DEPRECATED = "deprecated"


class ApprovalStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVIEW_REQUESTED = "review_requested"


class WorkflowExecutionStatus(StrEnum):
    IDLE = "idle"
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"


class AuditActorType(StrEnum):
    SYSTEM = "system"
    AI_AGENT = "ai_agent"
    HUMAN = "human"

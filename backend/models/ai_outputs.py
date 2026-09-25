"""Structured output schemas returned by AI agents.

Every agent returns one of these models via OpenAI structured outputs, so the
rest of the system never parses free-form text. Keep fields free of defaults:
strict JSON schema mode requires every property to be present.
"""

from typing import Literal

from pydantic import BaseModel, Field


class ExtractedRole(BaseModel):
    name: str = Field(description="Role title exactly as used in the SOP")
    responsibilities: list[str] = Field(description="Key responsibilities listed for this role")


class ExtractedSystem(BaseModel):
    name: str = Field(description="System, tool or record name (e.g. eQMS, DMS, Excel log)")
    purpose: str = Field(description="What the system is used for in this process")


class ExtractedStep(BaseModel):
    step_id: str = Field(description="Stable identifier such as step_01, step_02 in process order")
    name: str = Field(description="Short step name (max 6 words)")
    description: str = Field(description="What happens in this step, 1-3 sentences")
    actor: str = Field(description="Primary role responsible for performing the step")
    input: str = Field(description="Inputs consumed by the step")
    output: str = Field(description="Outputs or records produced by the step")
    duration_minutes: float = Field(description="Typical hands-on effort in minutes (midpoint if a range is given)")
    elapsed_days: float = Field(description="Typical elapsed calendar/business days including waiting; 0 if same day")
    decision_required: bool = Field(description="True if the step includes a formal decision or approval")
    decision_description: str = Field(description="The decision made, or empty string if none")
    systems: list[str] = Field(description="Systems used in this step")
    handoff_to: str = Field(description="Role that receives the output, or empty string if the process ends")
    automation_potential: float = Field(ge=0, le=1, description="0-1 likelihood that rule-based automation could perform this step")
    ai_suitability: float = Field(ge=0, le=1, description="0-1 suitability for an AI agent (document understanding, reasoning, drafting)")
    pain_points: list[str] = Field(description="Explicit or implied inefficiencies mentioned for this step")
    evidence: list[str] = Field(description="SOP section references supporting this extraction, e.g. 'Section 6.3.2'")


class ProcessExtraction(BaseModel):
    process_name: str = Field(description="Name of the business process")
    summary: str = Field(description="2-3 sentence plain-language summary of the current-state process")
    roles: list[ExtractedRole]
    systems: list[ExtractedSystem]
    steps: list[ExtractedStep] = Field(description="Ordered list of process steps")
    total_cycle_time_days: float = Field(description="Estimated end-to-end elapsed business days")
    key_pain_points: list[str] = Field(description="Top process-level pain points and bottlenecks")
    confidence: float = Field(ge=0, le=1, description="Overall confidence in the extraction")
    regulatory_references: list[str] = Field(description="External regulations or standards cited by the SOP")


# --------------------------------------------------------------------------- bottlenecks


class Bottleneck(BaseModel):
    step_id: str = Field(description="step_id of the affected current-state step")
    problem: str = Field(description="What slows the process down, one sentence")
    cause: str = Field(description="Root cause as evidenced by the SOP")
    estimated_delay_hours: float = Field(description="Typical delay attributable to this bottleneck, in hours (elapsed, not effort)")
    frequency: str = Field(description="How often it occurs, e.g. 'every change', '~40 times per week', '20% of changes'")
    suggested_improvement: str = Field(description="Concrete redesign suggestion")
    opportunity: Literal["AI_AGENT", "AUTOMATION", "HUMAN", "HUMAN_AI", "PROCESS_CHANGE"] = Field(
        description="Primary type of intervention that addresses the bottleneck"
    )
    severity: Literal["low", "medium", "high"]
    confidence: float = Field(ge=0, le=1)
    evidence: list[str] = Field(description="SOP section references")


class BottleneckAnalysis(BaseModel):
    bottlenecks: list[Bottleneck]
    summary: str = Field(description="2-3 sentences on where elapsed time and effort are concentrated")
    total_addressable_delay_hours: float = Field(description="Sum of estimated_delay_hours that the suggestions could remove")
    confidence: float = Field(ge=0, le=1)


# --------------------------------------------------------------------------- classification


ClassificationLabel = Literal["AI_AGENT", "AUTOMATION", "HUMAN", "HUMAN_AI"]


class StepClassificationDecision(BaseModel):
    step_id: str
    classification: ClassificationLabel
    recommendation: str = Field(description="What should happen to this step in the redesigned process")
    reasoning: str = Field(description="Why this classification, referencing task characteristics")
    confidence: float = Field(ge=0, le=1)
    risk_level: Literal["low", "medium", "high"] = Field(description="Consequence if the step is performed wrongly")
    human_approval_required: bool = Field(description="True if a human must approve before the outcome takes effect")
    escalation_condition: str = Field(description="When work must be routed to a human, e.g. 'confidence < 0.85 or High risk'")
    ai_tasks: list[str] = Field(description="Sub-tasks an AI agent or automation would perform (empty for HUMAN)")
    human_tasks: list[str] = Field(description="Sub-tasks that remain with a person (empty for fully automated)")
    evidence: list[str] = Field(description="SOP section references")


class ClassificationResult(BaseModel):
    decisions: list[StepClassificationDecision]
    summary: str
    governance_notes: list[str] = Field(description="Cross-cutting guardrails, e.g. Part 11 signatures stay human")
    confidence: float = Field(ge=0, le=1)


# --------------------------------------------------------------------------- future state


NodeType = Literal["START", "END", "AI_AGENT", "AUTOMATION", "HUMAN", "HUMAN_AI", "DECISION"]


class FutureNode(BaseModel):
    node_id: str = Field(description="Stable id such as n01")
    name: str = Field(description="Short label (max 6 words)")
    type: NodeType
    actor: str = Field(description="Agent name for AI_AGENT/AUTOMATION nodes, role name for HUMAN/HUMAN_AI nodes, empty for START/END/DECISION")
    description: str = Field(description="What happens at this node, 1-2 sentences")
    replaces_step_ids: list[str] = Field(description="Current-state step_ids this node replaces or absorbs")
    estimated_minutes: float = Field(description="Hands-on human effort in minutes at this node (0 for fully automated)")
    estimated_elapsed_days: float = Field(description="Typical elapsed business days including waiting")
    human_approval_gate: bool = Field(description="True if this node is a formal human approval point")
    escalation_to: str = Field(description="Role that receives escalations from this node, or empty string")


class FutureEdge(BaseModel):
    source: str
    target: str
    label: str = Field(description="Short edge label such as 'Low risk' or 'confidence < 0.85'; empty if unconditional")
    is_escalation: bool = Field(description="True when this edge routes work from an agent to a human for review")


class AgentSpec(BaseModel):
    name: str
    purpose: str
    inputs: list[str] = Field(description="Information sources the agent uses")
    outputs: list[str] = Field(description="Artifacts or decisions the agent produces")
    tools: list[str] = Field(description="Capabilities or integrations, e.g. 'DMS search', 'eQMS write'")
    permissions: list[str] = Field(description="Actions the agent MAY take, e.g. 'draft impact assessment'")
    prohibited_actions: list[str] = Field(description="Actions the agent MUST NOT take, e.g. 'approve change requests'")
    confidence_threshold: float = Field(ge=0, le=1)
    escalation_conditions: str
    human_approval_required: bool
    node_ids: list[str] = Field(description="Future-state node_ids where this agent operates")


class FutureStateWorkflow(BaseModel):
    name: str
    summary: str = Field(description="How the redesigned process works end to end, 3-4 sentences")
    nodes: list[FutureNode]
    edges: list[FutureEdge]
    agents: list[AgentSpec]
    removed_step_ids: list[str] = Field(description="Current-state steps that disappear entirely")
    expected_improvements: list[str] = Field(description="Quantified where possible, e.g. 'CCB wait 4.5 days → 2 days via async e-vote'")
    estimated_cycle_time_days: float = Field(description="Estimated end-to-end business days, same basis as the current-state figure")
    estimated_effort_minutes: float = Field(description="Total hands-on human minutes per change")
    governance_controls: list[str] = Field(description="Where human oversight, audit and Part 11 controls sit")
    confidence: float = Field(ge=0, le=1)

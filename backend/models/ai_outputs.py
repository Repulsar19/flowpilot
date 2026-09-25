"""Structured output schemas returned by AI agents.

Every agent returns one of these models via OpenAI structured outputs, so the
rest of the system never parses free-form text. Keep fields free of defaults:
strict JSON schema mode requires every property to be present.
"""

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

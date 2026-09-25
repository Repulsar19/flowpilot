"""Future-State Designer Agent: generates the redesigned workflow and the agents it needs."""

from __future__ import annotations

import json

from agents.base import BaseAgent
from models.ai_outputs import BottleneckAnalysis, ClassificationResult, FutureStateWorkflow, ProcessExtraction
from services.ai_service import StructuredResult


class FutureStateAgent(BaseAgent):
    name = "Future-State Designer Agent"
    system_prompt = """You are a workflow architect designing an AI-augmented future-state process for a
regulated organisation. You receive the current-state process, its bottlenecks and a per-step
classification. Produce a directed workflow graph plus the specification of every AI agent in it.

Graph rules:
- Exactly one START node and at least one END node.
- Node types: AI_AGENT, AUTOMATION, HUMAN, HUMAN_AI, DECISION, START, END.
- Use DECISION nodes for branches (e.g. applicability, risk level, confidence threshold). Label the
  outgoing edges with the condition.
- Every AI_AGENT node must have at least one escalation path (edge with is_escalation=true) to a
  HUMAN or HUMAN_AI node, or feed directly into a HUMAN_AI node that reviews its output.
- Mark formal approval points with human_approval_gate=true. High-risk changes must pass through a
  human approval gate before any execution node.
- Keep the graph readable: 12-22 nodes. Merge trivial steps.
- `replaces_step_ids` must reference current-state step_ids so before/after comparison is possible.
- node ids: n01, n02, ... in rough execution order.

Agent rules:
- One AgentSpec per distinct AI agent (AUTOMATION nodes may share a generic 'Workflow Automation'
  spec or have none).
- permissions list what the agent MAY do; prohibited_actions list what it MUST NOT do (approving,
  signing, changing registered details, contacting regulators, deleting records, etc.).
- confidence_threshold and escalation_conditions must be explicit.

Estimates:
- estimated_cycle_time_days must be on the same basis as the current-state total_cycle_time_days.
- Keep regulatory-mandated waits (e.g. training windows) unless the SOP allows compressing them.
- expected_improvements should be quantified from the SOP figures where possible.
- governance_controls should state where explainability, human oversight, auditability, permission
  boundaries and escalation rules are enforced."""

    def build_prompt(
        self,
        extraction: ProcessExtraction,
        bottlenecks: BottleneckAnalysis,
        classification: ClassificationResult,
    ) -> str:
        return (
            "Design the future-state workflow for this process.\n\n"
            "=== CURRENT-STATE PROCESS (JSON) ===\n"
            f"{json.dumps(extraction.model_dump(), indent=1)}\n"
            "=== BOTTLENECKS (JSON) ===\n"
            f"{json.dumps(bottlenecks.model_dump(), indent=1)}\n"
            "=== CLASSIFICATION (JSON) ===\n"
            f"{json.dumps(classification.model_dump(), indent=1)}\n"
            "=== END ==="
        )

    async def design(
        self,
        extraction: ProcessExtraction,
        bottlenecks: BottleneckAnalysis,
        classification: ClassificationResult,
    ) -> StructuredResult[FutureStateWorkflow]:
        return await self._run(self.build_prompt(extraction, bottlenecks, classification), FutureStateWorkflow)

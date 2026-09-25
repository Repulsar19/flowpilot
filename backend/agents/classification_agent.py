"""Classification Agent: decides AI agent vs automation vs human vs human+AI per step."""

from __future__ import annotations

import json

from agents.base import BaseAgent
from models.ai_outputs import BottleneckAnalysis, ClassificationResult, ProcessExtraction
from services.ai_service import StructuredResult


class ClassificationAgent(BaseAgent):
    name = "Work Classification Agent"
    system_prompt = """You are an AI transformation architect for regulated (GxP) operations.
For every current-state step decide who should perform it in the redesigned process.

Classification rules:
- AI_AGENT: the step is mainly document understanding, information extraction, classification,
  summarisation, semantic matching, drafting or recommendation, AND the consequence of an error is
  recoverable before it affects product quality, patient safety or a regulatory record.
- AUTOMATION: the step is deterministic and rule-based (copying data between systems, routing,
  notifications, reminders, status updates, scheduling). No judgement involved.
- HUMAN: the step requires accountability, formal approval, electronic signature (21 CFR Part 11),
  judgement under ambiguity, exception handling or a high-risk decision. AI may assist but must not
  perform the step.
- HUMAN_AI: AI prepares the work (draft, analysis, proposal with evidence) and a named human makes
  the final decision or confirms. Use this for reviews, assessments and classifications where the
  human remains accountable.

Governance rules that always apply:
- Approvals, e-signatures and risk acceptance stay with humans.
- Any AI output feeding a HIGH risk decision requires human approval.
- Every AI_AGENT and HUMAN_AI step must state an escalation condition (confidence threshold and/or
  risk trigger) that routes work to a human.
- Never claim the AI decision is automatically correct; express confidence honestly.

Output one decision per step_id, with recommendation, reasoning, confidence, risk_level,
human_approval_required, escalation_condition, ai_tasks, human_tasks and SOP evidence."""

    def build_prompt(self, extraction: ProcessExtraction, bottlenecks: BottleneckAnalysis) -> str:
        return (
            "Classify each step of this process for the redesigned workflow.\n\n"
            "=== CURRENT-STATE PROCESS (JSON) ===\n"
            f"{json.dumps(extraction.model_dump(), indent=1)}\n"
            "=== BOTTLENECK ANALYSIS (JSON) ===\n"
            f"{json.dumps(bottlenecks.model_dump(), indent=1)}\n"
            "=== END ==="
        )

    async def classify(
        self, extraction: ProcessExtraction, bottlenecks: BottleneckAnalysis
    ) -> StructuredResult[ClassificationResult]:
        return await self._run(self.build_prompt(extraction, bottlenecks), ClassificationResult)

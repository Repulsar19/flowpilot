"""Process Analyzer Agent: turns SOP text into a structured current-state process."""

from __future__ import annotations

from agents.base import BaseAgent
from models.ai_outputs import ProcessExtraction
from services.ai_service import StructuredResult

MAX_CHARS = 60_000  # keep well inside model context for long SOPs


class ProcessAnalyzerAgent(BaseAgent):
    name = "Process Analyzer Agent"
    system_prompt = """You are a business process analyst specialising in regulated (GxP) operations.
You read Standard Operating Procedures and extract the current-state process faithfully.

Rules:
- Extract ONLY what the SOP states or clearly implies. Do not invent steps, systems or timings.
- One step per distinct activity performed by a role. Merge sub-clauses of the same activity.
- Use the SOP's own role names and system names.
- duration_minutes is hands-on effort; elapsed_days includes waiting. Use midpoints of ranges.
- automation_potential is high when the step is deterministic and rule-based (data entry, routing,
  notifications, status updates). ai_suitability is high when the step needs reading, extraction,
  classification, summarisation, drafting or recommendation. Approvals and accountability
  decisions have low automation_potential and moderate ai_suitability (AI can prepare, not decide).
- Every step must cite the SOP sections it came from in `evidence`.
- pain_points should capture explicit statements (waiting times, rework percentages, manual
  re-entry) and clearly implied inefficiencies.
- Set `confidence` lower when the SOP is vague, contradictory, or when timings are missing."""

    def build_prompt(self, sop_text: str, filename: str) -> str:
        text = sop_text[:MAX_CHARS]
        truncated = " (truncated)" if len(sop_text) > MAX_CHARS else ""
        return (
            f"Document: {filename}{truncated}\n\n"
            "Extract the current-state business process from the following SOP.\n\n"
            "=== SOP TEXT START ===\n"
            f"{text}\n"
            "=== SOP TEXT END ==="
        )

    async def analyze(self, sop_text: str, filename: str) -> StructuredResult[ProcessExtraction]:
        return await self._run(self.build_prompt(sop_text, filename), ProcessExtraction)

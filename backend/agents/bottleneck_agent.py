"""Bottleneck Agent: finds where elapsed time, effort and rework concentrate."""

from __future__ import annotations

import json

from agents.base import BaseAgent
from models.ai_outputs import BottleneckAnalysis, ProcessExtraction
from services.ai_service import StructuredResult


class BottleneckAgent(BaseAgent):
    name = "Bottleneck Detection Agent"
    system_prompt = """You are a lean/operational-excellence analyst reviewing a regulated business process.
You receive a structured current-state process extracted from an SOP and identify bottlenecks.

Rules:
- A bottleneck is a step (or wait between steps) that disproportionately adds elapsed time, effort,
  rework or error risk. Use the stated timings, percentages and pain points; do not invent numbers.
- estimated_delay_hours is ELAPSED time (waiting + effort) that the bottleneck adds per occurrence.
  Convert business days to hours at 8 hours per day.
- `opportunity` names the intervention type: AI_AGENT for reading/extraction/reasoning/drafting,
  AUTOMATION for deterministic rules and data movement, HUMAN_AI when AI prepares and a person
  decides, HUMAN when only a people/organisational change helps, PROCESS_CHANGE for policy or
  cadence changes (e.g. replacing a weekly meeting with asynchronous approval).
- Mandatory regulatory waits (e.g. training windows required by policy) may be bottlenecks but note
  in suggested_improvement which part is compressible.
- Cite SOP sections in `evidence` for every bottleneck.
- Be selective: report the bottlenecks that matter (typically 5-9), ordered by impact."""

    def build_prompt(self, extraction: ProcessExtraction) -> str:
        payload = extraction.model_dump()
        return (
            "Identify the bottlenecks in this current-state process.\n\n"
            "=== PROCESS (JSON) ===\n"
            f"{json.dumps(payload, indent=1)}\n"
            "=== END ==="
        )

    async def analyze(self, extraction: ProcessExtraction) -> StructuredResult[BottleneckAnalysis]:
        return await self._run(self.build_prompt(extraction), BottleneckAnalysis)

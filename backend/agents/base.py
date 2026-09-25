"""Shared plumbing for FlowPilot's internal analysis agents."""

from __future__ import annotations

from typing import TypeVar

from pydantic import BaseModel

from services.ai_service import AIService, StructuredResult, get_ai_service

T = TypeVar("T", bound=BaseModel)


class BaseAgent:
    """An internal agent wraps one structured AI call with a fixed system prompt.

    Subclasses set `name`, `system_prompt` and `output_schema`, and build the user
    prompt from their inputs. Keeping agents this thin makes each one testable and
    keeps all AI I/O typed.
    """

    name: str = "Base Agent"
    system_prompt: str = ""

    def __init__(self, ai: AIService | None = None) -> None:
        self.ai = ai or get_ai_service()

    async def _run(self, user_prompt: str, schema: type[T]) -> StructuredResult[T]:
        return await self.ai.complete_structured(system=self.system_prompt, user=user_prompt, schema=schema)

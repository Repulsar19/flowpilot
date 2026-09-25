"""AI provider abstraction.

Agents depend only on `AIService.complete_structured`, so swapping OpenAI for
another provider (or a local model) is a one-file change.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TypeVar

from pydantic import BaseModel

from config import settings

T = TypeVar("T", bound=BaseModel)


class AIUnavailableError(RuntimeError):
    """Raised when no AI provider is configured."""


@dataclass
class StructuredResult[T: BaseModel]:
    data: T
    model: str
    prompt_tokens: int | None
    completion_tokens: int | None


class AIService(ABC):
    name: str = "abstract"

    @property
    def available(self) -> bool:
        return True

    @abstractmethod
    async def complete_structured(self, *, system: str, user: str, schema: type[T]) -> StructuredResult[T]:
        raise NotImplementedError


class OpenAIService(AIService):
    name = "openai"

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self._api_key = api_key or settings.openai_api_key
        self._model = model or settings.openai_model

    @property
    def available(self) -> bool:
        return bool(self._api_key)

    async def complete_structured(self, *, system: str, user: str, schema: type[T]) -> StructuredResult[T]:
        if not self._api_key:
            raise AIUnavailableError("OPENAI_API_KEY is not configured")
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self._api_key)
        response = await client.chat.completions.parse(
            model=self._model,
            temperature=0.1,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format=schema,
        )
        message = response.choices[0].message
        if message.parsed is None:
            raise RuntimeError(f"Model returned no structured payload (refusal: {message.refusal})")
        usage = response.usage
        return StructuredResult(
            data=message.parsed,
            model=response.model or self._model,
            prompt_tokens=usage.prompt_tokens if usage else None,
            completion_tokens=usage.completion_tokens if usage else None,
        )


class UnavailableAIService(AIService):
    """Placeholder when no provider is configured. Demo mode uses cached analyses instead."""

    name = "unavailable"

    @property
    def available(self) -> bool:
        return False

    async def complete_structured(self, *, system: str, user: str, schema: type[T]) -> StructuredResult[T]:
        raise AIUnavailableError(
            "No AI provider configured. Set OPENAI_API_KEY in backend/.env, or use 'Load Demo SOP'."
        )


def get_ai_service() -> AIService:
    if settings.openai_api_key:
        return OpenAIService()
    return UnavailableAIService()

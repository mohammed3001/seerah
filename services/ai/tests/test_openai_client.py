"""Unit tests for the OpenAI client wrapper.

These exercise the model-selection and retry behavior without making real
network calls — the AsyncOpenAI client is replaced with a stub.
"""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from openai import APIStatusError

from seerah_ai.openai_client import OpenAIClient


def _stub_completion(content: str) -> Any:
    """Build the minimum object shape the wrapper reads from."""
    completion = MagicMock()
    completion.choices = [MagicMock()]
    completion.choices[0].message = MagicMock()
    completion.choices[0].message.content = content
    return completion


@pytest.fixture
def fake_async_openai() -> tuple[Any, AsyncMock]:
    create = AsyncMock(return_value=_stub_completion(json.dumps({"ok": True})))
    fake_client = MagicMock()
    fake_client.chat.completions.create = create
    return fake_client, create


@pytest.mark.asyncio
async def test_json_completion_uses_text_model_without_attachments(
    fake_async_openai: tuple[Any, AsyncMock],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client, create = fake_async_openai
    wrapper = OpenAIClient(client=fake_client)
    wrapper._settings.openai_model = "gpt-4o-mini"  # type: ignore[attr-defined]
    wrapper._settings.openai_vision_model = "gpt-4o"  # type: ignore[attr-defined]

    result = await wrapper.json_completion(
        system_prompt="sys",
        user_prompt="hello",
    )

    assert result == {"ok": True}
    assert create.call_args.kwargs["model"] == "gpt-4o-mini"


@pytest.mark.asyncio
async def test_json_completion_switches_to_vision_model_with_attachments(
    fake_async_openai: tuple[Any, AsyncMock],
) -> None:
    fake_client, create = fake_async_openai
    wrapper = OpenAIClient(client=fake_client)
    wrapper._settings.openai_model = "gpt-4o-mini"  # type: ignore[attr-defined]
    wrapper._settings.openai_vision_model = "gpt-4o"  # type: ignore[attr-defined]

    await wrapper.json_completion(
        system_prompt="sys",
        user_prompt="extract this",
        attachments=[
            {"type": "image_url", "image_url": {"url": "data:image/png;base64,xyz"}}
        ],
    )

    assert create.call_args.kwargs["model"] == "gpt-4o"
    sent_messages = create.call_args.kwargs["messages"]
    user_content = sent_messages[1]["content"]
    assert isinstance(user_content, list)
    assert user_content[0] == {"type": "text", "text": "extract this"}
    assert user_content[1]["type"] == "image_url"


@pytest.mark.asyncio
async def test_json_completion_retries_on_5xx_then_succeeds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response = MagicMock(status_code=503, headers={}, request=MagicMock())
    failure = APIStatusError("boom", response=response, body=None)

    create = AsyncMock(
        side_effect=[failure, _stub_completion(json.dumps({"recovered": True}))]
    )
    fake_client = MagicMock()
    fake_client.chat.completions.create = create
    wrapper = OpenAIClient(client=fake_client)

    # Don't actually sleep between retries during the test.
    async def _no_sleep(_: float) -> None:
        return None

    monkeypatch.setattr("seerah_ai.openai_client.asyncio.sleep", _no_sleep)

    result = await wrapper.json_completion(system_prompt="s", user_prompt="u")
    assert result == {"recovered": True}
    assert create.await_count == 2

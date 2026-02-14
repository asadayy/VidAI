"""
VidAI AI Service — Ollama Client
Async HTTP client for communicating with local Ollama instance.
"""

import json
import logging

import httpx

from app.config import settings

logger = logging.getLogger("vidai.ollama")


class OllamaService:
    """Async client for Ollama's HTTP API at localhost:11434."""

    def __init__(self) -> None:
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT

    async def is_healthy(self) -> bool:
        """Check if Ollama is running and the model is available."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code != 200:
                    return False

                data = response.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                # Check if our model is available (with or without :latest tag)
                return any(
                    self.model in name or name.startswith(self.model.split(":")[0])
                    for name in models
                )
        except Exception as exc:
            logger.warning("Ollama health check failed: %s", exc)
            return False

    async def chat(
        self,
        messages: list[dict],
        json_mode: bool = False,
    ) -> str:
        """
        Send a chat completion request to Ollama.

        Args:
            messages: List of {role, content} dicts (system + user + assistant).
            json_mode: If True, request JSON-only output from Ollama.

        Returns:
            The assistant's response text.

        Raises:
            httpx.HTTPStatusError: If Ollama returns non-2xx.
            httpx.ConnectError: If Ollama is not running.
        """
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "num_predict": 2048,
                "num_ctx": 4096,
            },
        }

        if json_mode:
            payload["format"] = "json"

        timeout = httpx.Timeout(self.timeout, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "")

    async def generate_json(self, messages: list[dict]) -> dict:
        """
        Send a chat request and parse the response as JSON.
        Used for structured outputs (budget plans, recommendations).

        Args:
            messages: List of {role, content} dicts.

        Returns:
            Parsed JSON dict from the model's response.

        Raises:
            ValueError: If the model's response is not valid JSON.
        """
        raw_response = await self.chat(messages, json_mode=True)

        # The model may wrap JSON in markdown code blocks — strip them
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            # Remove opening ```json or ``` line
            lines = cleaned.split("\n")
            lines = lines[1:]  # drop first ``` line
            # Remove closing ```
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            logger.error(
                "Failed to parse Ollama JSON response: %s\nRaw: %s",
                exc,
                raw_response[:500],
            )
            raise ValueError(
                f"AI model returned invalid JSON. Raw response: {raw_response[:200]}"
            ) from exc


# Module-level singleton
ollama_service = OllamaService()

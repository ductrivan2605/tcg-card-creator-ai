"""LLM client — wraps the Google Gen AI SDK.

Uses the official `google-genai` package. One client handles both text
(Gemini) and images (Imagen or Pollinations.ai). Requires GEMINI_API_KEY
to be set. Set IMAGE_PROVIDER=pollinations to use the free Pollinations.ai
image API instead of Imagen (no billing required).
"""
from __future__ import annotations

import json
import urllib.parse

try:
    import httpx as _httpx
except ImportError:
    _httpx = None  # only needed when IMAGE_PROVIDER=pollinations
from google import genai
from google.genai import types

from app.core.config import settings


class LLMError(RuntimeError):
    """Raised when an LLM call cannot be completed."""


class LLMClient:
    """Async client for Gemini text and Imagen/Pollinations image generation."""

    def __init__(self) -> None:
        if not settings.has_api_key:
            raise LLMError(
                "GEMINI_API_KEY is not set. The backend needs a Gemini "
                "API key to run. Set it in the environment or a .env file."
            )
        self._client = genai.Client(api_key=settings.gemini_api_key)

    async def generate_text(self, prompt: str, *, system: str | None = None) -> str:
        """Send a prompt to the text model and return the reply text."""
        config = None
        if system:
            config = types.GenerateContentConfig(system_instruction=system)
        
        models_to_try = [settings.text_model]
        if "gemini-2.5-flash" not in models_to_try:
            models_to_try.append("gemini-2.5-flash")

        last_exc = None
        for m in models_to_try:
            try:
                response = await self._client.aio.models.generate_content(
                    model=m,
                    contents=prompt,
                    config=config,
                )
                if response.text:
                    return response.text
            except Exception as exc:
                last_exc = exc
                if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                    continue
                raise
        if last_exc:
            raise last_exc
        raise LLMError("The model returned an empty response.")

    async def generate_json(
        self, prompt: str, *, system: str | None = None
    ) -> dict | list:
        """Send a prompt that asks for JSON; parse and return it.

        The model is instructed to reply with raw JSON. Markdown code
        fences are stripped before parsing.
        """
        raw = await self.generate_text(prompt, system=system)
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```", 2)[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
            cleaned = cleaned.strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise LLMError(f"The model did not return valid JSON: {exc}") from exc

    async def generate_image(self, prompt: str, *, aspect_ratio: str = "3:4") -> bytes:
        """Generate one image and return raw JPEG bytes.

        Routes to Pollinations.ai when IMAGE_PROVIDER=pollinations, otherwise
        uses Imagen. Imagen requires a billed Google Cloud account; Pollinations
        is free with no API key.
        """
        if settings.image_provider == "pollinations":
            return await self._generate_image_pollinations(prompt, aspect_ratio)
        return await self._generate_image_imagen(prompt, aspect_ratio)

    async def _generate_image_imagen(self, prompt: str, aspect_ratio: str) -> bytes:
        """Original Imagen path — unchanged."""
        response = await self._client.aio.models.generate_images(
            model=settings.image_model,
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect_ratio,
                output_mime_type="image/jpeg",
            ),
        )
        if not response.generated_images:
            raise LLMError("Imagen returned no image.")
        return response.generated_images[0].image.image_bytes

    async def _generate_image_pollinations(self, prompt: str, aspect_ratio: str) -> bytes:
        """Free Pollinations.ai path — no API key needed."""
        if _httpx is None:
            raise LLMError("httpx is not installed. Run: pip install httpx")
        sizes = {"3:4": (576, 768), "4:3": (768, 576), "1:1": (512, 512), "16:9": (768, 432), "9:16": (432, 768)}
        width, height = sizes.get(aspect_ratio, (512, 512))
        clean_prompt = prompt.replace("no nudity", "").replace("no cleavage", "").replace("no bikini", "").strip()
        clean_prompt += ", no text, no watermark, no logo, no signature, no borders"
        encoded = urllib.parse.quote(clean_prompt, safe="")
        encoded_neg = urllib.parse.quote("naked, nude, breasts, cleavage, topless, nsfw, bare chest, bare skin, exposed skin, bikini, unclothed, skimpy, underwear, lingerie, navel, sexy, provocative, sensual, watermark, logo, text, signature, stamp, label")
        url = (
            f"https://image.pollinations.ai/prompt/{encoded}"
            f"?width={width}&height={height}&nologo=true&nofeed=true&safe=true&negative_prompt={encoded_neg}"
        )
        async with _httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url)
        if response.status_code != 200:
            raise LLMError(f"Pollinations.ai returned HTTP {response.status_code}.")
        return response.content

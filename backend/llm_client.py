from __future__ import annotations

from typing import Optional, Generator
from google.genai import Client
import time

from settings import get_settings


class LlmClient:
    def __init__(self) -> None:
        settings = get_settings()

        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY missing")

        self.client = Client(api_key=settings.gemini_api_key)

        # stable default model
        self.model = "gemini-2.5-flash"

        print(f"✅ LLM CLIENT INITIALIZED | MODEL = {self.model}")

    # =========================================
    # NORMAL GENERATION
    # =========================================
    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        model: Optional[str] = None,
    ) -> str:
        selected_model = model or self.model
        prompt = user_prompt

        try:
            # light throttling
            time.sleep(1)

            response = self.client.models.generate_content(
                model=selected_model,
                contents=prompt,
                config={
                    "temperature": float(temperature),
                    "max_output_tokens": 3000,
                    "top_p": 0.95,
                },
            )

            text = getattr(response, "text", None)

            if text and text.strip():
                return text.strip()

            return "No response generated."

        except Exception as e:
            print("🔥 FULL LLM ERROR:", repr(e))
            raise

    # =========================================
    # STREAM GENERATION
    # =========================================
    def stream_generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        model: Optional[str] = None,
    ) -> Generator[str, None, None]:
        selected_model = model or self.model

        try:
            response_stream = self.client.models.generate_content_stream(
                model=selected_model,
                contents=prompt,
                config={
                    "temperature": float(temperature),
                    "max_output_tokens": 3000,
                    "top_p": 0.95,
                },
            )

            for chunk in response_stream:
                text = getattr(chunk, "text", None)

                if text:
                    yield text

        except Exception as e:
            print("🔥 STREAM LLM ERROR:", repr(e))
            raise
from __future__ import annotations

from typing import Optional
from google import genai

from settings import get_settings


class LlmClient:

    def __init__(self, model_name: Optional[str] = None) -> None:
        settings = get_settings()

        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is missing. Add it to your .env file."
            )

        # Initialize Gemini client
        self.client = genai.Client(api_key=settings.gemini_api_key)

        # Choose model
        self.model_name = model_name or settings.gemini_model

    def generate(self, system_prompt: str, user_prompt: str) -> str:

        prompt = f"""{system_prompt}

User Question:
{user_prompt}
"""

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )

            if response and hasattr(response, "text") and response.text:
                return response.text.strip()

            # fallback parsing
            if response and hasattr(response, "candidates"):
                candidates = response.candidates
                if candidates:
                    parts = candidates[0].content.parts
                    if parts:
                        return parts[0].text.strip()

            return "Model returned an empty response."

        except Exception as e:
            return f"LLM generation error: {str(e)}"
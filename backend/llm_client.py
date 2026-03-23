from __future__ import annotations

from typing import Optional
import google.generativeai as genai

from settings import get_settings


class LlmClient:

    def __init__(self) -> None:
        settings = get_settings()

        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY missing")

        #    Correct configuration
        genai.configure(api_key=settings.gemini_api_key)

        self.gemini_model = settings.gemini_model
    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        model: Optional[str] = None,
    ) -> str:

        prompt = f"""{system_prompt}

    User Question:
    {user_prompt}
    """

        try:
            #   Use stable model name supported in current SDK
            model_instance = genai.GenerativeModel("gemini-1.0-pro")

            response = model_instance.generate_content(
                prompt,
                generation_config={
                    "temperature": float(temperature)
                }
            )

            #   SAFE extraction (important)
            if response and hasattr(response, "text") and response.text:
                return response.text.strip()

            return "Empty response from model."

        except Exception as e:
            return f"LLM error: {str(e)}"
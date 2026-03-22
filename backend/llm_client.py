from __future__ import annotations

from typing import Optional
import google.generativeai as genai

from settings import get_settings


class LlmClient:

    def __init__(self) -> None:
        settings = get_settings()

        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY missing")

        # ✅ Correct configuration
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

        # 🔥 REAL MODEL SWITCH
        if model == "gemini":
            model_name = self.gemini_model
        elif model == "fast":
            model_name = "gemini-1.5-flash"
        else:
            model_name = self.gemini_model

        try:
            model_instance = genai.GenerativeModel(model_name)

            response = model_instance.generate_content(
                prompt,
                generation_config={
                    "temperature": float(temperature)
                }
            )

            if response and getattr(response, "text", None):
                return response.text.strip()

            if response and response.text:
                return response.text.strip()

            return "Empty response from model."
            return "Empty response from model."

        except Exception as e:
            return f"LLM error: {str(e)}"
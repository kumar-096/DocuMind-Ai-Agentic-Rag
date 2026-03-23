from __future__ import annotations

from typing import Optional
from google import genai

from settings import get_settings


class LlmClient:

    def __init__(self) -> None:
        settings = get_settings()

        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY missing")

        #    Correct configuration
        genai.configure(api_key=settings.gemini_api_key)

        self.gemini_model = settings.gemini_model
    from google.genai import Client

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
            client = Client(api_key=get_settings().gemini_api_key)

            response = client.models.generate_content(
                model=model or self.gemini_model,
                contents=prompt,
                config={
                    "temperature": float(temperature)
                }
            )

            return response.text.strip() if response and response.text else "Empty response"

        except Exception as e:
            raise RuntimeError(f"LLM FAILURE: {str(e)}")
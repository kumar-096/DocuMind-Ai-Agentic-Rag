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
            client = genai.Client(api_key=get_settings().gemini_api_key)

            response = client.models.generate_content(
                model="gemini-1.5-flash",  
                contents=prompt,
                config={
                    "temperature": float(temperature)
                }
            )

            if response and response.text:
                return response.text.strip()

            return "Empty response from model."

        except Exception as e:
            return f"LLM error: {str(e)}"   